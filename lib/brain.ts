import { AnthropicBedrock } from "@anthropic-ai/bedrock-sdk";
import type { Board, BoardNode, Edit } from "./board.ts";
import { demoScript } from "./demo-script.ts";
import { setOutput, withSpan } from "./tracing.ts";

export type Chunk = { speaker?: string; text: string };
export type Research = { question: string; nodeId: string };
export type BrainResult = { edits: Edit[]; research?: Research };

const MODEL = process.env.BOARD_MODEL ?? "us.anthropic.claude-sonnet-5-5"; // haiku-5-5 is 403 (marketplace) on the lab account
const client = new AnthropicBedrock({ awsRegion: process.env.AWS_REGION ?? "us-west-2" });

// Few-shot: the scripted demo, line by line (minus the research-agent line, which isn't speech).
const examples = demoScript
  .filter((s) => s.speaker !== "Board")
  .map((s) => `${s.speaker}: "${s.text}"\n→ ${JSON.stringify({ edits: s.edits })}`)
  .join("\n\n");

const SYSTEM = `You maintain a live whiteboard for a group brainstorming out loud. The board is a small graph: nodes are ideas, questions and facts; edges relate them.
Each turn you get the current board and one new transcript chunk. Return the edits that make the board match where the group's thinking is NOW.

Rules:
- When the group changes its mind about an existing idea (replaces, narrows, reverses it), use "supersede" on that idea's id with the new idea. Never add the replacement alongside the old one. Superseded ideas keep their history; the new one inherits their links.
- Refining wording of the same idea: "update". Explicitly dropping an idea: "remove".
- Reuse existing node ids exactly. New ids are short kebab-case and must not collide with any existing id.
- Labels are short: 2-6 words, like a sticky note.
- Every new idea/question carries provenance: "speaker" (the chunk's speaker) and "quote" (the exact words from the chunk that support it).
- Link new nodes to the idea they relate to ("link" from parent to child).
- Chit-chat, filler or repetition: return no edits.
- If someone asks a question that needs the team's internal/company data (revenue, metrics, customers, internal docs, plans), add it as a "question" node and set "research" to { question, nodeId } with that node's id. General-knowledge or rhetorical questions get no research.
- Facts are only added by the research agent, never by you.

Examples (one chunk each, board state carries over):

${examples}`;

const nodeSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    label: { type: "string" },
    kind: { type: "string", enum: ["idea", "question", "fact"] },
    speaker: { type: "string" },
    quote: { type: "string" },
  },
  required: ["id", "label", "kind"],
  additionalProperties: false,
};
const op = (name: string, props: Record<string, unknown>) => ({
  type: "object",
  properties: { op: { type: "string", enum: [name] }, ...props },
  required: ["op", ...Object.keys(props).filter((k) => k !== "label" || name === "update")],
  additionalProperties: false,
});
const str = { type: "string" };

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    edits: {
      type: "array",
      items: {
        anyOf: [
          op("add", { node: nodeSchema }),
          op("update", { id: str, label: str }),
          op("supersede", { id: str, node: nodeSchema }),
          op("remove", { id: str }),
          op("link", { from: str, to: str, label: str }),
        ],
      },
    },
    research: {
      type: "object",
      properties: { question: str, nodeId: str },
      required: ["question", "nodeId"],
      additionalProperties: false,
    },
  },
  required: ["edits"],
  additionalProperties: false,
};

export function boardEdits(board: Board, chunk: Chunk): Promise<BrainResult> {
  return withSpan("board-edits", "CHAIN", chunk, async (span) => {
    span.setAttributes({ "board.speaker": chunk.speaker ?? "", "board.chunk": chunk.text, "board.nodes": board.nodes.length });
    const result = await callModel(board, chunk);
    setOutput(span, result, {
      "board.edit_count": result.edits.length,
      "board.edit_ops": result.edits.map((e) => e.op).join(","),
      "board.research_flagged": !!result.research,
      ...(result.research && { "board.research_question": result.research.question }),
    });
    return result;
  });
}

async function callModel(board: Board, chunk: Chunk): Promise<BrainResult> {
  const live = board.nodes.filter((n) => !n.supersededBy).map(({ id, label, kind }) => ({ id, label, kind }));
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    thinking: { type: "between_tools" }, // thinking off: latency matters more than depth here
    output_config: { effort: "low", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Board: ${JSON.stringify({ nodes: live, edges: board.edges })}\n\n${chunk.speaker ?? "Someone"}: "${chunk.text}"`,
      },
    ],
  });
  const text = res.content.find((b) => b.type === "text")?.text;
  if (!text) return { edits: [] };
  return validate(JSON.parse(text));
}

// Trust boundary: keep only well-formed edits; applyEdits handles unknown ids.
const s = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const KINDS = ["idea", "question", "fact"];

function node(v: unknown): Omit<BoardNode, "createdAt" | "supersededBy"> | null {
  if (!v || typeof v !== "object") return null;
  const n = v as Record<string, unknown>;
  if (!s(n.id) || !s(n.label) || !KINDS.includes(n.kind as string)) return null;
  return {
    id: n.id,
    label: n.label,
    kind: n.kind as BoardNode["kind"],
    ...(s(n.speaker) && { speaker: n.speaker }),
    ...(s(n.quote) && { quote: n.quote }),
  };
}

export function validate(raw: unknown): BrainResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const edits: Edit[] = [];
  for (const e of Array.isArray(r.edits) ? r.edits : []) {
    if (!e || typeof e !== "object") continue;
    const x = e as Record<string, unknown>;
    const n = node(x.node);
    if (x.op === "add" && n) edits.push({ op: "add", node: n });
    else if (x.op === "supersede" && s(x.id) && n) edits.push({ op: "supersede", id: x.id, node: n });
    else if (x.op === "update" && s(x.id) && s(x.label)) edits.push({ op: "update", id: x.id, label: x.label });
    else if (x.op === "remove" && s(x.id)) edits.push({ op: "remove", id: x.id });
    else if (x.op === "link" && s(x.from) && s(x.to))
      edits.push({ op: "link", from: x.from, to: x.to, ...(s(x.label) && { label: x.label }) });
  }
  const q = r.research as Record<string, unknown> | undefined;
  const research = q && s(q.question) && s(q.nodeId) ? { question: q.question, nodeId: q.nodeId } : undefined;
  return { edits, research };
}
