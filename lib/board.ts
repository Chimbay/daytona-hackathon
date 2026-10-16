// Board = the source of truth: a small graph Claude edits via JSON, never pixels.
//
// Versions: superseding an idea keeps the old card in the same stack (`stack` = the first version's id).
// Exactly one version per stack is live; the others are `inactive` and hold their edges in `links`.
// The user can `activate` any version to keep brainstorming on it: the current version's own branch
// (ideas that hang only off it) is parked with it, and the chosen version's branch comes back.
// The conversation doesn't stop for that: edits aimed at a hidden version or its branch keep
// growing that branch out of sight, and `unseen` counts the cards added there since it was hidden.

export type NodeKind = "idea" | "fact" | "question";

export type BoardNode = {
  id: string;
  label: string;
  kind: NodeKind;
  speaker?: string; // provenance for ideas/questions
  quote?: string;
  source?: string; // provenance for researched facts (URL)
  snapshot?: string; // image data URL of the source page, as the research browser saw it
  createdAt: number;
  supersededBy?: string; // first idea that replaced this one; kept for idea history
  stack?: string; // id of the first version of this idea; unset = this node starts its own stack
  inactive?: boolean; // a version that isn't the live one in its stack (drawn behind it)
  inactiveSince?: number; // when it went behind; cards its branch grows after this are "unseen"
  links?: BoardEdge[]; // an inactive version's edges, plus its parked branch's edges
  parkedBy?: string; // hidden because it belongs to this inactive version's branch
};

export type BoardEdge = { from: string; to: string; label?: string };

export type Board = { nodes: BoardNode[]; edges: BoardEdge[] };

type NewNode = Omit<BoardNode, "createdAt" | "supersededBy" | "stack" | "inactive" | "inactiveSince" | "links" | "parkedBy">;

export type Edit =
  | { op: "add"; node: NewNode }
  | { op: "update"; id: string; label: string }
  | { op: "supersede"; id: string; node: NewNode }
  | { op: "remove"; id: string }
  | { op: "link"; from: string; to: string; label?: string };

export const emptyBoard: Board = { nodes: [], edges: [] };

const isVisible = (n: BoardNode) => !n.inactive && !n.parkedBy;
export const visibleNodes = (b: Board) => b.nodes.filter(isVisible);
export const stackOf = (n: BoardNode) => n.stack ?? n.id;

