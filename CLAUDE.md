# Live Brainstorm Whiteboard — Daytona HackSprint NYC (Oct 16 2026)

A whiteboard that listens to a group brainstorming out loud and keeps redrawing itself to match the idea being discussed. When someone asks a question that needs internal data ("how does our Q3 look?"), an agent looks it up in the team's private sources from a locked-down sandbox and pins the answer to the board with its source.

Pitch angle (prior art covers single-speaker "voice → mind map"): the board tracks how a *group's* thinking changes — ideas get superseded, not appended — and pulls in confidential context safely.

## Hard rules

- All API keys live in `.env` (gitignored). Never commit, print or log them. The repo goes public at submission.
- Confidential research only touches the team's own accounts. For the demo, use a seeded fake internal wiki — never real company data on stage.
- **Deadline 3:30 PM, Devpost.** A working loop beats features: speech in → board updates live. Cut scope before cutting the demo.
- The demo must work live in a noisy room. Keep a pre-recorded brainstorm audio clip as a fallback input.

## Timeline

- **1:00 PM** — mic → transcript → Claude → board redraws, end to end
- **2:30 PM** — Anchor research from Daytona, memory (idea history), Arize tracing + evals
- **3:15 PM** — demo video (<2 min) recorded, Devpost page done, repo public

## Submission & judging

- Devpost: https://daytona-hacksprint-nyc.devpost.com/ — public GitHub repo, demo video <2 min, description (2–3 sentence summary, problem/impact, architecture, every sponsor tool and how it's used). `IDEA.md` has the tool table.
- Round 1 judged on the Devpost page alone; top 8 pitch on stage (3 min + 2 min Q&A).
- Criteria 25% each: Impact, Technical Execution, Creativity, Presentation. Bonus for meaningful sponsor use; sponsor "Best Use" prizes open to all teams.

## Status (update as you go)

- No code yet. Renderer (Mermaid vs React Flow) not chosen.
- Unverified: Bedrock model/region access on the lab account; Anchor's API hostnames (for the Daytona domain allowlist); Anchor reaching a Daytona preview URL; speaker labels in Scribe realtime mode.

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

**Board model:** the source of truth is a small graph (nodes = ideas/facts, edges = relations), not pixels. Claude returns edits as JSON; the frontend renders with auto-layout (Mermaid or React Flow + dagre — pick one, don't build a canvas). One presenter screen drives the demo, so no realtime multi-viewer sync: the board updates from each route's response. Vercel functions can't hold WebSockets — don't design around them.

**Eval set:** a scripted brainstorm transcript (plus its audio) with the expected final board. Use it for the fallback demo and for Arize evals (missed ideas, invented ideas, wrong merges).

SurrealDB prize criteria to hit visibly: time-aware facts that supersede, each idea/fact traceable to its quote or source URL, memory shared across agents (board agent + research agent).

## Skills (`.claude/skills/` → `.agents/skills/`, pinned in `skills-lock.json`)

Use these instead of guessing sponsor APIs:
- Daytona: `daytona`
- Anchor: `anchorbrowser-cli` (identities + authenticated sessions)
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
