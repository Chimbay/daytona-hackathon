import { Graph, layout as dagreLayout } from "@dagrejs/dagre";
import { replaced, visibleNodes, type Board, type BoardNode } from "./board";

export const NODE_W = 220;

export type Placed = BoardNode & { x: number; y: number; h: number; was: string[]; pending: boolean };
export type PlacedEdge = { key: string; d: string; label?: string; mx: number; my: number };

// shortcut: height guessed from label length, not measured; measure DOM if labels overflow.
const nodeHeight = (n: BoardNode, extraLines: number) =>
  56 + Math.ceil(n.label.length / 26) * 20 + (n.source ? 20 : 0) + (n.quote && n.kind !== "fact" ? 36 : 0) + extraLines * 18; // quote: 2 clamped lines

const MAX_WAS = 2; // older history stays in memory, not on the card

export function layoutBoard(board: Board, pending: ReadonlySet<string> = new Set()) {
  const g = new Graph();
  g.setGraph({ rankdir: "LR", nodesep: 28, ranksep: 90, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  const nodes = visibleNodes(board).map((n) => ({ ...n, was: replaced(board, n.id).slice(0, MAX_WAS), pending: pending.has(n.id) }));
  for (const n of nodes) g.setNode(n.id, { width: NODE_W, height: nodeHeight(n, n.was.length + (n.pending ? 1 : 0)) });
  for (const e of board.edges) if (g.hasNode(e.from) && g.hasNode(e.to)) g.setEdge(e.from, e.to);
  dagreLayout(g);

  // dagre gives centers; the renderer positions by top-left.
  const placed: Placed[] = nodes.map((n) => {
    const p = g.node(n.id);
    return { ...n, x: p.x - p.width / 2, y: p.y - p.height / 2, h: p.height };
  });
  const byId = new Map(placed.map((p) => [p.id, p]));

  // Always a 4-point cubic so Motion can interpolate `d` between layouts.
  const edges: PlacedEdge[] = board.edges.flatMap((e) => {
    const a = byId.get(e.from), b = byId.get(e.to);
    if (!a || !b) return [];
    const x1 = a.x + NODE_W, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2;
    const mx = (x1 + x2) / 2;
    return [{ key: `${e.from}->${e.to}`, label: e.label, mx, my: (y1 + y2) / 2, d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}` }];
  });

  // dagre reports ±Infinity for an empty graph.
  const { width = 0, height = 0 } = placed.length ? g.graph() : {};
  return { nodes: placed, edges, width, height };
}
