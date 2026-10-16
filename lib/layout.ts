import { Graph, layout as dagreLayout } from "@dagrejs/dagre";
import { looseIds, stacks, unseen, type Board, type BoardNode } from "./board";

export const NODE_W = 220;
export const SNAP_H = 110;
export const PEEK = 26; // how much of each card behind the front one shows above it
const INSET = 8; // each card further back is this much narrower per side, like a deck
const MAX_BEHIND = 3; // older history stays in memory, not on the board
const GAP = 24; // between floating cards, and between them and the tree
const MARGIN = 24;

// One rendered card. Every version of an idea gets one, so swapping front/back animates.
export type Placed = BoardNode & {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  ox: number; // where it grows out of when it appears / folds back into when it goes:
  oy: number; //   its parent card's spot, so branches sprout from the card they hang off
  front: boolean;
  deprecated: boolean; // a replaced version peeking from behind

  pending: boolean;
  unseen: number; // cards the hidden branch(es) grew while out of view
  loose: boolean; // didn't match any idea yet: floats around the tree until it's linked
};
export type PlacedEdge = { key: string; d: string; d0: string; label?: string; mx: number; my: number };

// shortcut: height guessed from label length, not measured; measure DOM if labels overflow.
const nodeHeight = (n: BoardNode, extraLines: number) =>
  56 + Math.ceil(n.label.length / 26) * 20 + (n.source ? 20 : 0) + (n.snapshot ? SNAP_H + 8 : 0) + (n.quote && n.kind !== "fact" ? 36 : 0) + extraLines * 18; // quote: 2 clamped lines

export function layoutBoard(board: Board, pending: ReadonlySet<string> = new Set()) {
  const g = new Graph();
  g.setGraph({ rankdir: "LR", nodesep: 28, ranksep: 90, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  const floating = looseIds(board);
  const cards = stacks(board).map(([f, ...rest]) => {
    const behind = rest.slice(0, MAX_BEHIND);
    const isPending = pending.has(f.id);
    const hidden = rest.reduce((sum, v) => sum + unseen(board, v), 0);
    const loose = floating.has(f.id);
    const extra = (isPending ? 1 : 0) + (hidden ? 1 : 0) + (loose ? 1 : 0);
    const h = nodeHeight(f, extra);
    return { id: f.id, front: f, behind, pending: isPending, unseen: hidden, loose, h, boxH: h + behind.length * PEEK };
  });
  const tree = cards.filter((c) => !c.loose);
  for (const c of tree) g.setNode(c.id, { width: NODE_W, height: c.boxH });
  for (const e of board.edges) if (g.hasNode(e.from) && g.hasNode(e.to)) g.setEdge(e.from, e.to);
  dagreLayout(g);

  // Top-left of each stack's box. dagre gives centers.
  const boxes = new Map<string, { x: number; y: number }>();
  for (const c of tree) {
    const p = g.node(c.id);
    boxes.set(c.id, { x: p.x - p.width / 2, y: p.y - p.height / 2 });
  }

  // Loose ideas ring the tree in rows, alternating below and above it (oldest closest), so they read
  // as "in the room, not yet on the map". Linking one moves its card from here into the tree.
  const { width: tw = 0, height: th = 0 } = tree.length ? g.graph() : {};
  const perRow = Math.max(2, Math.floor((tw - 2 * MARGIN + GAP) / (NODE_W + GAP)));
  let below = th - MARGIN + GAP, above = MARGIN - GAP;
  const loose = cards.filter((c) => c.loose);
  for (let r = 0; r * perRow < loose.length; r++) {
    const row = loose.slice(r * perRow, (r + 1) * perRow);
    const rowH = Math.max(...row.map((c) => c.boxH));
    const y = r % 2 === 0 ? below : above - rowH;
    if (r % 2 === 0) below += rowH + GAP; else above -= rowH + GAP;
    const start = (tw - (row.length * NODE_W + (row.length - 1) * GAP)) / 2;
    // Slight vertical jitter so the row looks scattered rather than docked.
    row.forEach((c, i) => boxes.set(c.id, { x: start + i * (NODE_W + GAP), y: y + (r % 2 === 0 ? 1 : -1) * (i % 2) * 10 }));
  }

  // Re-origin so everything (tree + floating rows) sits inside the frame with a margin.
  const all = cards.map((c) => ({ ...boxes.get(c.id)!, h: c.boxH }));
  const minX = Math.min(0, ...all.map((b) => b.x - MARGIN)), minY = Math.min(0, ...all.map((b) => b.y - MARGIN));
  const maxX = Math.max(tw, ...all.map((b) => b.x + NODE_W + MARGIN)), maxY = Math.max(th, ...all.map((b) => b.y + b.h + MARGIN));

  // Peeking cards sit above the front one.
  const anchors = new Map<string, { x: number; y: number; h: number }>();
  for (const c of cards) {
    const b = boxes.get(c.id)!;
    anchors.set(c.id, { x: b.x - minX, y: b.y - minY + c.behind.length * PEEK, h: c.h });
  }
  const parentOf = new Map(board.edges.filter((e) => anchors.has(e.from)).map((e) => [e.to, anchors.get(e.from)!]));

  const placed: Placed[] = cards.flatMap((c) => {
    const { x, y } = anchors.get(c.id)!;
    const o = parentOf.get(c.id) ?? { x, y };
    return [
      { ...c.front, h: c.h, x, y, w: NODE_W, z: MAX_BEHIND + 1, ox: o.x, oy: o.y, front: true, deprecated: false, pending: c.pending, unseen: c.unseen, loose: c.loose },
      ...c.behind.map((n, i) => ({
        ...n,
        h: c.h,
        x: x + INSET * (i + 1),
        y: y - PEEK * (i + 1),
        w: NODE_W - 2 * INSET * (i + 1),
        z: MAX_BEHIND - i,
        ox: x,
        oy: y,
        front: false,
        deprecated: !!n.supersededBy,

        pending: false,
        unseen: unseen(board, n),
        loose: false,
      })),
    ];
  });

  // Always a 4-point cubic so Motion can interpolate `d` between layouts; d0 is the same curve
  // collapsed onto its start, so a new edge draws itself out of the parent card.
  const edges: PlacedEdge[] = board.edges.flatMap((e) => {
    const a = anchors.get(e.from), b = anchors.get(e.to);
    if (!a || !b) return [];
    const x1 = a.x + NODE_W, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2;
    const mx = (x1 + x2) / 2;
    return [{
      key: `${e.from}->${e.to}`,
      label: e.label,
      mx,
      my: (y1 + y2) / 2,
      d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`,
      d0: `M${x1},${y1} C${x1},${y1} ${x1},${y1} ${x1},${y1}`,
    }];
  });

  const width = cards.length ? maxX - minX : 0, height = cards.length ? maxY - minY : 0;
  return { nodes: placed, edges, width, height };
}
