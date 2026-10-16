import { Reveal } from "./Reveal";
import { eyebrow, heading, sectionClass, surface } from "./styles";

const tools = [
  ["Vercel", "Hosts the Next.js board and every API route: speech token, board brain, research, memory."],
  ["ElevenLabs Scribe", "Realtime speech-to-text from the browser mic. It has no speaker labels, so the presenter taps who is talking."],
  ["AWS Bedrock (Claude)", "Claude turns each transcript chunk into board edits and flags questions that need research. A second Claude call writes the fact."],
  ["Daytona", "A fresh sandbox per question, deleted after. The Anchor key is a Daytona secret the sandbox sees only as a placeholder. Egress is not domain-restricted on our tier."],
  ["Anchor Browser", "A cloud browser, driven from the sandbox, reads a fictional internal wiki. No login in this build."],
  ["SurrealDB Agent Memory", "Ideas and facts with time, speaker, quote or source. New ideas supersede old ones, and both agents share it."],
  ["Arize AX", "Traces every model call. An eval scores the board: on a held-out brainstorm, 6 of 7 steps pass, 0 of 5 ideas missed, 1 invented."],
] as const;

export function BuiltWith({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="built-title" className={`${sectionClass} ${className}`}>
      <Reveal>
        <p className={eyebrow}>Built with</p>
        <h2 id="built-title" className={heading}>One tool for each part of the job.</h2>
      </Reveal>
      <Reveal delay={0.1} className={`${surface} mt-10 px-5 sm:px-8`}>
        <dl className="divide-y divide-current/15">
          {tools.map(([name, use]) => (
            <div key={name} className="grid gap-1 py-5 sm:grid-cols-[13rem_1fr] sm:gap-6">
              <dt className="font-medium">{name}</dt>
              <dd className="leading-relaxed opacity-85">{use}</dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </section>
  );
}
