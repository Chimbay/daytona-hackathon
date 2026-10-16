import { after } from "next/server";
import { boardEdits } from "@/lib/brain";
import { upstreamError } from "@/lib/errors";
import { recordEdits, validSessionId } from "@/lib/memory";
import { flushTraces } from "@/lib/tracing";
import type { Board } from "@/lib/board";

const isObj = (v: unknown) => !!v && typeof v === "object";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const board = body?.board as Board | undefined;
  const chunk = body?.chunk;
  if (
    !board || !Array.isArray(board.nodes) || !Array.isArray(board.edges) ||
    !board.nodes.every((n) => isObj(n) && typeof n.id === "string") || !board.edges.every(isObj) ||
    typeof chunk?.text !== "string" || chunk.text.length > 4000 ||
    (chunk.speaker !== undefined && typeof chunk.speaker !== "string")
  )
    return Response.json({ error: "expected { board: { nodes, edges }, chunk: { speaker?, text } }" }, { status: 400 });

  after(flushTraces);
  try {
    const result = await boardEdits(board, { speaker: chunk.speaker, text: chunk.text });
    // Memory writes take ~1s; persist after responding so the board isn't held up.
    if (validSessionId(body.sessionId) && result.edits.length)
      after(() => recordEdits(body.sessionId, result.edits, "board-agent").catch((e) => console.error("memory write failed", e)));
    return Response.json(result);
  } catch (err) {
    return upstreamError("board model", err);
  }
}
