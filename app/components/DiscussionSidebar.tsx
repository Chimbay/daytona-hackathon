"use client";

import { useEffect, useState } from "react";
import { visibleNodes } from "@/lib/board";
import type { Discussion } from "@/lib/discussions";

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

type Props = {
  items: Discussion[];
  currentId: string;
  onNew: () => void;
  onOpen: (d: Discussion) => void;
  onRename: (id: string, title: string) => void;
  onRemove: (id: string) => void;
};

export default function DiscussionSidebar({ items, currentId, onNew, onOpen, onRename, onRemove }: Props) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  // Collapsed by default on narrow screens; decided after mount so SSR and first render match.
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setOpen(false); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  if (!open)
    return (
      <button onClick={() => setOpen(true)} aria-label="Show previous discussions" className="self-start rounded-lg border px-2 py-2 text-sm text-zinc-500">
        ☰
      </button>
    );

  return (
    <nav aria-label="Previous discussions" className="flex w-full shrink-0 flex-col gap-2 text-sm md:w-60">
      <div className="flex gap-2">
        <button onClick={onNew} className="flex-1 rounded-lg bg-foreground px-3 py-2 font-medium text-background">New discussion</button>
        <button onClick={() => setOpen(false)} aria-label="Hide previous discussions" className="rounded-lg border px-2 text-zinc-500">«</button>
      </div>
      {items.length === 0 && <p className="px-1 text-xs text-zinc-500">Past discussions are saved here.</p>}
      <ul className="flex flex-col gap-1">
        {items.map((d) => {
          const current = d.id === currentId;
          const ideas = visibleNodes(d.board).filter((n) => n.kind === "idea").length;
          return (
            <li key={d.id} className={`group rounded-lg px-2 py-1.5 ${current ? "bg-zinc-100 dark:bg-zinc-900" : "hover:bg-zinc-50 dark:hover:bg-zinc-950"}`}>
              {editing === d.id ? (
                <input
                  autoFocus
                  defaultValue={d.title}
                  aria-label="Discussion title"
                  onBlur={(e) => { onRename(d.id, e.target.value); setEditing(null); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") setEditing(null);
                  }}
                  className="w-full rounded border bg-transparent px-1 py-0.5"
                />
              ) : (
                <button onClick={() => onOpen(d)} aria-current={current || undefined} className="block w-full text-left">
                  <span className="block truncate font-medium">{d.title}</span>
                  <span className="text-xs text-zinc-500">{ago(d.updatedAt)} · {ideas} idea{ideas === 1 ? "" : "s"}</span>
                </button>
              )}
              <div className="mt-0.5 flex gap-2 text-xs text-zinc-500">
                <button onClick={() => setEditing(d.id)} aria-label={`Rename ${d.title}`} className="hover:text-foreground">Rename</button>
                <button onClick={() => onRemove(d.id)} aria-label={`Delete ${d.title}`} className="hover:text-red-600">Delete</button>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
