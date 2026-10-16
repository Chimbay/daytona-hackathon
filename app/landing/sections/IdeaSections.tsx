import { AskSafely } from "./AskSafely";
import { BuiltWith } from "./BuiltWith";
import { Memory } from "./Memory";
import { Problem } from "./Problem";
import { TheIdea } from "./TheIdea";

export { AskSafely, BuiltWith, Memory, Problem, TheIdea };

export function IdeaSections({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <Problem />
      <TheIdea />
      <AskSafely />
      <Memory />
      <BuiltWith />
    </div>
  );
}
