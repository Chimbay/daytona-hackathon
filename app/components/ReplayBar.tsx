"use client";

import { useEffect, useState } from "react";
import type { Snapshot } from "@/lib/useBoardHistory";

type Props = { snaps: Snapshot[]; index: number | null; setIndex: (i: number | null) => void };

// Scrub through how the board evolved; Board animates each snapshot into place.
export default function ReplayBar({ snaps, index, setIndex }: Props) {
  const [playing, setPlaying] = useState(false);
  const last = snaps.length - 1;
  const at = index ?? last;
  const running = playing && at < last;

  useEffect(() => {
    if (!running) return;
    // Reduced motion: same animation, just more time between steps.
    const slow = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setIndex(at + 1), slow ? 2500 : 1200);
    return () => clearTimeout(t);
  }, [running, at, setIndex]);

  if (snaps.length < 2) return null;
  const go = (i: number) => { setPlaying(false); setIndex(Math.max(0, Math.min(last, i))); };
  const snap = snaps[at];
  const btn = "rounded px-2 py-0.5 hover:bg-zinc-200 disabled:opacity-40 dark:hover:bg-zinc-800";

  return (
    <div className="absolute inset-x-3 bottom-3 z-20 flex items-center gap-2 rounded-xl border bg-white/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur dark:bg-black/80">
      <button className={btn} onClick={() => go(at - 1)} disabled={at <= 0} aria-label="Previous step">◀</button>
      <button
        className={btn}
        onClick={() => { if (running) return setPlaying(false); if (index === null || at >= last) setIndex(0); setPlaying(true); }}
        aria-label={running ? "Pause replay" : "Play replay"}
      >
        {running ? "❚❚" : "▶ Play"}
      </button>
      <button className={btn} onClick={() => go(at + 1)} disabled={at >= last} aria-label="Next step">▶</button>
      <input
        type="range"
        min={0}
        max={last}
        value={at}
        onChange={(e) => go(Number(e.target.value))}
        aria-label="Replay step"
        aria-valuetext={snap.label}
        className="min-w-16 flex-1"
      />
      <span className="max-w-[40%] truncate tabular-nums text-zinc-600 dark:text-zinc-300" aria-live="polite">
        {at + 1}/{snaps.length} · {new Date(snap.at).toLocaleTimeString()} · {snap.label}
      </span>
      <button
        className={`rounded px-2 py-0.5 font-medium ${index === null ? "bg-red-600 text-white" : "border"}`}
        onClick={() => { setPlaying(false); setIndex(null); }}
      >
        Live
      </button>
    </div>
  );
}
