import type { Edit } from "@/lib/board";

// The hero's own little brainstorm, in the same edit format Claude returns to the real board.
export type Line = { speaker: string; text: string; edits: Edit[] };

export const heroScript: Line[] = [
  {
    speaker: "Maya",
    text: "So the goal today: how do we get more teams onto the product?",
    edits: [{ op: "add", node: { id: "goal", label: "Grow team adoption", kind: "idea", speaker: "Maya" } }],
  },
  {
    speaker: "Dev",
    text: "What if we do a free tier for small teams?",
    edits: [
      { op: "add", node: { id: "free-tier", label: "Free tier for small teams", kind: "idea", speaker: "Dev" } },
      { op: "link", from: "goal", to: "free-tier" },
    ],
  },
  {
    speaker: "Sam",
    text: "Or a Slack integration, that's where teams already live.",
    edits: [
      { op: "add", node: { id: "slack", label: "Slack integration", kind: "idea", speaker: "Sam" } },
      { op: "link", from: "goal", to: "slack" },
    ],
  },
  {
    speaker: "Maya",
    text: "Actually, instead: free forever is expensive. A 30-day team trial?",
    edits: [{ op: "supersede", id: "free-tier", node: { id: "trial", label: "30-day team trial", kind: "idea", speaker: "Maya" } }],
  },
  {
    speaker: "Dev",
    text: "Can we afford that? How does our Q3 look?",
    edits: [
      { op: "add", node: { id: "q-q3", label: "How does Q3 look?", kind: "question", speaker: "Dev" } },
      { op: "link", from: "trial", to: "q-q3" },
    ],
  },
  {
    speaker: "research agent",
    text: "Q3 revenue $4.2M, 18% over plan.",
    edits: [
      { op: "add", node: { id: "fact-q3", label: "Q3 revenue $4.2M, 18% over plan", kind: "fact", source: "https://wiki.example.com/finance/q3" } },
      { op: "link", from: "q-q3", to: "fact-q3" },
    ],
  },
  {
    speaker: "Sam",
    text: "Then the trial onboards through the Slack app.",
    edits: [
      { op: "link", from: "trial", to: "slack" },
      { op: "update", id: "slack", label: "Slack app as trial onboarding" },
    ],
  },
];
