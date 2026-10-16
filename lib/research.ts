// Picks the wiki page that answers a question and extracts a short, board-ready fact from it.
// Runs in the route, outside the research sandbox: only page text comes in, no AWS keys go in.
import { AnthropicBedrock } from "@anthropic-ai/bedrock-sdk";
import { parseJson } from "./errors.ts";

export type Page = { href: string; title: string; text: string };
export type Answer = { fact: string; source: string } | null;

const MODEL = process.env.RESEARCH_MODEL ?? "us.anthropic.claude-haiku-4-5-20251001-v1:0"; // fastest model this account can call
// On failure the route falls back to the agent's keyword match, so fail fast with no retries.
const client = new AnthropicBedrock({ awsRegion: process.env.AWS_REGION ?? "us-west-2", timeout: 10_000, maxRetries: 0 });

const SYSTEM = `You answer a team's question from their internal wiki. You get the question and every wiki page (index, url, title, text).
Pick the single page that best answers the question and return its index and the answer as a short sticky-note fact (hard limit 10 words; only the one or two numbers that answer the question; no breakdowns or lists).
State the figures the page gives; no opinions or conclusions ("likely affordable"), no guessing beyond the page. Questions may be loosely phrased ("how are sales?" means revenue).
If no page answers the question, return page -1 and an empty fact.`;

const SCHEMA = {
  type: "object",
  properties: { page: { type: "integer" }, fact: { type: "string" } },
  required: ["page", "fact"],
  additionalProperties: false,
};

export async function answer(question: string, pages: Page[]): Promise<Answer> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: `Question: ${question}\n\nPages: ${JSON.stringify(pages.map((p, i) => ({ index: i, ...p })))}` }],
  });
  const text = res.content.find((b) => b.type === "text")?.text;
  const raw = parseJson(text);
  if (raw === undefined) throw new Error("research model returned no JSON");
  return pick(raw, pages);
}

// Trust boundary: the source must be a page we actually read, never a model-written URL.
export function pick(raw: unknown, pages: Page[]): Answer {
  const { page, fact } = (raw ?? {}) as { page?: unknown; fact?: unknown };
  const p = typeof page === "number" ? pages[page] : undefined;
  if (!p || typeof fact !== "string" || !fact.trim()) return null;
  return { fact: fact.trim(), source: p.href };
}
