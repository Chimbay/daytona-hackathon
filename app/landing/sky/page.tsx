import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Cormorant_Garamond, Figtree } from "next/font/google";
import * as motion from "motion/react-client";
import { SkyShell } from "./Sky";
import "./sky.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-sky-serif",
});
const sans = Figtree({ subsets: ["latin"], variable: "--font-sky-sans" });

export const metadata: Metadata = {
  title: "Imagine — a whiteboard that keeps up with your team",
  description:
    "Imagine listens to a group brainstorm, redraws the board as the idea changes, and answers internal questions from a throwaway sandbox.",
};

const calm = { duration: 1.8, ease: [0.22, 1, 0.36, 1] } as const;

const STEPS = [
  {
    name: "Listen",
    text: "Talk the way you already do; ElevenLabs transcribes the room as it speaks, and a tap marks who is talking.",
  },
  {
    name: "Redraw",
    text: "Claude on AWS Bedrock turns each phrase into edits to a small idea graph, and the board glides into its new shape.",
  },
  {
    name: "Remember",
    text: "Every idea keeps its quote, speaker and time in SurrealDB, so one click replays how it changed.",
  },
  {
    name: "Research",
    text: "Ask about internal numbers and a throwaway Daytona sandbox reads your wiki through Anchor Browser, then pins the answer with its source.",
  },
];

const BUILT_WITH = [
  ["Vercel", "app and API routes"],
  ["ElevenLabs", "realtime speech to text"],
  ["AWS Bedrock", "Claude edits the board"],
  ["Daytona", "one sandbox per question"],
  ["Anchor Browser", "reads the internal wiki"],
  ["SurrealDB", "shared, time-aware memory"],
  ["Arize", "traces and evals"],
];

