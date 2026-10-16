import type { Edit } from "@/lib/board";
import { recordEdits, validSessionId, type Agent } from "@/lib/memory";

const ops = new Set(["add", "update", "supersede", "remove", "link"]);
const agents = new Set<Agent>(["board-agent", "research-agent"]);

// POST { sessionId, edits, by } → persists board edits to Agent Memory.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { sessionId, edits, by } = body ?? {};
  if (!validSessionId(sessionId) || !agents.has(by) || !Array.isArray(edits) || !edits.every((e) => ops.has(e?.op))) {
    return Response.json({ error: "expected { sessionId: [a-z0-9-]+, edits: Edit[], by: 'board-agent' | 'research-agent' }" }, { status: 400 });
  }
  try {
    return Response.json(await recordEdits(sessionId, edits as Edit[], by));
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
