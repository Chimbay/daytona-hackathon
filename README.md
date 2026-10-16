# Imaginar

A whiteboard that listens to a group brainstorm and keeps redrawing itself to match where the conversation is now. When the group changes its mind, the old idea is **superseded**, not appended. When someone asks a question that needs internal data ("What was our Q3 revenue?"), a research agent reads the team's wiki from an ephemeral Daytona sandbox through an Anchor cloud browser and pins the answer to the board with its source.

Built at the Daytona HackSprint NYC, October 2026. **Live:** https://imagine-lac-xi.vercel.app (landing page) · board at https://imagine-lac-xi.vercel.app/board

> No demo GIF yet. To see the demo, open the live site, open **Fallbacks**, and press **Play demo clip**.

## How it works

```
mic ──WS──> ElevenLabs Scribe realtime ──chunk──> /api/board ──> Bedrock Claude Sonnet ──edits──> board redraws (dagre + Motion)
                                                       │                 │                              ▲
                                                       │                 └─ research flag ──> /api/research   click card: /api/history
                                                       ▼                                         │             │
                                            SurrealDB Agent Memory <── fact + source ────────────┤             │
                                                       └─────────────────────────────────────────┼─────────────┘
                                                                                                 ▼
                     Daytona ephemeral sandbox (Anchor key = secret placeholder) ──CDP──> Anchor browser ──> internal wiki
                     page text leaves ──> Bedrock Claude Haiku picks page + writes fact (outside the sandbox); sandbox deleted

                     every Bedrock call + research span ──> Arize AX (OpenInference)
```

