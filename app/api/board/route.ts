import { boardEdits } from "@/lib/brain";
import type { Board } from "@/lib/board";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const board = body?.board as Board | undefined;
  const chunk = body?.chunk;
  if (!board || !Array.isArray(board.nodes) || !Array.isArray(board.edges) || typeof chunk?.text !== "string")
    return Response.json({ error: "expected { board: { nodes, edges }, chunk: { speaker?, text } }" }, { status: 400 });

  try {
    return Response.json(await boardEdits(board, { speaker: chunk.speaker, text: chunk.text }));
  } catch (err) {
    console.error("board brain failed", err);
    return Response.json({ error: "model call failed" }, { status: 502 });
  }
}
