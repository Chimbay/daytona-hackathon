"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useInView, useReducedMotion } from "motion/react";
import { Graph, layout as dagreLayout } from "@dagrejs/dagre";
import { applyEdits, emptyBoard, replaced, visibleNodes, type Board } from "@/lib/board";
import { heroScript as demoScript } from "./script";
import "./dream.css";

// A short brainstorm replayed edit by edit through the real applyEdits, on a softer renderer.
const boards: Board[] = demoScript.reduce<Board[]>((acc, step) => [...acc, applyEdits(acc.at(-1) ?? emptyBoard, step.edits, acc.length)], []);
const LAST = boards.length - 1;
const STEP_MS = 3600;
const HOLD_MS = 7000;
const W = 176;
const drift = { type: "spring", stiffness: 38, damping: 18, mass: 1.2 } as const;

function layout(board: Board, vertical: boolean) {
  const g = new Graph();
  g.setGraph({ rankdir: vertical ? "TB" : "LR", nodesep: vertical ? 22 : 30, ranksep: vertical ? 48 : 70, marginx: 12, marginy: 12 });
  g.setDefaultEdgeLabel(() => ({}));
  const nodes = visibleNodes(board).map((n) => ({ ...n, was: replaced(board, n.id)[0] }));
  // shortcut: height guessed from label length (~22 chars/line), fine for the fixed demo script.
  for (const n of nodes) g.setNode(n.id, { width: W, height: 44 + Math.ceil(n.label.length / 22) * 19 + (n.was ? 18 : 0) });
  for (const e of board.edges) if (g.hasNode(e.from) && g.hasNode(e.to)) g.setEdge(e.from, e.to);
  dagreLayout(g);
  const placed = nodes.map((n) => {
    const p = g.node(n.id);
    return { ...n, x: p.x - p.width / 2, y: p.y - p.height / 2, h: p.height };
  });
  const at = new Map(placed.map((p) => [p.id, p]));
  const edges = board.edges.flatMap((e) => {
    const a = at.get(e.from), b = at.get(e.to);
    if (!a || !b) return [];
    const [x1, y1, x2, y2] = vertical ? [a.x + W / 2, a.y + a.h, b.x + W / 2, b.y] : [a.x + W, a.y + a.h / 2, b.x, b.y + b.h / 2];
    const d = vertical
      ? `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`
      : `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`;
    return [{ key: `${e.from}>${e.to}`, d }];
  });
  const { width = 0, height = 0 } = placed.length ? g.graph() : {};
  return { nodes: placed, edges, width, height };
}

export default function DreamBoard() {
  const reduce = useReducedMotion();
  const frame = useRef<HTMLDivElement>(null);
  const inView = useInView(frame, { amount: 0.3 });
  const [box, setBox] = useState(0);
  const [step, setStep] = useState(-1);
  const [paused, setPaused] = useState(false);
  const shown = reduce ? LAST : step;

  useEffect(() => {
    const el = frame.current!;
    const ro = new ResizeObserver(() => setBox(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (reduce || paused || !inView) return;
    const wait = step === LAST ? HOLD_MS : step === -1 ? 900 : STEP_MS;
    const t = setTimeout(() => setStep((i) => (i === LAST ? -1 : i + 1)), wait);
    return () => clearTimeout(t);
  }, [step, reduce, paused, inView]);

  const vertical = box > 0 && box < 640;
  const final = layout(boards[LAST], vertical);
  const now = shown >= 0 ? layout(boards[shown], vertical) : { nodes: [], edges: [], width: 0, height: 0 };
  const prevIds = new Set(shown > 0 ? visibleNodes(boards[shown - 1]).map((n) => n.id) : []);
  const scale = box ? Math.min(1, box / final.width) : 1;
  // Center the growing graph inside the final graph's footprint so it settles in place.
  const ox = (final.width - now.width) / 2, oy = (final.height - now.height) / 2;
  const line = shown >= 0 && !reduce ? demoScript[shown] : null;
  const target = now.nodes.find((n) => !prevIds.has(n.id)) ?? now.nodes.find((n) => n.id === "slack");

  return (
    <MotionConfig reducedMotion="user">
      <figure className="relative m-0">
        <div ref={frame} className="relative w-full" style={{ height: final.height * scale || 360 }}>
          <div className="absolute left-1/2 top-0 origin-top" style={{ width: final.width, height: final.height, transform: `translateX(-50%) scale(${scale})` }}>
            <svg className="absolute inset-0 overflow-visible" width={final.width} height={final.height} aria-hidden>
              <AnimatePresence>
                {now.edges.map((e) => (
                  <motion.path
                    key={e.key + e.d}
                    d={e.d}
                    transform={`translate(${ox} ${oy})`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 1.6, delay: 1.2 } }}
                    exit={{ opacity: 0, transition: { duration: 0.8 } }}
                    className="dream-edge"
                  />
                ))}
              </AnimatePresence>
            </svg>

            <ul aria-label="Board" className="m-0 list-none p-0">
              <AnimatePresence>
                {now.nodes.map((n) => {
                  const fresh = !prevIds.has(n.id);
                  return (
                    <motion.li
                      key={n.id}
                      className={`dream-cloud dream-${n.kind}`}
                      style={{ width: W, minHeight: n.h - 8 }}
                      initial={{ x: n.x + ox, y: n.y + oy + 36, opacity: 0, scale: 0.86 }}
                      animate={{ x: n.x + ox, y: n.y + oy, opacity: 1, scale: 1 }}
                      exit={{ y: n.y + oy - 40, opacity: 0, scale: 1.06, transition: { duration: 1.8, ease: "easeOut" } }}
                      transition={{ ...drift, delay: fresh && shown > 0 ? 1.3 : 0, opacity: { duration: 1.4, delay: fresh && shown > 0 ? 1.3 : 0 } }}
                    >
                      {n.kind !== "idea" && <span className="dream-kindTag">{n.kind === "fact" ? "from the internal wiki" : "question"}</span>}
                      <span className="block">{n.label}</span>
                      {n.was && <span className="dream-was">was: {n.was}</span>}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>

            <AnimatePresence>
              {line && (
                <motion.p
                  key={shown}
                  aria-hidden
                  className="dream-vapor"
                  initial={{ x: (target ? target.x + ox : final.width / 2 - 140), y: final.height + 10, opacity: 0 }}
                  animate={{ y: (target ? target.y + oy : final.height / 2) - 6, opacity: [0, 1, 1, 0], transition: { duration: 2.4, ease: [0.22, 0.8, 0.3, 1], opacity: { duration: 2.4, times: [0, 0.2, 0.6, 1] } } }}
                  exit={{ opacity: 0, transition: { duration: 0.3 } }}
                >
                  <span className="dream-speaker">{line.speaker}</span>
                  {line.text}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
        <figcaption className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-sm">
          <span className="dream-muted">A short scripted brainstorm, replayed the way the board draws a live one.</span>
          {!reduce && (
            <button type="button" onClick={() => setPaused((p) => !p)} className="dream-ghost" aria-pressed={paused}>
              {paused ? "Play" : "Pause"}
            </button>
          )}
        </figcaption>
        <p className="sr-only" aria-live="polite">
          {line ? `${line.speaker}: ${line.text}` : ""}
        </p>
      </figure>
    </MotionConfig>
  );
}
