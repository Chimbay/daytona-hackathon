# Live Brainstorm Whiteboard

A whiteboard that listens to a group brainstorm and keeps redrawing itself to match where the conversation is now. When the group changes its mind, the old idea is **superseded**, not appended. When someone asks a question that needs internal data ("How does our Q3 look?"), a research agent looks it up in an ephemeral Daytona sandbox through an Anchor cloud browser and pins the answer to the board with its source.

Built at the Daytona HackSprint NYC, October 2026.

![Demo](docs/demo.gif)
<!-- TODO: add docs/demo.gif (a 10–15 s screen capture of the trial superseding the free tier and the Q3 fact getting pinned) -->

## How it works

```
mic ──WS──> ElevenLabs Scribe realtime ──chunk──> /api/board ──> Bedrock Claude ──edits──> board redraws (dagre + Motion)
                                                       │                 │
                                                       │                 └─ research flag ──> /api/research
                                                       ▼                                         │
                                            SurrealDB Agent Memory <── fact + source ────────────┤
                                                                                                 ▼
                                    Daytona ephemeral sandbox (Anchor key = secret placeholder) ──CDP──> Anchor browser ──> internal wiki
                                    only {fact, source} leaves; sandbox deleted
```

- **Ears: ElevenLabs Scribe realtime.** The browser streams the mic over a WebSocket using a single-use token from `/api/stt-token`. Realtime STT has no speaker labels, so the presenter picks the current speaker in the UI.
- **Brain: AWS Bedrock (Claude Sonnet).** Each transcript chunk plus the current board becomes JSON-schema-constrained edits (`add`, `update`, `supersede`, `remove`, `link`), plus an optional research flag.
- **Board.** The board is a graph, not pixels. dagre lays it out, Motion animates nodes and edges to their new positions, and superseded ideas show as a "was: …" trail.
- **Secure research: Daytona + Anchor Browser.** One ephemeral sandbox per question. The Anchor API key is a Daytona secret: the sandbox sees only a placeholder, and the real key is substituted only on requests to `api.anchorbrowser.io`. Only `{fact, source}` leaves the sandbox, and the sandbox is deleted afterwards. Per-sandbox egress allowlists are not available on our Daytona tier, so sandbox network access is not domain-restricted in this build.
- **Memory: SurrealDB Agent Memory.** Both agents write timestamped ideas and facts with provenance (quote and speaker, or source URL). Supersedes are `superseded_by` relations, and `/api/history` returns each idea's chain.
- **Observability: Arize AX.** OpenInference tracing of the Claude call and research route, plus evals against the scripted brainstorm. <!-- verify after Arize PR merges -->

The internal wiki in `wiki/` is **fictional seeded data**. It contains no real company information.

## Run locally

Requirements: Node 22 or later, plus accounts for the services below.

```bash
npm install
touch .env.local          # then fill in the variables below
npm run dev               # http://localhost:3000
```

Load the same variables into a shell with `set -a; source .env.local; set +a`. `.env.local` is gitignored. Never commit it.

| Variable | Used by |
|---|---|
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` (if temporary), `AWS_REGION` (default `us-west-2`) | Bedrock Claude (`lib/brain.ts`) |
| `BOARD_MODEL` (optional, default `us.anthropic.claude-sonnet-5-5`) | Bedrock model id |
| `ELEVENLABS_API_KEY` | `/api/stt-token` |
| `DAYTONA_API_KEY`, `DAYTONA_API_URL` | Research sandbox and wiki host |
| `ANCHOR_API_KEY` | Stored once as a Daytona secret. Never passed into the sandbox in plain form. |
| `WIKI_URL` | Printed by `wiki/launch.mts` |
| `SPECTRON_URL`, `SPECTRON_ID`, `SPECTRON_API_KEY` | SurrealDB Agent Memory (formerly "Spectron") |
| `ARIZE_API_KEY`, `ARIZE_SPACE_ID`, `ARIZE_PROJECT_NAME` (optional) | Arize AX tracing <!-- verify after Arize PR merges --> |

Launch the fake internal wiki in its own public Daytona sandbox, then put the printed `WIKI_URL` in `.env.local`:

```bash
node --env-file=.env.local wiki/launch.mts
```

Tests (pure board, brain-validation, memory and STT logic, plus the research agent's self-test):

```bash
npm test
```

### Demo without a microphone

Open the **Fallbacks** panel in the sidebar:

- **Play recorded clip** replays an audio file through the same ElevenLabs path as the mic.
- **Scripted line** steps through the scripted brainstorm in `lib/demo-script.ts` with no network calls.

## Project structure

```
app/
  page.tsx                 presenter screen: mic, speaker picker, fallbacks, transcript
  components/Board.tsx     animated board (Motion)
  api/stt-token/           mint single-use ElevenLabs realtime token
  api/board/               transcript chunk + board -> Claude -> edits (+ memory write)
  api/research/            Daytona sandbox + Anchor -> {fact, source} (+ memory write)
  api/memory/              persist edits to Agent Memory
  api/history/             idea supersede chains from Agent Memory
  dev/stt/                 scratch page for testing STT
lib/
  board.ts                 graph model + applyEdits (supersede, link, ...)
  layout.ts                dagre layout -> positions and SVG edge paths
  brain.ts                 Bedrock Claude prompt, output schema, validation
  memory.ts                edits -> Agent Memory triples; history chains
  scribe.ts, useTranscript.ts  ElevenLabs realtime plumbing (mic + clip replay)
  demo-script.ts           scripted brainstorm: few-shot examples, offline demo, eval set
research/agent.mjs         zero-dependency agent that runs inside the Daytona sandbox
wiki/                      fictional "Acme" internal wiki + launcher
scripts/stt-smoke.ts       stream a WAV through Scribe from Node
```

See [DEVPOST.md](DEVPOST.md) for the full write-up and [PITCH.md](PITCH.md) for the pitch and demo plan.
