import type { Edit } from "@/lib/board";
import { validate } from "@/lib/brain";
import { upstreamError } from "@/lib/errors";
import { recordEdits, validSessionId, type Agent } from "@/lib/memory";

const agents = new Set<Agent>(["board-agent", "research-agent"]);

// POST { sessionId, edits, by } → persists board edits to Agent Memory.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { sessionId, edits, by } = body ?? {};
  // validate() drops malformed edits, so any drop means a bad request. Persist the originals:
  // validate() also strips fact `source`, which memory needs.
  if (!validSessionId(sessionId) || !agents.has(by) || !Array.isArray(edits) || validate({ edits }).edits.length !== edits.length) {
    return Response.json({ error: "expected { sessionId: [a-z0-9-]+, edits: Edit[], by: 'board-agent' | 'research-agent' }" }, { status: 400 });
  }
  try {
    return Response.json(await recordEdits(sessionId, edits as Edit[], by));
  } catch (e) {
    return upstreamError("Agent Memory", e);
  }
}
