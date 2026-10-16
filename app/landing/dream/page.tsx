import type { Metadata } from "next";
import Link from "next/link";
import { Figtree, Fredoka } from "next/font/google";
import DreamBoard from "./DreamBoard";
import "./dream.css";

const round = Fredoka({ subsets: ["latin"], variable: "--font-round" });
const quiet = Figtree({ subsets: ["latin"], variable: "--font-quiet" });

export const metadata: Metadata = {
  title: "Imagine — a whiteboard that keeps up with your team",
  description: "A whiteboard that listens to your team brainstorm, redraws itself as ideas change, and pins answers from your internal docs.",
};

const REPO = "https://github.com/Chimbay/daytona-hackathon";

const beats = [
  {
    title: "Listen",
    body: "Talk the way you normally would. Your words stream to ElevenLabs realtime speech-to-text, one phrase at a time, and whoever is presenting taps who is speaking.",
  },
  {
    title: "Redraw",
    body: "Each phrase and the current board go to Claude on AWS Bedrock, which returns small edits: add, link, update, supersede. The board re-lays itself out and drifts into its new shape.",
  },
  {
    title: "Remember",
    body: "Every idea and fact is kept in SurrealDB Agent Memory with when it was said, who said it, and the quote or source behind it. Click a card to replay how it changed.",
  },
  {
    title: "Research",
    body: "When someone asks what only your internal docs know, a fresh Daytona sandbox opens an Anchor cloud browser, reads the wiki, and pins a short answer with its source. The sandbox is deleted afterwards.",
  },
];

const tools = [
  ["Vercel", "hosts the board and its API routes"],
  ["ElevenLabs", "realtime speech-to-text"],
  ["AWS Bedrock", "Claude turns speech into board edits"],
  ["Daytona", "a throwaway sandbox per research question"],
  ["Anchor Browser", "reads the internal wiki"],
  ["SurrealDB", "memory of ideas, quotes and sources"],
  ["Arize", "traces every model call and scores the board"],
];

export default function DreamLanding() {
  return (
    <div className={`dream-page ${round.variable} ${quiet.variable}`}>
      <span className="dream-puff" aria-hidden />
      <span className="dream-puff" aria-hidden />
      <span className="dream-puff" aria-hidden />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-8">
        <span className={`dream-display text-xl font-semibold`}>Imagine</span>
        <a href={REPO} className={`dream-link text-sm`}>
          GitHub
        </a>
      </header>

      <main>
        <section aria-labelledby="hero" className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-8 sm:pt-10">
          <div className="mx-auto max-w-2xl text-center">
            <h1 id="hero" className={`dream-display text-6xl font-medium sm:text-7xl`}>
              Imagine
            </h1>
            <p className={`dream-display mt-4 text-2xl leading-snug sm:text-3xl`}>A whiteboard that keeps up with your team&rsquo;s imagination.</p>
            <p className={`dream-muted mx-auto mt-5 max-w-xl text-base leading-relaxed sm:text-lg`}>
              Think out loud together. The board listens, redraws itself when you change your mind, and quietly looks up the answers you would otherwise chase after the meeting.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/" className="dream-cta">
                Open the board
              </Link>
              <Link href="/" className="dream-ghostLink" aria-describedby="live-note">
                Try it live
              </Link>
            </div>
            <p id="live-note" className={`dream-muted mt-3 text-sm`}>
              On the board, press <strong>Start mic</strong> and start talking.
            </p>
          </div>

          <div className="mt-10 sm:mt-14">
            <DreamBoard />
          </div>
        </section>

        <section aria-labelledby="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <h2 id="how" className={`dream-display text-center text-3xl font-medium sm:text-4xl`}>
            How it works
          </h2>
          <ol className="mt-12 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {beats.map((b, i) => (
              <li key={b.title} className={`dream-panel p-6`}>
                <span className={`dream-beatNum text-sm font-semibold`}>0{i + 1}</span>
                <h3 className={`dream-display mt-1 text-2xl font-medium`}>{b.title}</h3>
                <p className={`dream-muted mt-3 leading-relaxed`}>{b.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="change" className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-8 lg:grid-cols-2">
          <div>
            <h2 id="change" className={`dream-display text-3xl font-medium sm:text-4xl`}>
              Ideas change.
              <br />
              The board remembers.
            </h2>
            <p className={`dream-muted mt-5 max-w-md text-lg leading-relaxed`}>
              Most tools only add. Imagine replaces an idea when the group moves past it, so the board shows where the conversation is now. The old version is kept, with the words that replaced it.
            </p>
          </div>
          <div className={`dream-panel p-6 sm:p-8`}>
            <p className={`dream-muted text-sm`}>Dev</p>
            <p className={`dream-display dream-strike dream-muted text-xl`}>Free tier for small teams</p>
            <p className={`dream-muted mt-1 text-sm italic`}>&ldquo;What if we do a free tier for small teams?&rdquo;</p>
            <div className="my-5 h-px" style={{ background: "var(--line)" }} aria-hidden />
            <p className={`dream-muted text-sm`}>Maya &middot; supersedes the idea above</p>
            <p className={`dream-display text-2xl`}>30-day team trial</p>
            <p className={`dream-muted mt-1 text-sm italic`}>&ldquo;Free forever is expensive. Make it a 30-day team trial instead.&rdquo;</p>
          </div>
        </section>

        <section aria-labelledby="built" className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
          <h2 id="built" className={`dream-muted text-center text-sm font-semibold uppercase tracking-widest`}>
            Built with
          </h2>
          <ul className="mx-auto mt-8 grid max-w-4xl list-none gap-x-8 gap-y-5 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {tools.map(([name, role]) => (
              <li key={name}>
                <span className={`dream-display text-lg`}>{name}</span>
                <span className={`dream-muted block text-sm`}>{role}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 pb-12 pt-10 text-center text-sm sm:px-8">
        <a href={REPO} className="dream-link">
          Source on GitHub
        </a>
        <p className="dream-muted">Made in a day at Daytona HackSprint NYC, October 2026. The internal wiki in the demo is fictional.</p>
      </footer>
    </div>
  );
}
