# Imaginar — Daytona HackSprint NYC (Oct 16 2026)

A whiteboard that listens to a group brainstorming out loud and keeps redrawing itself to match the idea being discussed. When someone asks a question that needs internal data ("how does our Q3 look?"), an agent looks it up in the team's private sources from a locked-down sandbox and pins the answer to the board with its source.

Pitch angle (prior art covers single-speaker "voice → mind map"): the board tracks how a *group's* thinking changes — ideas get superseded, not appended — and pulls in confidential context safely.

## Hard rules

- All API keys live in `.env.local` (gitignored). Load into a shell with `set -a; source .env.local; set +a`. Never commit, print or log them. The repo goes public at submission.
- Confidential research only touches the team's own accounts. For the demo, use a seeded fake internal wiki — never real company data on stage.
- **Deadline 3:30 PM, Devpost.** A working loop beats features: speech in → board updates live. Cut scope before cutting the demo.
- The demo must work live in a noisy room. Keep a pre-recorded brainstorm audio clip as a fallback input.

## Timeline

Checked against `main` (status as of 2026-10-16):

- [x] **1:00 PM** — mic → transcript → Claude → board redraws, end to end. Live at `/board` (landing page at `/`), with mic level meter, live captions, pause/noisy-room tuning, speaker picker, clip + scripted fallbacks.
- [x] **2:30 PM** — Anchor research from Daytona (LLM page pick), SurrealDB memory + history panel, Arize tracing + evals (held-out clip script 6/7). All on main and verified on production.
- [ ] **3:15 PM** — demo video (<2 min) recorded, Devpost page done, repo public
  - [ ] Demo video — not recorded
  - [ ] Devpost page — not checkable from the repo
  - [x] Repo public — `Chimbay/daytona-hackathon` is already PUBLIC (the rule says public at submission)

## Submission & judging

- Devpost: https://daytona-hacksprint-nyc.devpost.com/ — public GitHub repo, demo video <2 min, description (2–3 sentence summary, problem/impact, architecture, every sponsor tool and how it's used). `IDEA.md` has the tool table.
- Round 1 judged on the Devpost page alone; top 8 pitch on stage (3 min + 2 min Q&A).
- Criteria 25% each: Impact, Technical Execution, Creativity, Presentation. Bonus for meaningful sponsor use; sponsor "Best Use" prizes open to all teams.

## Status (update as you go)

