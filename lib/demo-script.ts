import type { Edit } from "./board";

// Scripted brainstorm with the edits Claude should produce per line.
// Drives the offline demo now; later the eval set (expected board per transcript chunk).
// `activate`: a presenter click on a card behind a stack (switch branch), not something said.
export type Step = { speaker: string; text: string; edits: Edit[]; activate?: string };

export const demoScript: Step[] = [
  {
    speaker: "Maya",
    text: "So the goal today: how do we get more teams onto the product?",
    edits: [{ op: "add", node: { id: "goal", label: "Grow team adoption", kind: "idea", speaker: "Maya", quote: "how do we get more teams onto the product?" } }],
  },
  {
    speaker: "Dev",
    text: "What if we do a free tier for small teams?",
    edits: [
      { op: "add", node: { id: "free-tier", label: "Free tier for small teams", kind: "idea", speaker: "Dev", quote: "What if we do a free tier for small teams?" } },
      { op: "link", from: "goal", to: "free-tier" },
    ],
  },
  {
    speaker: "Sam",
    text: "Or a Slack integration, that's where teams already live.",
    edits: [
      { op: "add", node: { id: "slack", label: "Slack integration", kind: "idea", speaker: "Sam", quote: "a Slack integration, that's where teams already live" } },
      { op: "link", from: "goal", to: "slack" },
    ],
  },
  {
    speaker: "Maya",
    text: "Free forever is expensive. Make it a 30-day team trial instead.",
    edits: [{ op: "supersede", id: "free-tier", node: { id: "trial", label: "30-day team trial", kind: "idea", speaker: "Maya", quote: "Make it a 30-day team trial instead." } }],
  },
  {
    speaker: "Dev",
    text: "Can we afford that? How does our Q3 look?",
    edits: [
      { op: "add", node: { id: "q-q3", label: "How does Q3 look?", kind: "question", speaker: "Dev", quote: "How does our Q3 look?" } },
      { op: "link", from: "trial", to: "q-q3" },
    ],
  },
  {
    speaker: "Board",
    text: "(research agent) Q3 revenue $4.2M, 18% over plan.",
    edits: [
      { op: "add", node: { id: "fact-q3", label: "Q3 revenue $4.2M, 18% over plan", kind: "fact", source: "https://wiki.example.com/finance/q3" } },
      { op: "link", from: "q-q3", to: "fact-q3" },
    ],
  },
  {
    speaker: "Sam",
    text: "Then the trial ships with the Slack app as the onboarding path.",
    edits: [
      { op: "link", from: "trial", to: "slack", label: "onboards via" },
      { op: "update", id: "slack", label: "Slack app as trial onboarding" },
    ],
  },
];

