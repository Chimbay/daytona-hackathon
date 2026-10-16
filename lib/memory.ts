// Board memory in SurrealDB Agent Memory (env vars keep the old SPECTRON_* names).
// Each board node is a `concept` entity named `<sessionId>:<nodeId>`; its fields are attributes,
// so a label `update` becomes a native supersession (old value closed with validUntil).
// An idea `supersede` is an explicit `superseded_by` relation old → new with validFrom = time of the edit.
// Both agents write to the same context, tagged with `added_by`, so memory is shared.
import type { BoardNode, Edit } from "./board";

export type Agent = "board-agent" | "research-agent";

export type IdeaVersion = {
  id: string;
  label: string;
  kind?: string;
  speaker?: string;
  quote?: string;
  source?: string;
  addedBy?: string;
  status?: string;
  createdAt: string;
  labelHistory: { value: string; at: string }[]; // oldest first
  supersededBy?: { id: string; at: string };
};

export type History = { sessionId: string; chains: IdeaVersion[][] }; // each chain oldest → newest

export const validSessionId = (s: unknown): s is string => typeof s === "string" && /^[a-z0-9-]{1,64}$/i.test(s);

type Triple = { entity: Ent; key: string; value?: string; target?: Ent; valid_from?: string };
type Ent = { type: "concept"; name: string };

const ent = (sessionId: string, id: string): Ent => ({ type: "concept", name: `${sessionId}:${id}` });

// Pure: board edits → Agent Memory triples.
export function toTriples(sessionId: string, edits: Edit[], by: Agent, at: string): Triple[] {
  const t: Triple[] = [];
  const attrs = (n: Omit<BoardNode, "createdAt" | "supersededBy">) => {
    const e = ent(sessionId, n.id);
    t.push({ entity: e, key: "label", value: n.label }, { entity: e, key: "kind", value: n.kind });
    for (const k of ["speaker", "quote", "source"] as const) if (n[k]) t.push({ entity: e, key: k, value: n[k] });
    t.push({ entity: e, key: "added_by", value: by }, { entity: e, key: "status", value: "live" });
  };
  for (const e of edits) {
    switch (e.op) {
      case "add":
        attrs(e.node);
        break;
      case "update":
        t.push({ entity: ent(sessionId, e.id), key: "label", value: e.label });
        break;
      case "supersede":
        attrs(e.node);
        t.push(
          { entity: ent(sessionId, e.id), key: "status", value: "superseded" },
          { entity: ent(sessionId, e.id), key: "superseded_by", target: ent(sessionId, e.node.id), valid_from: at },
        );
        break;
      case "remove":
        t.push({ entity: ent(sessionId, e.id), key: "status", value: "removed" });
        break;
      case "link":
        // shortcut: edge labels aren't stored, only the link; add a label attribute on a link entity if replay needs them
        t.push({ entity: ent(sessionId, e.from), key: "links_to", target: ent(sessionId, e.to) });
        break;
    }
  }
  return t;
}

