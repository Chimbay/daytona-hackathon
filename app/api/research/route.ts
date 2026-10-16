// POST { question } -> { fact, source, snapshot? }  (snapshot: JPEG data URL of the cited page)
// The sandbox returns the wiki pages it read; an LLM here (outside the sandbox) picks the page and
// extracts the fact, falling back to the agent's keyword match if that call fails.
// Each call gets a fresh ephemeral Daytona sandbox. The Anchor API key is mounted as a Daytona
// secret, so the sandbox only ever holds a placeholder; the real key is substituted at egress
// and only for api.anchorbrowser.io. Only the agent's JSON output leaves; the sandbox is deleted.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Daytona } from "@daytona/sdk";
import { after } from "next/server";
import { factEdits } from "@/lib/board";
import { recordEdits, validSessionId } from "@/lib/memory";
import { answer, type Answer } from "@/lib/research";
import { flushTraces, setOutput, withSpan } from "@/lib/tracing";

export const maxDuration = 60;

const SECRET = "anchor-api-key";
// Anchor REST + CDP websocket. The wiki is fetched by Anchor's cloud browser, not the sandbox.
const ALLOWLIST = "api.anchorbrowser.io,connect.anchorbrowser.io";
const agent = readFileSync(join(process.cwd(), "research/agent.mjs"));

let secretReady: Promise<unknown> | undefined;
function ensureSecret(daytona: Daytona) {
  secretReady ??= daytona.secret.list({ limit: 100 }).then(({ items }) =>
    items.some((s) => s.name === SECRET)
      ? null
      : daytona.secret.create({ name: SECRET, value: process.env.ANCHOR_API_KEY!, hosts: ["api.anchorbrowser.io"] }),
  ).catch((e) => ((secretReady = undefined), Promise.reject(e)));
  return secretReady;
}

async function createSandbox(daytona: Daytona) {
  const params = { ephemeral: true, autoStopInterval: 5, secrets: { ANCHOR_API_KEY: SECRET } };
  try {
    return await daytona.create({ ...params, domainAllowList: ALLOWLIST });
  } catch (e) {
    // shortcut: Tier 1/2 Daytona orgs reject per-sandbox allowlists; the org-level egress allowlist
    // applies instead. Drop this fallback once the org is Tier 3+.
    if (!String(e).includes("Network access is restricted")) throw e;
    return daytona.create(params);
  }
}

export async function POST(req: Request) {
  const { question, sessionId, nodeId } = await req.json().catch(() => ({}));
  if (typeof question !== "string" || !question.trim() || question.length > 500) {
    return Response.json({ error: "question must be a non-empty string (max 500 chars)" }, { status: 400 });
  }
  const wiki = process.env.WIKI_URL;
  if (!wiki) return Response.json({ error: "WIKI_URL not set" }, { status: 500 });

  after(flushTraces);
  return withSpan("research", "TOOL", { question }, async (span) => {
    span.setAttributes({
      "tool.name": "research",
      "tool.description": "Look up the internal wiki from a Daytona sandbox via Anchor",
      "tool.parameters": JSON.stringify({ question: "string" }),
    });
    const t0 = Date.now();
    const res = await research(question, wiki, sessionId, nodeId);
    const out = await res.clone().json();
    setOutput(span, out, {
      "research.duration_ms": Date.now() - t0,
      "research.status": res.status,
      "research.fact": out.fact ?? "",
      "research.source": out.source ?? "",
    });
    return res;
  });
}

async function research(question: string, wiki: string, sessionId: unknown, nodeId: unknown) {
  const daytona = new Daytona({ apiKey: process.env.DAYTONA_API_KEY, apiUrl: process.env.DAYTONA_API_URL });
  await ensureSecret(daytona);
  const sandbox = await createSandbox(daytona);
  try {
    await sandbox.fs.uploadFile(agent, "agent.mjs");
    // Inputs go in as env vars, never interpolated into the shell command. Sandbox egress (and the
    // secret substitution) goes through Daytona's HTTPS proxy, which Node only uses with NODE_USE_ENV_PROXY.
    const r = await sandbox.process.executeCommand('NODE_USE_ENV_PROXY=1 node agent.mjs "$QUESTION" "$WIKI_URL"', undefined, { QUESTION: question, WIKI_URL: wiki }, 45);
    if (r.exitCode !== 0) return Response.json({ error: `research agent failed: ${r.result.slice(-300)}` }, { status: 502 });
    const { pages, snapshots, fallback } = JSON.parse(r.result.trim().split("\n").pop()!);
    let out: Answer;
    try {
      out = await answer(question, pages);
    } catch (e) {
      console.error("research LLM failed, using keyword match", e);
      out = fallback;
    }
    if (!out) return Response.json({ error: "no wiki page answers the question" }, { status: 404 });
    if (validSessionId(sessionId) && typeof nodeId === "string")
      after(() => recordEdits(sessionId, factEdits(nodeId, out.fact, out.source), "research-agent").catch((e) => console.error("memory write failed", e)));
    return Response.json({ fact: out.fact, source: out.source, snapshot: snapshots?.[out.source] ?? undefined });
  } finally {
    await sandbox.delete().catch(() => {});
  }
}
