import { Reveal } from "./Reveal";
import { eyebrow, heading, sectionClass, surface } from "./styles";

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="rounded-2xl bg-white/50 p-4 ring-1 ring-current/10 dark:bg-white/[0.07]">
      <p className="text-xs font-medium tracking-widest opacity-80">STEP {n}</p>
      <h3 className="mt-1 font-medium">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed opacity-85">{body}</p>
    </li>
  );
}

export function AskSafely({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="ask-title" className={`${sectionClass} ${className}`}>
      <Reveal>
        <p className={eyebrow}>Ask anything, safely</p>
        <h2 id="ask-title" className={heading}>“How does our Q3 look?”</h2>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed opacity-85">
          Some questions need the team&apos;s own data. Imagine looks it up in a throwaway sandbox and pins the answer to the board with its source.
        </p>
      </Reveal>

      <Reveal delay={0.1} className={`${surface} mt-12 p-4 sm:p-6`}>
        <ol className="grid gap-3">
          <Step n={1} title="Claude notices" body="Claude on AWS Bedrock hears a question that needs internal data and flags it for research." />
          <li className="rounded-2xl border border-dashed border-current/40 p-3 sm:p-4">
            <p className="px-1 text-xs font-medium uppercase tracking-[0.2em] opacity-80">Inside a fresh Daytona sandbox</p>
            <ol className="mt-3 grid gap-3 sm:grid-cols-2">
              <Step n={2} title="A sandbox for this one question" body="Created on demand. The Anchor key is a Daytona secret: the sandbox only ever sees a placeholder." />
              <Step n={3} title="Anchor Browser reads the wiki" body="A cloud browser opens the team's internal wiki and reads its pages. In this build the wiki is fictional, with no login." />
            </ol>
          </li>
          <Step n={4} title="Only the fact leaves" body="Page text comes out. Claude writes one short fact, linked to a page the browser actually read." />
          <Step n={5} title="Pinned, then gone" body="“Q3 revenue $4.2M, 18% over plan” lands on the board with its source. The sandbox is deleted." />
        </ol>
      </Reveal>
    </section>
  );
}
