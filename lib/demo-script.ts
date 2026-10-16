import type { Edit } from "./board";

// Scripted brainstorm with the edits Claude should produce per line.
// Drives the offline demo now; later the eval set (expected board per transcript chunk).
export type Step = { speaker: string; text: string; edits: Edit[] };

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
