"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Board as BoardData, NodeKind } from "@/lib/board";
import { layoutBoard, PEEK, SNAP_H } from "@/lib/layout";

// Soft, barely-bouncy moves: switching branches can reshuffle the whole board, so nothing snaps.
const move = { type: "spring", visualDuration: 0.75, bounce: 0.12 } as const;
// Cards fade in after the board has started making room, cascading left to right.
const appear = (x: number) => ({ duration: 0.45, delay: 0.18 + Math.min(x, 1600) / 4000, ease: "easeOut" }) as const;
const leave = { duration: 0.35, ease: [0.4, 0, 1, 1] } as const;

const kindStyle: Record<NodeKind, string> = {
  idea: "bg-white border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700",
  question: "bg-sky-50 border-sky-300 dark:bg-sky-950 dark:border-sky-700",
  fact: "bg-amber-50 border-amber-400 dark:bg-amber-950 dark:border-amber-600",
};

// Superseded versions: washed out and dashed so it's obvious the group moved on from them.
const deprecatedStyle = "border-dashed bg-zinc-100 border-zinc-300 text-zinc-400 grayscale dark:bg-zinc-900/80 dark:border-zinc-700 dark:text-zinc-500";
// Ideas that didn't match anything when said: dashed and tinted until a link pulls them into the tree.
const looseStyle = "border-dashed border-sky-400 bg-white/70 shadow-md shadow-sky-200/60 dark:border-sky-500 dark:bg-zinc-900/70 dark:shadow-sky-900/40";

type Props = {
  board: BoardData;
  pending?: ReadonlySet<string>;
  onSelect?: (id: string) => void;
  selected?: string | null;
  // A version peeking from behind its stack was clicked: make it the live one.
  onActivate?: (id: string) => void;
};

// Pops each time the number changes, so a hidden branch growing in real time is noticeable.
function Count({ n, className }: { n: number; className: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={n}
        initial={{ scale: 1.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.6, opacity: 0 }}
        transition={{ type: "spring", visualDuration: 0.35, bounce: 0.4 }}
        className={`inline-flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${className}`}
      >
        +{n}
      </motion.span>
    </AnimatePresence>
  );
}

export default function Board({ board, pending, onSelect, selected, onActivate }: Props) {
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
      {/* Size animates too: a big branch giving way to a tiny one glides instead of jumping recenter. */}
      <motion.div className="relative shrink-0" initial={false} animate={{ width, height, scale }} transition={move}>
        <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <AnimatePresence>
            {edges.map((e) => (
              <motion.path
                key={e.key}
                initial={{ d: e.d0, opacity: 0 }}
                animate={{ d: e.d, opacity: 1 }}
                exit={{ opacity: 0, transition: leave }}
                transition={{ d: move, opacity: { duration: 0.4, delay: 0.15 } }}
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
                exit={{ opacity: 0, transition: leave }}
                transition={{ default: move, opacity: { duration: 0.4, delay: 0.4 } }}
                textAnchor="middle"
                className="fill-zinc-500 text-xs"
              >
                {e.label}
              </motion.text>
            ))}
          </AnimatePresence>
        </svg>

        <AnimatePresence>
          {nodes.map((n) => {
            const act = () => (n.front ? onSelect?.(n.id) : onActivate?.(n.id));
            return (
            <motion.div
              key={n.id}
              // New cards sprout from the card they hang off; removed ones fold back into it.
              initial={{ x: n.ox, y: n.oy, width: n.w, opacity: 0, scale: 0.6 }}
              animate={{ x: n.x, y: n.y, width: n.w, opacity: 1, scale: 1 }}
              exit={{ x: n.ox, y: n.oy, opacity: 0, scale: 0.6, transition: leave }}
              transition={{ default: move, opacity: appear(n.x), scale: { ...move, delay: appear(n.x).delay } }}
              className={`absolute left-0 top-0 cursor-pointer overflow-hidden rounded-xl border-2 px-4 text-left shadow-sm outline-none transition-colors duration-500 focus-visible:ring-4 focus-visible:ring-sky-500 ${n.front ? "py-3" : "py-1 hover:border-violet-400"} ${n.deprecated ? deprecatedStyle : n.loose ? looseStyle : kindStyle[n.kind]} ${selected === n.id ? "ring-4 ring-violet-500" : ""}`}
              style={{ height: n.front ? undefined : n.h, minHeight: n.h, zIndex: n.z }}
              role="button"
              tabIndex={0}
              aria-label={
                n.front
                  ? `${n.loose ? "Unconnected idea: " : ""}${n.label}.${n.unseen ? ` ${n.unseen} new cards on a hidden branch.` : ""} Show history`
                  : `${n.deprecated ? "Old idea" : "Other branch"}: ${n.label}.${n.unseen ? ` ${n.unseen} new cards.` : ""} Continue brainstorming on it`
              }
              onClick={act}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  act();
                }
              }}
            >
              {!n.front ? (
                <p className="flex items-center gap-2 text-xs leading-4" style={{ height: PEEK - 10 }}>
                  <span className="shrink-0 font-semibold uppercase tracking-wide">{n.deprecated ? "old" : "branch"}</span>
                  <span className={`min-w-0 flex-1 truncate ${n.deprecated ? "line-through decoration-zinc-400/70" : ""}`}>{n.label}</span>
                  {n.unseen > 0 && <Count n={n.unseen} className="bg-violet-600 text-white" />}
                </p>
              ) : (
              <>
              <AnimatePresence initial={false}>
                {n.loose && (
                  <motion.p
                    key="loose"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="flex items-center gap-1.5 overflow-hidden text-[11px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400"
                  >
                    <motion.span
                      className="size-1.5 shrink-0 rounded-full bg-sky-500"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                    />
                    <span className="pb-1">Floating · no match yet</span>
                  </motion.p>
                )}
              </AnimatePresence>

              <p className="text-[15px] font-medium leading-5">{n.label}</p>
              {n.quote && n.kind !== "fact" && (
                <p className="mt-1 line-clamp-2 text-xs italic leading-4 text-zinc-600 dark:text-zinc-400">“{n.quote}”</p>
              )}

              {n.speaker && <p className="mt-1 text-xs text-zinc-500">{n.speaker}</p>}
              {n.snapshot && (
                // eslint-disable-next-line @next/next/no-img-element -- data URL, nothing for next/image to optimize
                <img src={n.snapshot} alt={`Snippet of ${n.source ?? "the source page"}`} style={{ height: SNAP_H }} className="mt-2 w-full rounded border border-amber-300 object-cover object-top dark:border-amber-700" />
              )}
              {n.source && (
                <a href={n.source} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="mt-1 block truncate text-xs text-amber-700 underline dark:text-amber-400">
                  internal wiki · {new URL(n.source).pathname}
                </a>
              )}
              {n.unseen > 0 && (
                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                  <motion.span
                    className="size-1.5 rounded-full bg-violet-500"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  />
                  <Count n={n.unseen} className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200" />
                  <span>new on the hidden branch</span>
                </p>
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
              </>
              )}
            </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