// The recorded fallback clip (public/demo/brainstorm.wav, text in public/demo/brainstorm.txt;
// regenerate with scripts/make-demo-clip.sh). Different topic from demoScript, which is Claude's
// few-shot, so this one works as a held-out eval. Realtime STT has no speaker labels, so live runs
// attribute every line to the selected speaker.
export const clipScript: Step[] = [
  {
    speaker: "Maya",
    text: "Okay team, the goal for today is simple. How do we double our sign-ups next quarter?",
    edits: [{ op: "add", node: { id: "goal", label: "Double sign-ups next quarter", kind: "idea", speaker: "Maya", quote: "How do we double our sign-ups next quarter?" } }],
  },
  {
    speaker: "Dev",
    text: "One idea. We hire two more sales reps to go after bigger accounts.",
    edits: [
      { op: "add", node: { id: "sales-reps", label: "Hire two more sales reps", kind: "idea", speaker: "Dev", quote: "We hire two more sales reps to go after bigger accounts." } },
      { op: "link", from: "goal", to: "sales-reps" },
    ],
  },
  {
    speaker: "Sam",
    text: "Another idea. A referral program, where every user gets a free month for each friend they invite.",
    edits: [
      { op: "add", node: { id: "referral", label: "Referral program: free month", kind: "idea", speaker: "Sam", quote: "every user gets a free month for each friend they invite" } },
      { op: "link", from: "goal", to: "referral" },
    ],
  },
  {
    speaker: "Maya",
    text: "Actually, instead of hiring sales reps, let's build a self-serve onboarding flow. It scales much better than people.",
    edits: [{ op: "supersede", id: "sales-reps", node: { id: "self-serve", label: "Self-serve onboarding flow", kind: "idea", speaker: "Maya", quote: "instead of hiring sales reps, let's build a self-serve onboarding flow" } }],
  },
  {
    speaker: "Dev",
    text: "Nice. And the referral program should send new users straight into that onboarding flow.",
    edits: [{ op: "link", from: "referral", to: "self-serve", label: "sends users into" }],
  },
  {
    speaker: "Sam",
    text: "But can we afford all of this? What was our Q3 revenue?",
    edits: [
      { op: "add", node: { id: "q-q3", label: "What was Q3 revenue?", kind: "question", speaker: "Sam", quote: "What was our Q3 revenue?" } },
      { op: "link", from: "goal", to: "q-q3" },
    ],
  },
  {
    speaker: "Board",
    text: "(research agent) Q3 revenue $4.2M, 18% over plan.",
    edits: [
      { op: "add", node: { id: "fact-q3", label: "Q3 revenue $4.2M, 18% over plan", kind: "fact", source: "https://wiki.example.com/finance/q3.html" } },
      { op: "link", from: "q-q3", to: "fact-q3" },
    ],
  },
  {
    speaker: "Maya",
    text: "Good question. Let's check the numbers, then ship self-serve onboarding first.",
    edits: [{ op: "update", id: "self-serve", label: "Ship self-serve onboarding first" }],
  },
];

const say = (speaker: string, text: string, edits: Edit[]): Step => ({ speaker, text, edits });
const idea = (id: string, label: string, speaker: string, quote: string) => ({ id, label, kind: "idea" as const, speaker, quote });

// Mini demo of the branching board: stacked versions, a floating idea that joins later,
// the room building on a hidden branch (+N count), and the presenter switching branches.
export const branchScript: Step[] = [
  say("Maya", "How do we get more teams onto the product?", [
    { op: "add", node: idea("goal", "Grow team adoption", "Maya", "How do we get more teams onto the product?") },
  ]),
  say("Dev", "What if we do a free tier for small teams?", [
    { op: "add", node: idea("free-tier", "Free tier for small teams", "Dev", "a free tier for small teams") },
    { op: "link", from: "goal", to: "free-tier" },
  ]),
  say("Sam", "Random thought, our docs site is painfully slow.", [
    { op: "add", node: idea("docs", "Speed up the docs site", "Sam", "our docs site is painfully slow") },
  ]),
  say("Maya", "Actually, scrap the free tier. Make it a 30-day team trial.", [
    { op: "supersede", id: "free-tier", node: idea("trial", "30-day team trial", "Maya", "Make it a 30-day team trial.") },
  ]),
  say("Dev", "The trial should walk teams through Slack setup.", [
    { op: "add", node: idea("slack", "Guided Slack setup", "Dev", "walk teams through Slack setup") },
    { op: "link", from: "trial", to: "slack" },
  ]),
  { speaker: "Presenter", text: "Clicks the OLD free tier card to revisit it.", edits: [], activate: "free-tier" },
  say("Sam", "Free tier could cap at five seats.", [
    { op: "add", node: idea("seats", "Cap at five seats", "Sam", "cap at five seats") },
    { op: "link", from: "free-tier", to: "seats" },
  ]),
  say("Dev", "And for the trial, two weeks is probably enough.", [
    { op: "add", node: idea("two-weeks", "Two weeks is enough", "Dev", "two weeks is probably enough") },
    { op: "link", from: "trial", to: "two-weeks" },
  ]),
  say("Maya", "Faster docs would help teams onboard on their own.", [
    { op: "link", from: "goal", to: "docs", label: "self-onboarding" },
  ]),
  { speaker: "Presenter", text: "Clicks the trial branch to go back.", edits: [], activate: "trial" },
];
