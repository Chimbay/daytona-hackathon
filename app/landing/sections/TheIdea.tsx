import { Reveal } from "./Reveal";
import { eyebrow, heading, sectionClass, surface } from "./styles";

export function TheIdea({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="idea-title" className={`${sectionClass} ${className}`}>
      <div className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
        <Reveal>
          <p className={eyebrow}>The idea</p>
          <h2 id="idea-title" className={heading}>A board that listens, and redraws itself as you think.</h2>
          <p className="mt-4 text-lg leading-relaxed opacity-85">
            Imagine hears the conversation and keeps a small map of ideas in step with it. When the group changes its mind, the new idea takes the old one&apos;s place. It is superseded, not appended.
          </p>
          <p className="mt-4 leading-relaxed opacity-85">
            The old idea is not lost. It stays on the card as a quiet trail, so you can see where the group started and where it landed.
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <figure className={`${surface} p-5 sm:p-6`}>
            <figcaption className="text-xs font-medium uppercase tracking-[0.2em] opacity-80">On the board</figcaption>
            <div className="mt-4 rounded-2xl bg-white/60 p-4 shadow-sm ring-1 ring-current/10 dark:bg-white/[0.08]">
              <p className="text-base font-medium">30-day team trial</p>
              <p className="mt-1 text-sm italic opacity-85">“Actually, a trial for the whole team converts better.”</p>
              <p className="mt-2 text-sm line-through decoration-current/50 opacity-75">was: Free tier</p>
              <p className="mt-2 text-sm opacity-80">Priya</p>
            </div>
            <p className="mt-4 text-sm leading-relaxed opacity-85">
              One card, one current idea. What it replaced rides along underneath.
            </p>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