// Edits come from an LLM: anything referencing unknown or stale ids is skipped, not thrown.
export function applyEdits(board: Board, edits: Edit[], now = Date.now()): Board {
  let { nodes, edges } = board;
  const find = (id: string) => nodes.find((n) => n.id === id);
  const live = (id: string) => { const n = find(id); return !!n && isVisible(n); };
  // Hidden versions and their parked branches still take edits; those land in the version's `links`.
  const ownerOf = (id: string) => { const n = find(id); return n?.parkedBy ?? (n?.inactive ? n.id : undefined); };
  const setNode = (id: string, f: (n: BoardNode) => BoardNode) => { nodes = nodes.map((n) => (n.id === id ? f(n) : n)); };
  const added = new Set<string>();

  for (const e of edits) {
    switch (e.op) {
      case "add":
        if (find(e.node.id)) break;
        nodes = [...nodes, { ...e.node, createdAt: now }];
        added.add(e.node.id);
        break;
      case "update":
        if (!find(e.id)) break;
        setNode(e.id, (n) => ({ ...n, label: e.label }));
        break;
      case "supersede": {
        const old = find(e.id);
        if (!old || find(e.node.id) || (old.inactive && old.parkedBy)) break;
        // The new idea inherits the old one's place in the graph, wherever that graph lives.
        const swap = (x: BoardEdge) => ({ ...x, from: x.from === e.id ? e.node.id : x.from, to: x.to === e.id ? e.node.id : x.to });
        const touches = (x: BoardEdge) => x.from === e.id || x.to === e.id;
        const next = { ...e.node, createdAt: now, stack: stackOf(old) };
        const retire = (links: BoardEdge[]) => setNode(old.id, (n) => ({ ...n, supersededBy: n.supersededBy ?? e.node.id, inactive: true, links: links.filter(touches) }));
        if (isVisible(old)) {
          retire(edges);
          setNode(old.id, (n) => ({ ...n, inactiveSince: now }));
          nodes = [...nodes, next];
          edges = edges.map(swap);
        } else if (old.parkedBy) {
          // Inside a hidden branch: the replacement stays hidden in the same branch.
          const o = old.parkedBy;
          retire(find(o)?.links ?? []);
          nodes = [...nodes, { ...next, parkedBy: o }];
          setNode(o, (n) => ({ ...n, links: (n.links ?? []).map(swap) }));
        } else {
          // A hidden version itself: the replacement takes over its hidden branch.
          const links = old.links ?? [];
          retire(links);
          nodes = [
            ...nodes.map((n) => (n.parkedBy === old.id ? { ...n, parkedBy: e.node.id } : n)),
            { ...next, inactive: true, inactiveSince: old.inactiveSince, links: links.map(swap) },
          ];
        }
        break;
      }
      case "remove": {
        const touches = (x: BoardEdge) => x.from === e.id || x.to === e.id;
        nodes = nodes.filter((n) => n.id !== e.id).map((n) => (n.links?.some(touches) ? { ...n, links: n.links.filter((x) => !touches(x)) } : n));
        edges = edges.filter((x) => !touches(x));
        break;
      }
      case "link": {
        if (e.from === e.to || !find(e.from) || !find(e.to)) break;
        const edge = { from: e.from, to: e.to, label: e.label };
        const same = (x: BoardEdge) => x.from === e.from && x.to === e.to;
        const o = ownerOf(e.from) ?? ownerOf(e.to);
        if (!o) {
          if (!edges.some(same)) edges = [...edges, edge];
          break;
        }
        setNode(o, (n) => (n.links?.some(same) ? n : { ...n, links: [...(n.links ?? []), edge] }));
        // A card just added under a hidden card grows that hidden branch instead of floating loose.
        if (ownerOf(e.from) === o && added.has(e.to) && live(e.to) && !edges.some((x) => x.to === e.to))
          setNode(e.to, (n) => ({ ...n, parkedBy: o }));
        break;
      }
    }
  }
  return { nodes, edges };
}

// Cards a hidden version's branch has grown since it went behind (the conversation kept going there).
export function unseen(board: Board, version: BoardNode): number {
  const since = version.inactive ? version.inactiveSince : undefined;
  if (since === undefined) return 0;
  return board.nodes.filter((n) => n.parkedBy === version.id && !n.inactive && n.createdAt > since).length;
}

const edgeKey = (e: BoardEdge) => `${e.from}->${e.to}`;

// Ideas that hang only off `root`: every parent they have is `root` or already in the branch.
function branchOf(nodes: BoardNode[], edges: BoardEdge[], root: string): Set<string> {
  const branch = new Set<string>();
  const inside = (id: string) => id === root || branch.has(id);
  for (let grew = true; grew; ) {
    grew = false;
    for (const n of nodes) {
      if (n.id === root || branch.has(n.id) || !isVisible(n)) continue;
      const parents = edges.filter((e) => e.to === n.id);
      if (parents.length && parents.every((e) => inside(e.from))) {
        branch.add(n.id);
        grew = true;
      }
    }
  }
  return branch;
}