- Next.js 16 (App Router, TS, Tailwind) boilerplate at repo root; `npm run dev`. Renderer: Next.js + `@dagrejs/dagre` + `motion` (installed on `board-core`).
- Verified working: Bedrock `us.anthropic.claude-sonnet-5-5` and `us.anthropic.claude-haiku-4-5-20251001-v1:0` (us-west-2; `claude-haiku-5-5` is 403 "private marketplace eligibility" on the lab account; AWS creds are temporary session creds — refresh locally and in Vercel when they expire), Daytona create/exec/delete, Anchor MCP, ElevenLabs realtime token (`POST /v1/single-use-token/realtime_scribe`; key is restricted, `/v1/user` returns 401 — that's fine).
- Realtime Scribe has no speaker labels (`diarize` is silently dropped, `speaker_id` null even with timestamps). The page has a manual speaker picker instead.
- Keys in `.env.local`: `AWS_*`, `DAYTONA_API_KEY`, `DAYTONA_API_URL`, `ANCHOR_API_KEY`, `ELEVENLABS_API_KEY`, `WIKI_URL`, `SPECTRON_URL` + `SPECTRON_ID` (context id) + `SPECTRON_API_KEY` (verified, `/me` → 200), `arize_api` (unverified). `SURREAL` is unused. All are also set in the Vercel project `imagine`.
- Research (`POST /api/research`, verified ~4–8s): Anchor uses `api.anchorbrowser.io` (REST) + `connect.anchorbrowser.io` (CDP websocket; the URL is session-scoped and doesn't carry the API key). Anchor reaches Daytona preview URLs if the browser sends `X-Daytona-Skip-Preview-Warning: true`. Our Daytona org is Tier 1/2: per-sandbox `domainAllowList` is rejected (route falls back to the org egress policy). Daytona secrets are org Secrets referenced by name (`anchor-api-key`, substituted only for `api.anchorbrowser.io`); Node in the sandbox needs `NODE_USE_ENV_PROXY=1`. Anchor `execute-code` is not enabled on our team. Fake wiki: `wiki/`, relaunch with `node --env-file=.env.local wiki/launch.mts`, URL in `WIKI_URL`.
- Unverified: Bedrock model/region access on the lab account; speaker labels in Scribe realtime mode.

## Architecture (one sponsor per layer)

| Layer | Tool | Use |
|---|---|---|
| Frontend | Vercel (Next.js) | Whiteboard UI + API routes: mint ElevenLabs STT token, call Bedrock per transcript chunk, trigger research jobs |
| Ears | ElevenLabs Scribe realtime (`scribe_v2_realtime`) | Browser streams mic directly to ElevenLabs over WebSocket using a short-lived token; speaker labels |
| Brain | AWS Bedrock (Claude) | Transcript chunk + current board → board edits (JSON). Also decides when a spoken question needs research. Don't use AgentCore browser/memory/code interpreter — they'd displace partner tools. |
| Secure research | Daytona | Ephemeral sandbox per research job: holds login credentials as Daytona **secrets** (sandbox only sees placeholders), outbound network limited to the sources it needs, deleted after the job. Only the extracted fact + source URL leaves it. |
| Browser | Anchor Browser | Driven from the Daytona sandbox; logs into internal sources (Anchor identities) and reads the page that answers the question |
| Memory | SurrealDB Agent Memory (hosted) | Ideas and researched facts as typed, timestamped records with provenance (quote + speaker, or source URL). New ideas **supersede** old ones so the board can replay how an idea evolved |
| Observability | Arize AX | OpenInference tracing of Bedrock calls; evals scoring whether the board faithfully reflects the transcript |

Flow: mic → ElevenLabs (browser WebSocket) → transcript chunk → Vercel route → Bedrock → board edits → SurrealDB → board redraws.
Research branch: Bedrock flags a question → Vercel route creates Daytona sandbox → agent drives Anchor to the internal source → fact + source URL → SurrealDB → pinned on the board → sandbox deleted.

**Board model:** the source of truth is a small graph (nodes = ideas/facts, edges = relations), not pixels. Claude returns edits as JSON; the frontend renders with **Next.js + dagre + Motion**: dagre computes node positions from the graph, nodes are absolutely positioned `motion.div`s that animate to their new `x/y` (and fade in/out via `AnimatePresence`), edges are SVG `motion.path`s whose `d` animates. No React Flow — the board is display-only, so its pan/drag/handles aren't needed, and Motion gives the smooth "realign" animation that sells the demo. Don't build a freehand canvas. One presenter screen drives the demo, so no realtime multi-viewer sync: the board updates from each route's response. Vercel functions can't hold WebSockets — don't design around them.

**Eval set:** a scripted brainstorm transcript (plus its audio) with the expected final board. Use it for the fallback demo and for Arize evals (missed ideas, invented ideas, wrong merges).

SurrealDB prize criteria to hit visibly: time-aware facts that supersede, each idea/fact traceable to its quote or source URL, memory shared across agents (board agent + research agent).

## Skills (`.claude/skills/` → `.agents/skills/`, pinned in `skills-lock.json`)

Use these instead of guessing sponsor APIs:
- Daytona: `daytona`
- Anchor: `anchorbrowser-cli` (identities + authenticated sessions); hosted MCP in `.mcp.json` (`https://api.anchorbrowser.io/v1/mcp`, needs `ANCHOR_API_KEY` exported in the shell that launches Claude Code)
- ElevenLabs: `speech-to-text` (realtime events in `references/realtime-events.md`), `setup-api-key`
- SurrealDB: `surrealdb-agent-memory-docs` (Agent Memory; formerly "Spectron", env vars still `SPECTRON_*`), `surrealdb-js`, `surrealdb-python`, `surrealql`, `surrealdb-docs`
- Arize: `arize-instrumentation` (add tracing), `arize-experiment` (evals), `arize-trace` (inspect traces)
- Bedrock/Claude: built-in `claude-api` skill. Check model + region access on the lab account before building on it.
- Web research: You.com MCP tools.

Reinstall: `npx skills experimental_install` (from `skills-lock.json`) or `npx skills add <repo> --skill <name>`.

## Daytona notes

Docs: append `.md` to any page (https://www.daytona.io/docs/en/sandboxes.md); index https://www.daytona.io/docs/llms.txt.

```python
from daytona import Daytona, CreateSandboxFromSnapshotParams

daytona = Daytona()  # reads DAYTONA_API_KEY
sandbox = daytona.create(CreateSandboxFromSnapshotParams(
    ephemeral=True,                       # deleted on stop
    secrets={"ANCHOR_API_KEY": "..."},    # sandbox sees a placeholder, never the value
    domain_allow_list="*.anchorbrowser.io,wiki.example.com",  # only what the job needs
))
r = sandbox.process.exec("python3 research.py 'Q3 revenue'")  # uses $ANCHOR_API_KEY
r.exit_code, r.result
sandbox.delete()
```

- TypeScript SDK (`@daytona/sdk`) mirrors this in camelCase if the job is launched from a Vercel route.
- Auto-stop default is 15 min idle, and a running process doesn't count as activity. Use `auto_stop_interval=0` or `sandbox.refresh_activity()` for long jobs.
- Hosting the fake wiki in its own sandbox: `public=True` + `get_preview_link(port).url`; without `public=True` preview URLs need the `x-daytona-preview-token` header.
- Defaults: 1 vCPU / 1 GB / 3 GiB (max 4 / 8 / 10). Delete throwaway sandboxes.