export default function SkyLanding() {
  return (
    <div className={`sky-page ${serif.variable} ${sans.variable} min-h-screen`}>
      <SkyShell>
        <main>
          {/* Hero */}
          <section className="mx-auto flex min-h-[92svh] max-w-6xl flex-col justify-center px-6 pb-24 pt-28 sm:px-10">
            <motion.p
              className="text-sm uppercase tracking-[0.28em] text-[var(--ink-faint)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...calm, delay: 0.2 }}
            >
              A live brainstorm whiteboard
            </motion.p>
            <motion.h1
              className={`sky-display mt-4 text-[clamp(4.5rem,17vw,11rem)] font-normal leading-[0.9] tracking-[-0.02em]`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...calm, duration: 2.4, delay: 0.35 }}
            >
              Imagine
            </motion.h1>
            <motion.p
              className={`sky-display mt-6 max-w-2xl text-[clamp(1.6rem,4.2vw,2.5rem)] italic leading-tight text-[var(--ink-soft)]`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...calm, duration: 2.2, delay: 0.8 }}
            >
              A whiteboard that keeps up with your team&rsquo;s imagination.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...calm, duration: 2, delay: 1.3 }}
            >
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--ink-soft)]">
                Think out loud together. Imagine listens, sketches the idea as it takes shape, and quietly redraws it
                when the room changes its mind.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link href="/" className={`sky-link sky-primary rounded-full px-7 py-3.5 text-base font-medium`}>
                  Open the board
                </Link>
                <Link
                  href="/"
                  aria-describedby="demo-note"
                  className={`sky-link sky-secondary rounded-full px-7 py-3.5 text-base font-medium`}
                >
                  Try it live
                </Link>
              </div>
              <p id="demo-note" className="mt-4 max-w-md text-sm text-[var(--ink-faint)]">
                On the board, press <span className="font-medium text-[var(--ink-soft)]">Start mic</span> and start
                talking. The board draws as you go.
              </p>
            </motion.div>
          </section>

          {/* How it works */}
          <section aria-labelledby="how" className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
            <h2 id="how" className={`sky-display text-[clamp(2.4rem,6vw,3.75rem)] font-normal leading-none`}>
              How it works
            </h2>
            <p className="mt-4 max-w-lg text-[var(--ink-soft)]">Four quiet steps, running while you talk.</p>
            <ol className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {STEPS.map((step, i) => (
                <motion.li
                  key={step.name}
                  className={i % 2 ? "lg:mt-16" : ""}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "0px 0px -15% 0px" }}
                  transition={{ ...calm, duration: 2, delay: i * 0.25 }}
                >
                  <div
                    className={`sky-float sky-card rounded-[2.25rem] px-7 pb-8 pt-7`}
                    style={{ "--float": `${10 + i * 1.7}s`, "--delay": `${-i * 2.3}s` } as CSSProperties}
                  >
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]">0{i + 1}</p>
                    <h3 className={`sky-display mt-3 text-4xl font-medium`}>{step.name}</h3>
                    <p className="mt-3 leading-relaxed text-[var(--ink-soft)]">{step.text}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
            <p className="mt-10 text-sm text-[var(--ink-faint)]">
              In the demo, the internal wiki is fictional seeded data.
            </p>
          </section>

          {/* Supersede */}
          <section aria-labelledby="change" className="mx-auto grid max-w-6xl gap-14 px-6 py-24 sm:px-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <h2 id="change" className={`sky-display text-[clamp(2.4rem,6vw,3.75rem)] font-normal leading-[1.02]`}>
                Ideas change.
                <br />
                <em className="text-[var(--rose)]">The board remembers.</em>
              </h2>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-[var(--ink-soft)]">
                Most notes only grow. When your team changes its mind, Imagine replaces the old idea instead of piling
                the new one beside it, and keeps what it replaced, with who said it and when.
              </p>
            </div>

            <motion.div
              className="relative"
              initial="before"
              whileInView="after"
              viewport={{ once: true, margin: "0px 0px -20% 0px" }}
            >
              <motion.div
                className={`sky-card max-w-sm rounded-[1.75rem] px-6 py-5`}
                variants={{ before: { opacity: 1 }, after: { opacity: 0.62 } }}
                transition={{ ...calm, delay: 1.6 }}
              >
                <p className="text-xs text-[var(--ink-faint)]">Dev · 2:04 pm</p>
                <p className="relative mt-1 inline-block text-lg font-medium">
                  Hire two more sales reps
                  <motion.span
                    aria-hidden="true"
                    className="absolute left-0 right-0 top-1/2 h-px origin-left bg-current"
                    variants={{ before: { scaleX: 0 }, after: { scaleX: 1 } }}
                    transition={{ ...calm, duration: 1.4, delay: 1 }}
                  />
                </p>
              </motion.div>

              <motion.div
                className={`sky-card relative -mt-3 ml-auto max-w-sm rounded-[1.75rem] px-6 py-5 sm:-mt-2 sm:mr-4`}
                variants={{ before: { opacity: 0, y: 20 }, after: { opacity: 1, y: 0 } }}
                transition={{ ...calm, duration: 2, delay: 2.4 }}
              >
                <p className="text-lg font-medium">Self-serve onboarding flow</p>
                <p className="mt-1 text-sm italic leading-snug text-[var(--ink-soft)]">
                  &ldquo;Instead of hiring sales reps, let&rsquo;s build a self-serve onboarding flow.&rdquo;
                </p>
                <p className={`sky-was-line mt-2 text-sm text-[var(--ink-faint)]`}>was: Hire two more sales reps</p>
                <p className="mt-2 text-xs text-[var(--ink-faint)]">Maya · 2:06 pm</p>
              </motion.div>
            </motion.div>
          </section>

          {/* Built with */}
          <section aria-labelledby="built" className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
            <h2 id="built" className="text-xs uppercase tracking-[0.28em] text-[var(--ink-faint)]">
              Built with
            </h2>
            <ul className="mt-6 flex flex-wrap gap-x-10 gap-y-5">
              {BUILT_WITH.map(([name, role]) => (
                <li key={name}>
                  <span className={`sky-display text-2xl`}>{name}</span>
                  <span className="block text-sm text-[var(--ink-faint)]">{role}</span>
                </li>
              ))}
            </ul>
          </section>
        </main>

        <footer className="mx-auto flex max-w-6xl flex-wrap items-baseline justify-between gap-4 px-6 pb-14 pt-10 text-sm text-[var(--ink-faint)] sm:px-10">
          <p>
            <span className={`sky-display text-xl text-[var(--ink)]`}>Imagine</span> · made at Daytona HackSprint NYC,
            October 2026
          </p>
          <a
            href="https://github.com/Chimbay/daytona-hackathon"
            className={`sky-link rounded-sm text-[var(--ink-soft)] underline decoration-1 underline-offset-4`}
          >
            Source on GitHub
          </a>
        </footer>
      </SkyShell>
    </div>
  );
}
