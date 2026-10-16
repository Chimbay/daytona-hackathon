// Replays a script from lib/demo-script.ts through boardEdits (the real Bedrock call) and scores each step
// against the scripted edits. Board state is teacher-forced: each step sees the expected board so far,
// so one bad step doesn't cascade and existing ids stay comparable.
// Usage: npm run eval [-- demo|clip]. "clip" (the recorded demo clip) is held out: "demo" is also
// Claude's few-shot in lib/brain.ts, so its score is inflated.
// With AX=<path to ax CLI> it also uploads a dataset + experiment + per-run scores to Arize.
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../lib/otel.ts"; // trace the eval calls too
import { applyEdits, emptyBoard, type Board, type Edit } from "../lib/board.ts";
import { boardEdits, type BrainResult } from "../lib/brain.ts";
import { clipScript, demoScript } from "../lib/demo-script.ts";
import { flushTraces } from "../lib/tracing.ts";

type Score = { missed: number; invented: number; supersede_ok: number; research_ok: number; pass: number };

const newIdeas = (edits: Edit[]) =>
  edits.filter((e) => (e.op === "add" || e.op === "supersede") && e.node.kind !== "fact").map((e) => (e as { node: { kind: string } }).node);
const supersedes = (edits: Edit[]) => edits.flatMap((e) => (e.op === "supersede" ? [e.id] : [])).sort().join(",");

export function score(expected: Edit[], got: BrainResult): Score {
  const exp = newIdeas(expected).length;
  const out = newIdeas(got.edits).length;
  const s = {
    missed: Math.max(0, exp - out),
    invented: Math.max(0, out - exp),
    supersede_ok: Number(supersedes(expected) === supersedes(got.edits)),
    research_ok: Number(newIdeas(expected).some((n) => n.kind === "question") === !!got.research),
  };
  return { ...s, pass: Number(!s.missed && !s.invented && s.supersede_ok && s.research_ok) };
}

// Self-check: the script's own expectations score perfectly; an empty answer misses everything.
const q = demoScript.find((s) => s.edits.some((e) => e.op === "add" && e.node.kind === "question"))!;
assert.deepEqual(score(q.edits, { edits: q.edits, research: { question: q.text, nodeId: "x" } }), { missed: 0, invented: 0, supersede_ok: 1, research_ok: 1, pass: 1 });
assert.equal(score(demoScript[3].edits, { edits: [] }).supersede_ok, 0);

const which = process.argv[2] ?? "demo";
const scripts = { demo: demoScript, clip: clipScript };
if (!(which in scripts)) throw new Error(`unknown script "${which}", expected: ${Object.keys(scripts).join(" | ")}`);
const script = scripts[which as keyof typeof scripts];

const rows: { step: number; speaker: string; text: string; expected: Edit[]; got: BrainResult; score: Score }[] = [];
let board: Board = emptyBoard;
for (const [i, step] of script.entries()) {
  if (step.speaker !== "Board") {
    const got = await boardEdits(board, { speaker: step.speaker, text: step.text });
    rows.push({ step: i, speaker: step.speaker, text: step.text, expected: step.edits, got, score: score(step.edits, got) });
    const r = rows.at(-1)!;
    console.log(`#${i} ${step.speaker}: ${JSON.stringify(r.score)}  got ${r.got.edits.map((e) => e.op).join(",") || "-"}${r.got.research ? " +research" : ""}`);
  }
  board = applyEdits(board, step.edits);
}

const sum = (k: keyof Score) => rows.reduce((a, r) => a + r.score[k], 0);
const expectedIdeas = rows.reduce((a, r) => a + newIdeas(r.expected).length, 0);
const summary = {
  script: which,
  steps: rows.length,
  missed_ideas: `${sum("missed")}/${expectedIdeas}`,
  invented_ideas: sum("invented"),
  supersede_accuracy: sum("supersede_ok") / rows.length,
  research_flag_accuracy: sum("research_ok") / rows.length,
  step_pass_rate: sum("pass") / rows.length,
};
console.log(JSON.stringify(summary, null, 2));
await flushTraces();

const AX = process.env.AX;
const space = process.env.ARIZE_SPACE_ID;
if (AX && space) {
  const dir = mkdtempSync(join(tmpdir(), "eval-board-"));
  const file = (name: string, data: unknown) => (writeFileSync(join(dir, name), JSON.stringify(data)), join(dir, name));
  const ax = (...args: string[]) => execFileSync(AX, [...args, "--space", space], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const json = (s: string) => JSON.parse(s.slice(s.search(/[[{]/)));
  const DATASET = `brainstorm-${which}-script`;
  try {
    ax("datasets", "get", DATASET);
  } catch {
    const examples = rows.map((r) => ({ step: r.step, speaker: r.speaker, text: r.text, expected_edits: JSON.stringify(r.expected) }));
    ax("datasets", "create", "--name", DATASET, "--file", file("examples.json", examples));
  }
  const examples: { id: string; additional_properties: { step: number } }[] = json(ax("datasets", "export", DATASET, "--stdout"));
  const exampleId = new Map(examples.map((e) => [Number(e.additional_properties.step), e.id]));
  const name = `board-edits-${which}-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}`;
  const runs = rows.map((r) => ({ example_id: exampleId.get(r.step), output: JSON.stringify(r.got) }));
  ax("experiments", "create", "--name", name, "--dataset", DATASET, "--file", file("runs.json", runs));

  // One continuous annotation config per metric; "already exists" errors are fine.
  const metrics: [keyof Score, number, string][] = [
    ["missed", 10, "MINIMIZE"],
    ["invented", 10, "MINIMIZE"],
    ["supersede_ok", 1, "MAXIMIZE"],
    ["research_ok", 1, "MAXIMIZE"],
    ["pass", 1, "MAXIMIZE"],
  ];
  for (const [m, max, direction] of metrics) {
    try {
      ax("annotation-configs", "create", "continuous", "--name", `board_${m}`, "--min-score", "0", "--max-score", String(max), "--optimization-direction", direction);
    } catch {}
  }
  const stepOf = new Map([...exampleId].map(([step, id]) => [id, step]));
  const created: { id: string; example_id: string }[] = json(ax("experiments", "export", name, "--dataset", DATASET, "--stdout"));
  const annotations = created.map((run) => {
    const r = rows.find((x) => x.step === stepOf.get(run.example_id))!;
    return { record_id: run.id, values: metrics.map(([m]) => ({ name: `board_${m}`, score: r.score[m] })) };
  });
  ax("experiments", "annotate-runs", name, "--dataset", DATASET, "--file", file("annotations.json", annotations));
  console.log(`Arize experiment "${name}" on dataset "${DATASET}": ${annotations.length} runs scored`);
}
