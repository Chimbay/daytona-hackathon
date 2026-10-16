"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { History, IdeaVersion } from "@/lib/memory";

const time = (iso: string) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }) : "");

type State = { loading: boolean; chain?: IdeaVersion[]; error?: string };

// Shows one board card's full history as stored in SurrealDB Agent Memory (not the client board).
export default function HistoryPanel({ sessionId, nodeId, onClose }: { sessionId: string; nodeId: string | null; onClose: () => void }) {
  const [state, setState] = useState<State>({ loading: false });
  const heading = useRef<HTMLHeadingElement>(null);

  const latest = useRef(0);

  const load = useCallback(async () => {
    if (!nodeId) return;
    // Loads take seconds; a slower earlier load must not overwrite the card clicked since.
    const req = ++latest.current;
    setState({ loading: true });
    try {
      const res = await fetch(`/api/history?session=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `history ${res.status}`);
      const chain = (json as History).chains.find((c) => c.some((v) => v.id === nodeId));
      if (req === latest.current) setState({ loading: false, chain });
    } catch (e) {
      if (req === latest.current) setState({ loading: false, error: (e as Error).message });
    }
  }, [sessionId, nodeId]);

  useEffect(() => {
    if (!nodeId) return;
    void load(); // eslint-disable-line react-hooks/set-state-in-effect -- refetch on open is the point
    const back = document.activeElement as HTMLElement | null;
    heading.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      back?.focus();
    };
  }, [nodeId, load, onClose]);

  return (
    <AnimatePresence>
      {nodeId && (
        <motion.aside
          key="history"
          role="dialog"
          aria-labelledby="history-title"
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="fixed inset-y-0 right-0 z-20 flex w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="history-title" ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">Idea history</h2>
              <p className="mt-1 flex items-center gap-2 text-xs font-medium text-violet-700 dark:text-violet-300">
                <span className="inline-block h-2 w-2 rounded-full bg-violet-500" aria-hidden />
                From SurrealDB Agent Memory · shared by board + research agents
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => void load()} className="rounded-lg border px-3 py-1 text-sm">Refresh</button>
              <button onClick={onClose} aria-label="Close history (Esc)" className="rounded-lg border px-3 py-1 text-sm">Close</button>
            </div>
          </div>

          {state.loading && <p className="text-zinc-500">Loading from memory…</p>}
          {state.error && <p className="text-red-600">Memory unavailable: {state.error}</p>}
          {!state.loading && !state.error && !state.chain && (
            <p className="text-zinc-500">Not in memory yet. Writes land about a second after each board update; press Refresh.</p>
          )}

          {state.chain && (
            <ol className="flex flex-col gap-3">
              {state.chain.map((v, i) => {
                const old = !!v.supersededBy || v.status === "superseded";
                return (
                  <li
                    key={v.id}
                    className={`rounded-xl border-2 p-4 ${old ? "border-zinc-200 bg-zinc-50 opacity-70 dark:border-zinc-800 dark:bg-zinc-900" : "border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-950"}`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold uppercase tracking-wide text-zinc-500">
                        v{i + 1} · {time(v.createdAt)}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 font-medium ${old ? "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" : "bg-violet-600 text-white"}`}>
                        {old ? `superseded ${time(v.supersededBy?.at ?? "")}` : v.status ?? "live"}
                      </span>
                    </div>
                    {v.labelHistory.slice(0, -1).map((l) => (
                      <p key={l.at} className="mt-2 text-sm text-zinc-400 line-through">{l.value}</p>
                    ))}
                    <p className={`mt-1 text-lg font-medium leading-6 ${old ? "line-through decoration-zinc-400" : ""}`}>{v.label}</p>
                    {v.quote && <p className="mt-2 italic text-zinc-700 dark:text-zinc-300">“{v.quote}”</p>}
                    {v.source && (
                      <a href={v.source} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm text-amber-700 underline dark:text-amber-400">
                        {v.source}
                      </a>
                    )}
                    <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-zinc-500">
                      {v.speaker && <span>said by <b className="text-zinc-700 dark:text-zinc-300">{v.speaker}</b></span>}
                      {v.addedBy && <span>added by <b className={v.addedBy === "research-agent" ? "text-amber-700 dark:text-amber-400" : "text-sky-700 dark:text-sky-400"}>{v.addedBy}</b></span>}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
