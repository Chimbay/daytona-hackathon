// Board = the source of truth: a small graph Claude edits via JSON, never pixels.

export type NodeKind = "idea" | "fact" | "question";

export type BoardNode = {
  id: string;
  label: string;
  kind: NodeKind;
  speaker?: string; // provenance for ideas/questions
  quote?: string;
  source?: string; // provenance for researched facts (URL)
  createdAt: number;
  supersededBy?: string; // kept for idea history; hidden from the board
};

export type BoardEdge = { from: string; to: string; label?: string };

export type Board = { nodes: BoardNode[]; edges: BoardEdge[] };

type NewNode = Omit<BoardNode, "createdAt" | "supersededBy">;

export type Edit =
  | { op: "add"; node: NewNode }
  | { op: "update"; id: string; label: string }
  | { op: "supersede"; id: string; node: NewNode }
  | { op: "remove"; id: string }
  | { op: "link"; from: string; to: string; label?: string };

export const emptyBoard: Board = { nodes: [], edges: [] };

export const visibleNodes = (b: Board) => b.nodes.filter((n) => !n.supersededBy);

// Edits come from an LLM: anything referencing unknown or stale ids is skipped, not thrown.
export function applyEdits(board: Board, edits: Edit[], now = Date.now()): Board {
  let { nodes, edges } = board;
  const live = (id: string) => nodes.some((n) => n.id === id && !n.supersededBy);

  for (const e of edits) {
    switch (e.op) {
      case "add":
        if (nodes.some((n) => n.id === e.node.id)) break;
        nodes = [...nodes, { ...e.node, createdAt: now }];
        break;
      case "update":
        if (!live(e.id)) break;
        nodes = nodes.map((n) => (n.id === e.id ? { ...n, label: e.label } : n));
        break;
      case "supersede":
        if (!live(e.id) || nodes.some((n) => n.id === e.node.id)) break;
        nodes = [
          ...nodes.map((n) => (n.id === e.id ? { ...n, supersededBy: e.node.id } : n)),
          { ...e.node, createdAt: now },
        ];
        // The new idea inherits the old one's place in the graph.
        edges = edges.map((x) => ({
          ...x,
          from: x.from === e.id ? e.node.id : x.from,
          to: x.to === e.id ? e.node.id : x.to,
        }));
        break;
      case "remove":
        nodes = nodes.filter((n) => n.id !== e.id);
        edges = edges.filter((x) => x.from !== e.id && x.to !== e.id);
        break;
      case "link":
        if (e.from === e.to || !live(e.from) || !live(e.to)) break;
        if (edges.some((x) => x.from === e.from && x.to === e.to)) break;
        edges = [...edges, { from: e.from, to: e.to, label: e.label }];
        break;
    }
  }
  return { nodes, edges };
}

// A researched answer pinned to the question node it answers; shared by the page and memory.
export const factEdits = (nodeId: string, fact: string, source: string): Edit[] => [
  { op: "add", node: { id: `fact-${nodeId}`, label: fact, kind: "fact", source } },
  { op: "link", from: nodeId, to: `fact-${nodeId}` },
];

// Labels this node replaced, newest first: the trail shown as "was: …" on the board.
export function replaced(board: Board, id: string): string[] {
  const prev = board.nodes.find((n) => n.supersededBy === id);
  return prev ? [prev.label, ...replaced(board, prev.id)] : [];
}
