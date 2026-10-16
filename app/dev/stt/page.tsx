"use client";

import { useState } from "react";
import { useTranscript, type Chunk } from "@/lib/useTranscript";

// Scratch page for exercising useTranscript; not linked from the board.
export default function SttDev() {
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [url, setUrl] = useState("");
  const stt = useTranscript((c) => setChunks((cs) => [...cs, c]));

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">STT dev</h1>
      <div className="flex flex-wrap items-center gap-2">
        <button className="rounded border px-3 py-1" onClick={stt.startMic}>Mic</button>
        <input
          aria-label="Audio file"
          type="file"
          accept="audio/*"
          onChange={(e) => e.target.files?.[0] && stt.startFile(e.target.files[0])}
        />
        <input
          aria-label="Audio URL"
          className="rounded border px-2 py-1"
          placeholder="/clip.wav"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button className="rounded border px-3 py-1" onClick={() => stt.startFile(url)}>Play URL</button>
        <button className="rounded border px-3 py-1" onClick={stt.stop}>Stop</button>
      </div>
      <p data-testid="status">status: {stt.status}{stt.error && ` — ${stt.error}`}</p>
      <p className="italic text-zinc-500">{stt.partial}</p>
      <ol data-testid="chunks" className="list-decimal pl-6">
        {chunks.map((c, i) => <li key={i}>{c.speaker && `${c.speaker}: `}{c.text}</li>)}
      </ol>
    </main>
  );
}
