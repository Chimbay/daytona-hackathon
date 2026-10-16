"use client";

import { useMemo, useState } from "react";
import Board from "./components/Board";
import { applyEdits, emptyBoard } from "@/lib/board";
import { demoScript } from "@/lib/demo-script";

export default function Home() {
  const [step, setStep] = useState(0);
  const board = useMemo(
    () => demoScript.slice(0, step).reduce((b, s) => applyEdits(b, s.edits), emptyBoard),
    [step],
  );

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 md:flex-row">
      <section className="min-h-[60vh] flex-1 rounded-2xl bg-zinc-50 p-6 dark:bg-zinc-950">
        <Board board={board} />
      </section>

      <aside className="flex w-full flex-col gap-3 md:w-80">
        <div className="flex gap-2">
          <button onClick={() => setStep(0)} className="rounded-lg border px-3 py-2 text-sm">Reset</button>
          <button
            onClick={() => setStep((s) => Math.min(s + 1, demoScript.length))}
            disabled={step >= demoScript.length}
            className="flex-1 rounded-lg bg-foreground px-3 py-2 text-sm text-background disabled:opacity-40"
          >
            Next line ({step}/{demoScript.length})
          </button>
        </div>
        <ol className="flex flex-col gap-2 text-sm" aria-live="polite">
          {demoScript.slice(0, step).map((s, i) => (
            <li key={i}>
              <span className="font-semibold">{s.speaker}:</span> {s.text}
            </li>
          ))}
        </ol>
      </aside>
    </main>
  );
}
