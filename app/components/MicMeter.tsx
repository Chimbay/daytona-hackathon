"use client";

import { useEffect, useRef } from "react";

// Live input level, so the presenter can see the mic is hearing the room. Opens its own
// stream (Scribe owns the other) and writes straight to the DOM to avoid re-rendering the board.
export default function MicMeter({ active }: { active: boolean }) {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bar.current;
    if (!active || !el) return;
    let raf = 0;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let cancelled = false;
    void navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(s).connect(analyser);
        const data = new Float32Array(analyser.fftSize);
        const tick = () => {
          analyser.getFloatTimeDomainData(data);
          let sum = 0;
          for (const v of data) sum += v * v;
          // RMS of speech sits around 0.02–0.2; scale so normal talking fills most of the bar.
          const level = Math.min(1, Math.sqrt(sum / data.length) * 6);
          el.style.transform = `scaleX(${level})`;
          raf = requestAnimationFrame(tick);
        };
        tick();
      })
      .catch(() => {}); // Scribe surfaces mic permission errors already
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
      el.style.transform = "scaleX(0)";
    };
  }, [active]);

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800" role="img" aria-label={active ? "Microphone level" : "Microphone off"}>
      <div ref={bar} className="h-full w-full origin-left scale-x-0 rounded-full bg-emerald-500 transition-transform duration-75" />
    </div>
  );
}
