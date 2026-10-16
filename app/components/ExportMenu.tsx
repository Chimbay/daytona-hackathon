"use client";

import { useState } from "react";
import type { Board } from "@/lib/board";
import { summarize, type Line } from "@/lib/summary";

export default function ExportMenu({ board, lines }: { board: Board; lines: Line[] }) {
  const [msg, setMsg] = useState("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summarize(board, lines));
      setMsg("Summary copied as Markdown.");
    } catch (e) {
      setMsg(`Couldn't copy to clipboard: ${(e as Error).message}`);
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ board, lines }, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "brainstorm.json" });
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <button onClick={() => void copy()} className="flex-1 rounded-lg border px-3 py-2">Copy summary</button>
        <button onClick={download} className="flex-1 rounded-lg border px-3 py-2">Download JSON</button>
      </div>
      {msg && <p role="status" className="text-xs text-zinc-500">{msg}</p>}
    </div>
  );
}
