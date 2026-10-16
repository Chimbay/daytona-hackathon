"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { floatToPcm16, openScribe, SAMPLE_RATE, streamPcm, type Chunk, type ScribeConnection } from "./scribe";

export type { Chunk };
export type TranscriptStatus = "idle" | "connecting" | "live" | "error";

async function fetchToken(): Promise<string> {
  const res = await fetch("/api/stt-token", { method: "POST" });
  const body = await res.json();
  if (!res.ok || !body.token) throw new Error(body.error ?? `stt-token ${res.status}`);
  return body.token;
}

/** Decode any browser-playable audio (File, Blob or URL) to 16 kHz mono PCM16. */
async function decodeToPcm(src: Blob | string): Promise<Uint8Array> {
  const buf = await (typeof src === "string" ? (await fetch(src)).arrayBuffer() : src.arrayBuffer());
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE }); // decodeAudioData resamples to the context rate
  try {
    // shortcut: takes channel 0 only, fine for mono/near-mono recordings
    return floatToPcm16((await ctx.decodeAudioData(buf)).getChannelData(0));
  } finally {
    void ctx.close();
  }
}

/**
 * Speech → committed transcript chunks. `startMic()` streams the microphone;
 * `startFile(fileOrUrl)` replays a recording through the same socket path (noisy-room fallback).
 * `partial` is the live, uncommitted text for display only. `speaker` is always undefined:
 * Scribe realtime has no diarization.
 */
export function useTranscript(onChunk: (chunk: Chunk) => void) {
  const [status, setStatus] = useState<TranscriptStatus>("idle");
  const [partial, setPartial] = useState("");
  const [error, setError] = useState<string | null>(null);
  const onChunkRef = useRef(onChunk);
  const conn = useRef<ScribeConnection | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    onChunkRef.current = onChunk;
  }, [onChunk]);

  const stop = useCallback(() => {
    abort.current?.abort();
    conn.current?.close();
    conn.current = null;
    setPartial("");
    setStatus((s) => (s === "error" ? s : "idle"));
  }, []);

  const start = useCallback(
    async (src: "mic" | Blob | string) => {
      stop();
      setError(null);
      setStatus("connecting");
      const ac = (abort.current = new AbortController());
      try {
        const [token, pcm] = await Promise.all([fetchToken(), src === "mic" ? null : decodeToPcm(src)]);
        if (ac.signal.aborted) return;
        const c = openScribe(token, pcm ? "pcm" : "mic", {
          onChunk: (chunk) => onChunkRef.current(chunk),
          onPartial: setPartial,
          onError: (e) => {
            setError(e instanceof Error ? e.message : JSON.stringify(e));
            setStatus("error");
          },
          onClose: () => setStatus((s) => (s === "error" ? s : "idle")),
        });
        conn.current = c;
        setStatus("live");
        if (pcm) {
          await streamPcm(c, pcm, ac.signal);
          // keep the socket open briefly so the final committed transcript arrives
          setTimeout(() => conn.current === c && stop(), 3000);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      }
    },
    [stop],
  );

  useEffect(() => stop, [stop]);

  return {
    status,
    partial,
    error,
    startMic: useCallback(() => start("mic"), [start]),
    startFile: useCallback((src: Blob | string) => start(src), [start]),
    stop,
  };
}
