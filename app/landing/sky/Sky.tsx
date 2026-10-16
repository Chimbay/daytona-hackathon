"use client";

import type { CSSProperties, ReactNode } from "react";
import { MotionConfig, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import "./sky.css";

// Puffs relative to a 340x140 cloud box: [left, top, size, shaded].
const PUFFS: [number, number, number, boolean][] = [
  [0, 52, 120, false],
  [60, 18, 150, false],
  [140, 0, 170, false],
  [215, 34, 130, false],
  [40, 70, 260, true],
];

type CloudSpec = { left: string; top: string; scale: number; opacity: number };

// Three depths: far clouds are small and slow, near ones large and faster.
const LAYERS: { drift: string; range: string; parallax: number; clouds: CloudSpec[] }[] = [
  {
    drift: "190s",
    range: "4vw",
    parallax: -60,
    clouds: [
      { left: "8%", top: "14%", scale: 0.55, opacity: 0.7 },
      { left: "52%", top: "8%", scale: 0.45, opacity: 0.6 },
      { left: "78%", top: "30%", scale: 0.5, opacity: 0.65 },
      { left: "30%", top: "58%", scale: 0.5, opacity: 0.55 },
    ],
  },
  {
    drift: "140s",
    range: "7vw",
    parallax: -180,
    clouds: [
      { left: "-2%", top: "38%", scale: 0.9, opacity: 0.85 },
      { left: "62%", top: "50%", scale: 0.85, opacity: 0.8 },
      { left: "36%", top: "22%", scale: 0.75, opacity: 0.75 },
    ],
  },
  {
    drift: "100s",
    range: "10vw",
    parallax: -360,
    clouds: [
      { left: "70%", top: "4%", scale: 1.4, opacity: 0.9 },
      { left: "10%", top: "74%", scale: 1.5, opacity: 0.95 },
    ],
  },
];

// Fixed positions so server and client render the same stars (shown only in the dark scheme).
const STARS = [
  [6, 9], [14, 22], [23, 6], [31, 17], [44, 11], [57, 4], [63, 19], [72, 9], [84, 14], [93, 6],
  [19, 31], [48, 27], [88, 29], [37, 3], [77, 24],
];

function Cloud({ left, top, scale, opacity }: CloudSpec) {
  return (
    <div className="sky-cloud" style={{ left, top, opacity, transform: `scale(${scale})` }}>
      {PUFFS.map(([l, t, size, shaded], i) => (
        <span
          key={i}
          className={`sky-puff ${shaded ? "sky-puff-shade" : ""}`}
          style={{ left: l, top: t, width: size, height: size * (shaded ? 0.42 : 0.82) }}
        />
      ))}
    </div>
  );
}

function Layer({ index }: { index: number }) {
  const { drift, range, parallax, clouds } = LAYERS[index];
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 2400], [0, reduce ? 0 : parallax], { clamp: true });
  return (
    <motion.div className="sky-layer" style={{ y }}>
      <div className="sky-drift" style={{ "--drift": drift, "--range": range } as CSSProperties}>
        {clouds.map((c, i) => (
          <Cloud key={i} {...c} />
        ))}
      </div>
    </motion.div>
  );
}

export function SkyShell({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="sky-sky" aria-hidden="true">
        {STARS.map(([x, y], i) => (
          <span key={i} className="sky-star" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(i % 5) * 1.3}s` }} />
        ))}
        {LAYERS.map((_, i) => (
          <Layer key={i} index={i} />
        ))}
      </div>
      <div className="relative z-10">{children}</div>
    </MotionConfig>
  );
}