// Pure: ideas + supersede relations → chains, oldest first.
export function buildChains(ideas: IdeaVersion[], supersedes: { from: string; to: string; at: string }[]): IdeaVersion[][] {
  const byId = new Map(ideas.map((i) => [i.id, i]));
  const next = new Map(supersedes.map((s) => [s.from, s]));
  const hasPrev = new Set(supersedes.map((s) => s.to));
  for (const s of supersedes) {
    const old = byId.get(s.from);
    if (old) old.supersededBy = { id: s.to, at: s.at };
  }
  const chains: IdeaVersion[][] = [];
  for (const head of ideas.filter((i) => !hasPrev.has(i.id))) {
    const chain = [head];
    for (let s = next.get(head.id); s && byId.has(s.to) && chain.length <= ideas.length; s = next.get(s.to)) chain.push(byId.get(s.to)!);
    chains.push(chain);
  }
  return chains.sort((a, b) => a[0].createdAt.localeCompare(b[0].createdAt));
}

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { SPECTRON_URL, SPECTRON_ID, SPECTRON_API_KEY } = process.env;
  if (!SPECTRON_URL || !SPECTRON_ID || !SPECTRON_API_KEY) throw new Error("SPECTRON_URL, SPECTRON_ID, SPECTRON_API_KEY must be set");
  const r = await fetch(`${SPECTRON_URL}/api/v1/${SPECTRON_ID}${path}`, {
    method,
    headers: { Authorization: `Bearer ${SPECTRON_API_KEY}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!r.ok && !(method === "POST" && path === "/scopes" && r.status === 409)) {
    throw new Error(`Agent Memory ${method} ${path.split("?")[0]} → ${r.status}: ${(await r.text()).slice(0, 300)}`);
  }
  return r.json().catch(() => ({}) as T);
}

async function listAll<T>(path: string, field: string): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | undefined;
  do {
    const sep = path.includes("?") ? "&" : "?";
    const page = await api<Record<string, unknown> & { page?: { nextCursor?: string } }>(
      "GET", `${path}${sep}limit=500${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    out.push(...((page[field] as T[]) ?? []));
    cursor = page.page?.nextCursor;
  } while (cursor);
  return out;
}

const scopes = new Set<string>();
async function ensureScope(path: string) {
  if (scopes.has(path)) return;
  await api("POST", "/scopes", { path: "brainstorm" });
  await api("POST", "/scopes", { path });
  scopes.add(path);
}

export async function recordEdits(sessionId: string, edits: Edit[], by: Agent, now = Date.now()) {
  if (!validSessionId(sessionId)) throw new Error("invalid sessionId");
  const at = new Date(now).toISOString();
  const triples = toTriples(sessionId, edits, by, at);
  if (!triples.length) return { written: 0 };
  const scope = `brainstorm/${sessionId}`;
  await ensureScope(scope);
  await api("POST", "/facts", { infer: "triples", scopes: [[scope]], observed_at: at, triples });
  return { written: triples.length };
}

type Attr = { key: string; value: unknown; createdAt: string; supersededBy: string | null };
type Rel = { subject: string; object: string; label: string; validFrom: string | null; createdAt: string; source: { kind: string } };

export async function loadHistory(sessionId: string): Promise<History> {
  if (!validSessionId(sessionId)) throw new Error("invalid sessionId");
  const prefix = `${sessionId}:`;
  // shortcut: entity/relation listings ignore scope filters, so we list all and filter by name prefix; fine for a demo-sized context
  const [entities, relations] = await Promise.all([
    listAll<{ name: string }>("/entities?type=concept", "entities"),
    listAll<Rel>("/relations", "relations"),
  ]);
  const ideas = await Promise.all(
    entities.filter((e) => e.name.startsWith(prefix)).map(async (e): Promise<IdeaVersion> => {
      const hist = await listAll<Attr>(`/entities/concept/${encodeURIComponent(e.name)}/history`, "history");
      hist.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const cur = (k: string) => {
        const v = hist.filter((h) => h.key === k && !h.supersededBy).at(-1)?.value;
        return v == null ? undefined : String(v);
      };
      const labels = hist.filter((h) => h.key === "label").map((h) => ({ value: String(h.value), at: h.createdAt }));
      return {
        id: e.name.slice(prefix.length),
        label: cur("label") ?? "",
        kind: cur("kind"),
        speaker: cur("speaker"),
        quote: cur("quote"),
        source: cur("source"),
        addedBy: cur("added_by"),
        status: cur("status"),
        createdAt: hist[0]?.createdAt ?? "",
        labelHistory: labels,
      };
    }),
  );
  const strip = (ref: string) => ref.replace(/^entity:concept\//, "");
  const supersedes = relations
    // elaboration adds low-trust inferred edges; only our own writes count
    .filter((r) => r.label === "superseded_by" && r.source?.kind === "upsert" && strip(r.subject).startsWith(prefix))
    .map((r) => ({ from: strip(r.subject).slice(prefix.length), to: strip(r.object).slice(prefix.length), at: r.validFrom ?? r.createdAt }));
  return { sessionId, chains: buildChains(ideas.filter((i) => i.label), supersedes) };
}