// User action (not an LLM edit): make `id` the live version of its stack so new ideas build on it.
// Only the switched stack and the branches hanging off it change; the rest of the board is untouched.
export function activate(board: Board, id: string, now = Date.now()): Board {
  const target = board.nodes.find((n) => n.id === id);
  if (!target?.inactive) return board;
  const current = board.nodes.find((n) => isVisible(n) && stackOf(n) === stackOf(target));

  let nodes = board.nodes;
  let edges = board.edges;
  let currentLinks: BoardEdge[] = [];

  // 1. Park the current version together with its own branch.
  if (current) {
    const branch = branchOf(nodes, edges, current.id);
    const touches = (e: BoardEdge) => e.from === current.id || e.to === current.id || branch.has(e.from) || branch.has(e.to);
    currentLinks = edges.filter(touches);
    edges = edges.filter((e) => !touches(e));
    nodes = nodes.map((n) => (branch.has(n.id) ? { ...n, parkedBy: current.id } : n));
  }

  // 2. Bring back the target's branch. Ideas it shared with the current version (inherited at
  //    supersede time) come back with it, along with everything hanging off them.
  const back = new Set(nodes.filter((n) => n.parkedBy === target.id).map((n) => n.id));
  if (current) {
    const shared = (x: string) => nodes.some((n) => n.id === x && n.parkedBy === current.id);
    const queue = (target.links ?? []).flatMap((e) => [e.from, e.to]).filter(shared);
    while (queue.length) {
      const x = queue.pop()!;
      if (back.has(x)) continue;
      back.add(x);
      for (const e of currentLinks) if (e.from === x && shared(e.to)) queue.push(e.to);
    }
  }
  nodes = nodes.map((n) => {
    if (n.id === target.id) return { ...n, inactive: undefined, inactiveSince: undefined, links: undefined };
    if (current && n.id === current.id) return { ...n, inactive: true, inactiveSince: now, links: currentLinks };
    if (back.has(n.id)) return { ...n, parkedBy: undefined };
    return n;
  });

  // 3. Restore edges whose ends are on the board again. Links to an idea that has since been
  //    superseded attach to that idea's live version.
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const liveIn = new Map(nodes.filter(isVisible).map((n) => [stackOf(n), n.id]));
  const resolve = (x: string) => {
    const n = byId.get(x);
    if (!n || n.parkedBy) return undefined;
    return n.inactive ? liveIn.get(stackOf(n)) : n.id;
  };
  const restored = new Map(edges.map((e) => [edgeKey(e), e]));
  const moved = new Set<string>();
  for (const l of [...(target.links ?? []), ...currentLinks]) {
    const from = resolve(l.from), to = resolve(l.to);
    if (!from || !to || from === to) continue;
    // The current version's edges only come back where they connect ideas that came back.
    if (!(target.links ?? []).includes(l)) {
      if (!back.has(l.from) || !back.has(l.to)) continue;
      moved.add(edgeKey(l));
    }
    restored.set(`${from}->${to}`, { ...l, from, to });
  }
  if (current && moved.size)
    nodes = nodes.map((n) => (n.id === current.id ? { ...n, links: currentLinks.filter((e) => !moved.has(edgeKey(e))) } : n));

  return { nodes, edges: [...restored.values()] };
}

// Ideas that didn't match anything when they were said: visible, no links yet, and not the topic
// (the first card on the board, which starts unlinked by definition). They float around the tree
// until a later chunk links them in.
export function looseIds(board: Board): Set<string> {
  const live = visibleNodes(board);
  const topic = live.reduce<BoardNode | undefined>((a, n) => (!a || n.createdAt < a.createdAt ? n : a), undefined);
  const linked = new Set(board.edges.flatMap((e) => [e.from, e.to]));
  return new Set(live.filter((n) => n !== topic && !linked.has(n.id)).map((n) => n.id));
}

// Each live card with the other versions in its stack, newest first: stack[0] is the live one.
export function stacks(board: Board): BoardNode[][] {
  const versions = new Map<string, BoardNode[]>();
  for (const n of board.nodes) if (!n.parkedBy) versions.set(stackOf(n), [...(versions.get(stackOf(n)) ?? []), n]);
  return visibleNodes(board).map((head) => [
    head,
    ...(versions.get(stackOf(head)) ?? []).filter((n) => n !== head).sort((a, b) => b.createdAt - a.createdAt),
  ]);
}

// A researched answer pinned to the question node it answers; shared by the page and memory.
export const factEdits = (nodeId: string, fact: string, source: string, snapshot?: string): Edit[] => [
  { op: "add", node: { id: `fact-${nodeId}`, label: fact, kind: "fact", source, ...(snapshot && { snapshot }) } },
  { op: "link", from: nodeId, to: `fact-${nodeId}` },
];

// Labels this node replaced, newest first: the trail shown as "was: …" on the board.
export function replaced(board: Board, id: string): string[] {
  const prev = board.nodes.find((n) => n.supersededBy === id);
  return prev ? [prev.label, ...replaced(board, prev.id)] : [];
}
