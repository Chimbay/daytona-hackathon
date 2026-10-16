import { Reveal } from "./Reveal";
import { eyebrow, heading, sectionClass, surface } from "./styles";

const versions = [
  { time: "2:04 PM", label: "Hire two more sales reps", who: "Maya", quote: "We need more people closing deals.", agent: "board-agent", old: true },
  { time: "2:07 PM", label: "Self-serve onboarding", who: "Sam", quote: "Let's build self-serve instead. It scales better than people.", agent: "board-agent", old: false },
  { time: "2:09 PM", label: "Q3 revenue $4.2M, 18% over plan", who: "internal wiki · /finance/q3.html", quote: null, agent: "research-agent", old: false },
];

export function Memory({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="memory-title" className={`${sectionClass} ${className}`}>
      <div className="grid gap-10 md:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <p className={eyebrow}>Memory</p>
          <h2 id="memory-title" className={heading}>It remembers how you got here.</h2>
          <p className="mt-4 text-lg leading-relaxed opacity-85">
            Every version of every idea lives in SurrealDB Agent Memory: what it said, who said it, the quote, and when.
          </p>
          <p className="mt-4 leading-relaxed opacity-85">
            The board agent and the research agent write to the same memory, each tagged with its name. Click any card to see its history.
          </p>
        </Reveal>

        <Reveal delay={0.12} className={`${surface} p-5 sm:p-6`}>
          <h3 className="text-xs font-medium uppercase tracking-[0.2em] opacity-80">In Agent Memory</h3>
          <ol className="mt-4 border-l border-current/25 pl-5">
            {versions.map((v) => (
              <li key={v.time} className="relative pb-6 last:pb-0">
                <span aria-hidden className="absolute -left-[26px] top-1.5 size-2.5 rounded-full bg-current opacity-60" />
                <p className="text-xs opacity-80">
                  <time>{v.time}</time> · {v.agent}
                  {v.old && " · superseded"}
                </p>
                <p className={`mt-1 font-medium ${v.old ? "line-through decoration-current/50 opacity-80" : ""}`}>{v.label}</p>
                {v.quote && <p className="mt-1 text-sm italic opacity-85">“{v.quote}”</p>}
                <p className="mt-1 text-sm opacity-80">{v.who}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
