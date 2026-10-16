"use client";

import { useCallback, useRef, useState } from "react";
import Board from "../components/Board";
import HistoryPanel from "../components/HistoryPanel";
import MicMeter from "../components/MicMeter";
import TypeInput from "../components/TypeInput";
import EmptyHint from "../components/EmptyHint";
import ExportMenu from "../components/ExportMenu";
import { sans } from "../fonts";
import { activate, applyEdits, emptyBoard, factEdits, type Board as BoardData, type Edit } from "@/lib/board";
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
  // Live-mic tuning; applies the next time the mic starts.
  const [pause, setPause] = useState(1.2);
  const [noisy, setNoisy] = useState(false);
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
  // Switching to another version of an idea changes the real board, so the next chunk builds on it.
  const switchTo = useCallback((id: string) => {
    boardRef.current = activate(boardRef.current, id);
    setBoard(boardRef.current);
  }, []);
  const note = (s: string) => setNotes((n) => [s, ...n].slice(0, 5));

  const research = useCallback(
    async ({ question, nodeId }: { question: string; nodeId: string }) => {
      note(`Researching: ${question}`);
      setPending((p) => new Set(p).add(nodeId));
      const s = sid();
      try {
        const { fact, source, snapshot } = await post<{ fact: string; source: string; snapshot?: string }>("/api/research", { question, sessionId: s, nodeId });
        if (session.current !== s) return; // board was reset while researching
        apply(factEdits(nodeId, fact, source, snapshot));
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
        const s = sid();
        try {
          const r = await post<{ edits: Edit[]; research?: { question: string; nodeId: string } }>("/api/board", {
            board: boardRef.current,
            chunk: line,
            sessionId: s,
          });
          if (session.current !== s) return; // board was reset while the model was thinking
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
    // Transcription still runs if the browser blocks or can't decode playback.
    audio.current.play().catch((e: Error) => note(`Clip playback failed: ${e.message}`));
    void startFile(file);
  };

  const playDemoClip = async () => {
    try {
      const res = await fetch("/demo/brainstorm.wav");
      if (!res.ok) throw new Error(`demo clip ${res.status}`);
      playClip(await res.blob());
    } catch (e) {
      note(`Demo clip unavailable: ${(e as Error).message}`);
    }
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
    <main className={`board-sky ${sans.variable} flex flex-1 flex-col gap-6 p-6 md:flex-row`}>
      <section className="relative min-h-[60vh] min-w-0 flex-1 overflow-hidden rounded-3xl bg-white/60 p-6 shadow-[0_1px_2px_rgba(60,70,120,0.05),0_18px_48px_-18px_rgba(90,100,160,0.28)] ring-1 ring-white/90 backdrop-blur-md dark:bg-[rgba(30,36,78,0.45)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_18px_48px_-18px_rgba(0,0,0,0.6)] dark:ring-white/10">
        <Board board={board} pending={pending} selected={history?.id} onSelect={(id) => setHistory({ id, session: sid() })} onActivate={switchTo} />
        <EmptyHint show={board.nodes.length === 0} />
        {/* Live captions so the room sees words land before the board redraws. */}
        {(partial || (live && lines.length > 0)) && (
          <p
            aria-hidden
            className="pointer-events-none absolute inset-x-6 bottom-6 mx-auto max-w-3xl rounded-xl bg-white/85 px-5 py-3 text-center text-xl leading-snug shadow-sm backdrop-blur dark:bg-black/70"
          >
            {partial ? <span>{partial}</span> : <span className="text-zinc-500">{lines.at(-1)!.text}</span>}
          </p>
        )}
      </section>

      <aside className="flex w-full shrink-0 flex-col gap-3 text-sm md:w-80">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => (live ? stop() : void startMic({ silenceSecs: pause, threshold: noisy ? 0.6 : undefined }))}
            className={`flex-1 rounded-lg px-3 py-2 font-medium ${live ? "bg-red-600 text-white" : "bg-foreground text-background"}`}
          >
            {status === "connecting" ? "Connecting…" : live ? "Stop listening" : "Start mic"}
          </button>
          <button onClick={reset} className="rounded-lg border px-3 py-2">Reset</button>
        </div>
        <MicMeter active={status === "live"} />
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          <label className="flex items-center gap-1">
            Pause before sending
            <select value={pause} onChange={(e) => setPause(Number(e.target.value))} disabled={live} className="rounded border bg-transparent px-1 py-0.5">
              {[0.8, 1.2, 1.5, 2].map((s) => <option key={s} value={s}>{s}s</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={noisy} onChange={(e) => setNoisy(e.target.checked)} disabled={live} />
            Noisy room
          </label>
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

        <TypeInput speaker={speaker} onSend={(text) => onChunk({ text })} />
        <ExportMenu board={board} lines={lines} />

        <details className="rounded-lg border px-3 py-2">
          <summary className="cursor-pointer text-xs text-zinc-500">Fallbacks</summary>
          <div className="mt-2 flex flex-col gap-2">
            <button
              onClick={() => void playDemoClip()}
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
