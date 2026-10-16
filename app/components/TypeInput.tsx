"use client";

import { useState } from "react";

const MAX = 500;

// Typed lines go through the same path as the mic, as the selected speaker.
export default function TypeInput({ speaker, onSend }: { speaker: string; onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };
  return (
    <form className="flex flex-col gap-1" onSubmit={(e) => { e.preventDefault(); send(); }}>
      <label htmlFor="type-input" className="text-xs text-zinc-500">Type what {speaker || "someone"} said, or add an idea</label>
      <div className="flex gap-2">
        <textarea
          id="type-input"
          value={text}
          maxLength={MAX}
          rows={2}
          placeholder="e.g. Actually, let's go mobile first instead"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
          className="min-w-0 flex-1 resize-none rounded-lg border bg-transparent px-2 py-1"
        />
        <button type="submit" disabled={!text.trim()} className="rounded-lg bg-foreground px-3 py-2 font-medium text-background disabled:opacity-40">Send</button>
      </div>
    </form>
  );
}
