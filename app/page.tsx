"use client";

import { useCallback, useRef, useState } from "react";
import Board from "./components/Board";
import HistoryPanel from "./components/HistoryPanel";
import { applyEdits, emptyBoard, factEdits, type Board as BoardData, type Edit } from "@/lib/board";
import { demoScript } from "@/lib/demo-script";
import { useTranscript, type Chunk } from "@/lib/useTranscript";

type Line = { speaker?: string; text: string };

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `${url} ${res.status}`);
  return json;
}

export default function Home() {
  const [board, setBoard] = useState<BoardData>(emptyBoard);
  const boardRef = useRef(board);
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [speakers, setSpeakers] = useState("Maya, Dev, Sam");
  const [speaker, setSpeaker] = useState("Maya");
  const speakerRef = useRef(speaker);
  const [step, setStep] = useState(0);
  // One memory session per board, created on first use (not at prerender); Reset starts a new one.
  const session = useRef("");
  const sid = () => (session.current ||= crypto.randomUUID());
  // Chunks are handled one at a time so each Claude call sees the board the previous one produced.
  const queue = useRef<Promise<void>>(Promise.resolve());
  // Card whose memory history is open; the session is captured at click time.
  const [history, setHistory] = useState<{ id: string; session: string } | null>(null);
  const closeHistory = useCallback(() => setHistory(null), []);

  const apply = useCallback((edits: Edit[]) => {
    boardRef.current = applyEdits(boardRef.current, edits);
    setBoard(boardRef.current);
  }, []);
  const note = (s: string) => setNotes((n) => [s, ...n].slice(0, 5));

  const research = useCallback(
    async ({ question, nodeId }: { question: string; nodeId: string }) => {
      note(`Researching: ${question}`);
      setPending((p) => new Set(p).add(nodeId));
      try {
        const { fact, source } = await post<{ fact: string; source: string }>("/api/research", { question, sessionId: sid(), nodeId });
        apply(factEdits(nodeId, fact, source));
        note(`Pinned: ${fact}`);
      } catch (e) {
        note(`No answer for "${question}": ${(e as Error).message}`);
      } finally {
        setPending((p) => {
          const next = new Set(p);
          next.delete(nodeId);
          return next;
        });
      }
    },
    [apply],
  );

  const onChunk = useCallback(
    (chunk: Chunk) => {
      const line = { speaker: chunk.speaker ?? speakerRef.current, text: chunk.text };
      setLines((l) => [...l, line]);
      queue.current = queue.current.then(async () => {
        try {
          const r = await post<{ edits: Edit[]; research?: { question: string; nodeId: string } }>("/api/board", {
            board: boardRef.current,
            chunk: line,
            sessionId: sid(),
          });
          apply(r.edits);
          // Research runs alongside later chunks; it only adds its own fact node.
          if (r.research) void research(r.research);
        } catch (e) {
          note(`Board update failed: ${(e as Error).message}`);
        }
      });
    },
    [apply, research],
  );

  const { status, partial, error, startMic, startFile, stop } = useTranscript(onChunk);
  const audio = useRef<HTMLAudioElement | null>(null);

  const reset = () => {
    stop();
    audio.current?.pause();
    boardRef.current = emptyBoard;
    setBoard(emptyBoard);
    setLines([]);
    setNotes([]);
    setPending(new Set());
    setStep(0);
    setHistory(null);
    session.current = "";
  };

  // Fallback: play the recorded brainstorm aloud and transcribe it through the same path as the mic.
  const playClip = (file: Blob) => {
    reset();
    audio.current = new Audio(URL.createObjectURL(file));
    void audio.current.play();
    void startFile(file);
  };

  // Offline fallback: scripted lines with their expected edits, no network at all.
  const nextScripted = () => {
    const s = demoScript[step];
    if (!s) return;
    setLines((l) => [...l, { speaker: s.speaker, text: s.text }]);
    apply(s.edits);
    setStep(step + 1);
  };

  const live = status === "live" || status === "connecting";

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 md:flex-row">
      <section className="min-h-[60vh] min-w-0 flex-1 overflow-hidden rounded-2xl bg-zinc-50 p-6 dark:bg-zinc-950">
        <Board board={board} pending={pending} selected={history?.id} onSelect={(id) => setHistory({ id, session: sid() })} />
      </section>

      <aside className="flex w-full shrink-0 flex-col gap-3 text-sm md:w-80">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => (live ? stop() : void startMic())}
            className={`flex-1 rounded-lg px-3 py-2 font-medium ${live ? "bg-red-600 text-white" : "bg-foreground text-background"}`}
          >
            {status === "connecting" ? "Connecting…" : live ? "Stop listening" : "Start mic"}
          </button>
          <button onClick={reset} className="rounded-lg border px-3 py-2">Reset</button>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs text-zinc-500">Who&apos;s talking (realtime STT has no speaker labels)</legend>
          <div className="flex flex-wrap gap-1">
            {speakers.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
              <button
                key={s}
                onClick={() => { setSpeaker(s); speakerRef.current = s; }}
                aria-pressed={speaker === s}
                className={`rounded-full border px-3 py-1 ${speaker === s ? "bg-foreground text-background" : ""}`}
              >
                {s}
              </button>
            ))}
          </div>
          <input value={speakers} onChange={(e) => setSpeakers(e.target.value)} aria-label="Speaker names, comma separated" className="rounded border bg-transparent px-2 py-1 text-xs" />
        </fieldset>

        <details className="rounded-lg border px-3 py-2">
          <summary className="cursor-pointer text-xs text-zinc-500">Fallbacks</summary>
          <div className="mt-2 flex flex-col gap-2">
            <button
              onClick={async () => playClip(await (await fetch("/demo/brainstorm.wav")).blob())}
              className="rounded-lg border px-3 py-2"
            >
              Play demo clip
            </button>
            <label className="text-xs">
              Play recorded clip (WAV/MP3)
              <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && playClip(e.target.files[0])} className="mt-1 block w-full text-xs" />
            </label>
            <button onClick={nextScripted} disabled={step >= demoScript.length} className="rounded-lg border px-3 py-2 disabled:opacity-40">
              Scripted line ({step}/{demoScript.length})
            </button>
          </div>
        </details>

        {error && <p className="text-red-600">{error}</p>}
        {notes.map((n, i) => <p key={i} className="text-xs text-amber-700 dark:text-amber-400">{n}</p>)}

        <ol className="flex flex-col gap-2" aria-live="polite">
          {lines.map((l, i) => (
            <li key={i}>
              {l.speaker && <span className="font-semibold">{l.speaker}: </span>}
              {l.text}
            </li>
          ))}
          {partial && <li className="text-zinc-500 italic">{partial}</li>}
        </ol>
      </aside>
      <HistoryPanel sessionId={history?.session ?? ""} nodeId={history?.id ?? null} onClose={closeHistory} />
    </main>
  );
}
