import type { Board } from "./board";

export type Line = { speaker?: string; text: string };
export type Discussion = { id: string; title: string; updatedAt: number; board: Board; lines: Line[]; named?: boolean };
type Store = Pick<Storage, "getItem" | "setItem">;

const KEY = "discussions";
export const MAX = 20;

// localStorage throws in some private windows and during SSR; every access goes through here.
const storage = (): Store | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

const valid = (d: unknown): d is Discussion => {
  const x = d as Discussion;
  return (
    !!x && typeof x.id === "string" && typeof x.title === "string" && typeof x.updatedAt === "number" &&
    !!x.board && Array.isArray(x.board.nodes) && Array.isArray(x.board.edges) && Array.isArray(x.lines)
  );
};

export function list(s: Store | undefined = storage()): Discussion[] {
  try {
    const parsed: unknown = JSON.parse(s?.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(valid).sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

function write(all: Discussion[], s: Store | undefined): Discussion[] {
  const kept = all.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX);
  try {
    s?.setItem(KEY, JSON.stringify(kept));
  } catch {
    // quota exceeded or storage blocked: the board keeps working, it just isn't saved
  }
  return kept;
}

export const autoTitle = (b: Board) => b.nodes.find((n) => n.kind === "idea")?.label ?? "Untitled discussion";

export function save(d: Discussion, s: Store | undefined = storage()): Discussion[] {
  // shortcut: research page snapshots (image data URLs) are dropped to fit the ~5MB quota; move to IndexedDB if they must persist
  const board = { ...d.board, nodes: d.board.nodes.map((n) => ({ ...n, snapshot: undefined })) };
  const all = list(s);
  const prev = all.find((x) => x.id === d.id);
  return write([...all.filter((x) => x.id !== d.id), { ...d, board, title: prev?.named ? prev.title : d.title, named: prev?.named }], s);
}

export function rename(id: string, title: string, s: Store | undefined = storage()): Discussion[] {
  return write(list(s).map((x) => (x.id === id ? (title.trim() ? { ...x, title: title.trim(), named: true } : x) : x)), s);
}

export const remove = (id: string, s: Store | undefined = storage()): Discussion[] => write(list(s).filter((x) => x.id !== id), s);