- **Ears: ElevenLabs Scribe realtime.** The browser streams the mic over a WebSocket using a single-use token from `/api/stt-token`. Realtime STT has no speaker labels, so the presenter picks the current speaker in the UI.
- **Brain: AWS Bedrock (Claude Sonnet).** Each transcript chunk plus the current board becomes JSON-schema-constrained edits (`add`, `update`, `supersede`, `remove`, `link`), plus an optional research flag.
- **Board.** The board is a graph, not pixels. dagre lays it out, and Motion animates nodes and edges to their new positions. Cards show their quote and speaker, superseded ideas show as a "was: …" trail, and question cards pulse while research runs.
- **Secure research: Daytona + Anchor Browser + Claude Haiku.** One ephemeral sandbox per question. The Anchor API key is a Daytona secret: the sandbox sees only a placeholder, and the real key is substituted only on requests to `api.anchorbrowser.io`. The sandboxed browser reads the wiki pages, and only their text leaves. Outside the sandbox, Claude Haiku 4.5 picks the page and writes a short fact; keyword match is the fallback. The source URL is always a page the browser actually read. The sandbox is then deleted. Per-sandbox egress allowlists are not available on our Daytona tier, so sandbox network access is not domain-restricted in this build. Anchor rate-limits back-to-back session creation, so space out research questions.
- **Memory: SurrealDB Agent Memory.** Both agents write timestamped ideas and facts with provenance (quote and speaker, or source URL) and the agent that added them. Supersedes are `superseded_by` relations. Click a card to see its full history from memory.
- **Observability: Arize AX.** OpenInference tracing of every Bedrock call plus board and research spans, in project `brainstorm-board`. `npm run eval` scores the model against a scripted brainstorm.

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
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` (if temporary), `AWS_REGION` (default `us-west-2`) | Bedrock Claude (`lib/brain.ts`, `lib/research.ts`) |
| `BOARD_MODEL` (optional, default `us.anthropic.claude-sonnet-5-5`) | Board-edit model |
| `RESEARCH_MODEL` (optional, default `us.anthropic.claude-haiku-4-5-20251001-v1:0`) | Research page-pick and fact model |
| `ELEVENLABS_API_KEY` | `/api/stt-token` |
| `DAYTONA_API_KEY`, `DAYTONA_API_URL` | Research sandbox and wiki host |
| `ANCHOR_API_KEY` | Stored once as a Daytona secret. Never passed into the sandbox in plain form. |
| `WIKI_URL` | Printed by `wiki/launch.mts` |
| `SPECTRON_URL`, `SPECTRON_ID`, `SPECTRON_API_KEY` | SurrealDB Agent Memory (formerly "Spectron") |
| `ARIZE_SPACE_ID`, `ARIZE_API_KEY` (falls back to `arize_api`) | Arize AX tracing. Tracing is off if either is missing. |
| `ARIZE_PROJECT_NAME` (optional, default `brainstorm-board`) | Arize project |
| `AX` (optional, path to the `ax` CLI) | Lets `npm run eval` upload the experiment to Arize |

Launch the fake internal wiki in its own public Daytona sandbox, then put the printed `WIKI_URL` in `.env.local`:

```bash
node --env-file=.env.local wiki/launch.mts
```

Tests and evals:

```bash
npm test        # pure board, brain-validation, memory, research and STT logic + research agent self-test
npm run eval            # demoScript (few-shot, optimistic)
npm run eval -- clip    # clipScript (held-out, the demo clip)
```

`demoScript` is also the prompt's few-shot set, so its score is optimistic. `clipScript` is held out; latest run: 6 of 7 steps pass, 0 of 5 ideas missed, 1 invented (an extra "Can we afford all this?" question), supersede and research flags 100%.

### Demo without a microphone

Open the **Fallbacks** panel in the sidebar:

- **Play demo clip** plays `public/demo/brainstorm.wav`, a 53-second, three-voice brainstorm (transcript in `public/demo/brainstorm.txt`), and transcribes it through the same ElevenLabs path as the mic.
- **Play recorded clip** does the same with any audio file you choose.
- **Scripted line** steps through the scripted brainstorm in `lib/demo-script.ts` with no network calls.

## Project structure

```
app/
  page.tsx                   landing page (re-exports landing/sky/SkyLanding.tsx)
  landing/sky/               drifting-sky landing page
  landing/sections/          problem / ask-safely / memory explainer sections used by the landing page
  board/page.tsx             presenter screen: mic + level meter, live captions, speaker picker, fallbacks
  components/MicMeter.tsx    live mic input level
  components/Board.tsx       animated board (Motion); click a card for its history
  components/HistoryPanel.tsx  idea history loaded from Agent Memory
  api/stt-token/             mint single-use ElevenLabs realtime token
  api/board/                 transcript chunk + board -> Claude -> edits (+ memory write)
  api/research/              Daytona sandbox + Anchor -> page text -> Haiku -> {fact, source} (+ memory write)
  api/memory/                persist edits to Agent Memory
  api/history/               idea supersede chains from Agent Memory
instrumentation.ts           registers Arize tracing on the Node runtime
lib/
  board.ts                   graph model + applyEdits (supersede, link, ...)
  layout.ts                  dagre layout -> positions and SVG edge paths
  brain.ts                   Bedrock Claude prompt, output schema, validation
  research.ts                Haiku page pick + fact; source must be a page that was read
  memory.ts                  edits -> Agent Memory triples; history chains
  otel.ts, tracing.ts        Arize AX exporter + OpenInference spans
  scribe.ts, useTranscript.ts  ElevenLabs realtime plumbing (mic + clip replay)
  demo-script.ts             demoScript (few-shot, offline demo, eval) + clipScript (held-out, matches the clip)
research/agent.mjs           zero-dependency agent that runs inside the Daytona sandbox
wiki/                        fictional "Acme" internal wiki + launcher
public/demo/                 recorded demo clip + transcript
scripts/
  eval-board.ts              npm run eval
  make-demo-clip.sh          regenerate the demo clip (macOS say)
  stt-smoke.ts               stream a WAV through Scribe from Node
```

See [DEVPOST.md](DEVPOST.md) for the full write-up and [PITCH.md](PITCH.md) for the pitch and demo plan.
