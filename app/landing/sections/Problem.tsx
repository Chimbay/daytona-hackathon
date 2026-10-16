import { Reveal } from "./Reveal";
import { eyebrow, heading, sectionClass, surface } from "./styles";

const points = [
  { title: "Ideas slip away", body: "Five people talk at once. Notes catch a fraction of it, and nobody is sure who said what." },
  { title: "The board can't keep up", body: "A whiteboard only grows. Ideas the group dropped ten minutes ago sit next to the ones it kept." },
  { title: "The best idea gets buried", body: "The idea the meeting ends on lands under the ones it replaced. By Monday, no one remembers which won." },
];

export function Problem({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="problem-title" className={`${sectionClass} ${className}`}>
      <Reveal>
        <p className={eyebrow}>The problem</p>
        <h2 id="problem-title" className={heading}>Good ideas drift off in a group brainstorm.</h2>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed opacity-85">
          Thinking together is fast. Writing it down is slow. Halfway through, the group changes its mind, and the record stops matching the room.
        </p>
      </Reveal>
      <ul className="mt-12 grid gap-4 sm:grid-cols-3">
        {points.map((p, i) => (
          <li key={p.title}>
            <Reveal delay={0.08 * i} className={`${surface} h-full p-6`}>
              <h3 className="text-lg font-medium">{p.title}</h3>
              <p className="mt-2 leading-relaxed opacity-85">{p.body}</p>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
