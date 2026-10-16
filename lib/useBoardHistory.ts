"use client";

import { useCallback, useState } from "react";
import type { Board, Edit } from "./board.ts";

export type Snapshot = { board: Board; at: number; label: string };

const MAX = 100;

// One short line per edit batch, e.g. "+ Self-serve onboarding" or "Hire sales reps → Self-serve onboarding".
export function describe(before: Board, edits: Edit[]): string {
  const name = (id: string) => before.nodes.find((n) => n.id === id)?.label ?? id;
  const parts = edits.flatMap((e) => {
    switch (e.op) {
      case "add": return [`${e.node.kind === "fact" ? "📌" : "+"} ${e.node.label}`];
      case "supersede": return [`${name(e.id)} → ${e.node.label}`];
      case "update": return [`✎ ${e.label}`];
      case "remove": return [`− ${name(e.id)}`];
      default: return [];
    }
  });
  if (!parts.length) return edits.length ? "Linked ideas" : "No change";
  return parts.length > 1 ? `${parts[0]} (+${parts.length - 1} more)` : parts[0];
}

// Every applied edit batch becomes a snapshot; `index` is the one being replayed (null = live board).
export function useBoardHistory() {
  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  const [index, setIndex] = useState<number | null>(null);

  const record = useCallback((before: Board, after: Board, edits: Edit[]) => {
    // shortcut: once the cap drops old snapshots, an open replay index shifts by one step; fine for a demo.
    setSnaps((s) => [...s, { board: after, at: Date.now(), label: describe(before, edits) }].slice(-MAX));
  }, []);
  const clear = useCallback(() => { setSnaps([]); setIndex(null); }, []);

  return { snaps, index, setIndex, record, clear, shown: index === null ? null : snaps[index]?.board ?? null };
}
