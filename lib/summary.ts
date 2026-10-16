import { replaced, visibleNodes, type Board, type BoardNode } from "./board.ts";

export type Line = { speaker?: string; text: string };

// Markdown of the current discussion: live ideas as a tree following edges, each idea's "was:" trail,
// facts with sources, then the transcript.
export function summarize(board: Board, lines: Line[]): string {
  const live = visibleNodes(board).sort((a, b) => a.createdAt - b.createdAt);
  const ids = new Set(live.map((n) => n.id));
  const edges = board.edges.filter((e) => ids.has(e.from) && ids.has(e.to));
  const seen = new Set<string>();
  const out = [`# ${live.find((n) => n.kind === "idea")?.label ?? live[0]?.label ?? "Brainstorm"}`, "", "## Ideas"];

  const item = (n: BoardNode, depth: number) => {
    if (seen.has(n.id)) return;
    seen.add(n.id);
    const was = replaced(board, n.id);
    let text = n.kind === "fact" ? `Fact: ${n.label}` : n.kind === "question" ? `Q: ${n.label}` : n.label;
    if (n.speaker) text += ` (${n.speaker})`;
    if (n.source) text += ` [source](${n.source})`;
    if (was.length) text += ` (was: ${was.join(" ← ")})`;
    out.push(`${"  ".repeat(depth)}- ${text}`);
    for (const e of edges) if (e.from === n.id) item(live.find((c) => c.id === e.to)!, depth + 1);
  };
  const targets = new Set(edges.map((e) => e.to));
  for (const n of live) if (!targets.has(n.id)) item(n, 0);
  for (const n of live) item(n, 0); // cycles: anything not reached from a root
  if (!live.length) out.push("- (none yet)");

  const facts = live.filter((n) => n.kind === "fact");
  if (facts.length) out.push("", "## Facts", ...facts.map((f) => `- ${f.label}${f.source ? ` — ${f.source}` : ""}`));
  out.push("", "## Transcript", ...lines.map((l) => `- ${l.speaker ? `**${l.speaker}:** ` : ""}${l.text}`));
  return out.join("\n") + "\n";
}
