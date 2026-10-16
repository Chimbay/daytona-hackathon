"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Board as BoardData, NodeKind } from "@/lib/board";
import { layoutBoard, NODE_W } from "@/lib/layout";

const spring = { type: "spring", stiffness: 170, damping: 24 } as const;

const kindStyle: Record<NodeKind, string> = {
  idea: "bg-white border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700",
  question: "bg-sky-50 border-sky-300 dark:bg-sky-950 dark:border-sky-700",
  fact: "bg-amber-50 border-amber-400 dark:bg-amber-950 dark:border-amber-600",
};

type Props = { board: BoardData; pending?: ReadonlySet<string>; onSelect?: (id: string) => void; selected?: string | null };

export default function Board({ board, pending, onSelect, selected }: Props) {
  const { nodes, edges, width, height } = layoutBoard(board, pending);
  const frame = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = frame.current!;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Shrink to fit the presenter screen as the graph grows; never zoom past 1.
  const scale = width && box.w ? Math.min(1, box.w / width, box.h / height) : 1;

  return (
    <div ref={frame} className="flex h-full w-full items-center justify-center overflow-hidden">
      <motion.div
        className="relative shrink-0"
        style={{ width, height }}
        animate={{ scale }}
        transition={spring}
      >
        <svg className="absolute inset-0 overflow-visible" width={width} height={height} aria-hidden>
          <AnimatePresence>
            {edges.map((e) => (
              <motion.path
                key={e.key}
                initial={{ d: e.d, pathLength: 0, opacity: 0 }}
                animate={{ d: e.d, pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={spring}
                fill="none"
                strokeWidth={2}
                className="stroke-zinc-400 dark:stroke-zinc-600"
              />
            ))}
            {edges.filter((e) => e.label).map((e) => (
              <motion.text
                key={`${e.key}-label`}
                initial={{ x: e.mx, y: e.my - 6, opacity: 0 }}
                animate={{ x: e.mx, y: e.my - 6, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={spring}
                textAnchor="middle"
                className="fill-zinc-500 text-xs"
              >
                {e.label}
              </motion.text>
            ))}
          </AnimatePresence>
        </svg>
  
        <AnimatePresence>
          {nodes.map((n) => (
            <motion.div
              key={n.id}
              initial={{ x: n.x, y: n.y, opacity: 0, scale: 0.85 }}
              animate={{ x: n.x, y: n.y, opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={spring}
              className={`absolute left-0 top-0 cursor-pointer rounded-xl border-2 px-4 py-3 text-left shadow-sm outline-none focus-visible:ring-4 focus-visible:ring-sky-500 ${kindStyle[n.kind]} ${selected === n.id ? "ring-4 ring-violet-500" : ""}`}
              style={{ width: NODE_W, minHeight: n.h }}
              role="button"
              tabIndex={0}
              aria-label={`${n.label}. Show history`}
              onClick={() => onSelect?.(n.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect?.(n.id);
                }
              }}
            >
              <p className="text-[15px] font-medium leading-5">{n.label}</p>
              {n.quote && n.kind !== "fact" && (
                <p className="mt-1 line-clamp-2 text-xs italic leading-4 text-zinc-600 dark:text-zinc-400">“{n.quote}”</p>
              )}
              {n.was.map((w) => (
                <p key={w} className="mt-1 truncate text-xs text-zinc-400 line-through decoration-zinc-400/70">
                  was: {w}
                </p>
              ))}
              {n.speaker && <p className="mt-1 text-xs text-zinc-500">{n.speaker}</p>}
              {n.source && (
                <a href={n.source} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="mt-1 block truncate text-xs text-amber-700 underline dark:text-amber-400">
                  internal wiki · {new URL(n.source).pathname}
                </a>
              )}
              {n.pending && (
                <motion.p
                  className="mt-1 text-xs font-medium text-sky-700 dark:text-sky-300"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                >
                  Researching in secure sandbox…
                </motion.p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
