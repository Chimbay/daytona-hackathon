# Pitch and demo plan

Two parts: the **3-minute stage pitch** (top 8 only, followed by 2 minutes of Q&A) and the **demo video under 2 minutes** for Devpost (Round 1 is judged on the Devpost page alone, so the video carries the demo).

Demo cast: three voices reading the scripted brainstorm from `lib/demo-script.ts` (Maya, Dev, Sam). The presenter drives the laptop.

## Pre-flight (do this before going on stage or recording)

- [ ] `npm run dev` is running, or the Vercel deploy is open. Close the browser zoom, use full screen, and turn on dark mode if the projector is washed out.
- [ ] Fresh `WIKI_URL` (`node --env-file=.env.local wiki/launch.mts`). Open it once in a tab to confirm it loads.
- [ ] Warm up: ask one research question ("How does our Q3 look?") and press **Reset**. The first Daytona secret check and the first sandbox are the slowest.
- [ ] Speaker names in the picker: `Maya, Dev, Sam`.
- [ ] Recorded clip of the scripted brainstorm on the desktop (WAV or MP3).
- [ ] Mic permission already granted to the tab.

## 3-minute pitch

| Time | Beat | Say | Do |
|---|---|---|---|
| 0:00–0:20 | **Hook** | "Every brainstorm ends with a whiteboard full of ideas we already killed, and a list of 'I'll check and get back to you.' We built a whiteboard that keeps up with the room." | Board on screen, empty. |
| 0:20–0:40 | **Why it's new** | "Voice-to-mind-map exists, but it's one person dictating, and it only appends. A group changes its mind. Our board tracks that: new ideas *supersede* old ones." | — |
| 0:40–1:50 | **Live demo** | Cast reads lines 1–4 of the script (goal, free tier, Slack, "make it a 30-day trial instead"). | Tap the speaker before each line. Point at the free-tier card turning into "30-day team trial" with **was: Free tier for small teams** struck through, and at the board realigning. |
| | | Dev: "Can we afford that? How does our Q3 look?" | Question card appears with **Researching in secure sandbox…** |
| | | While it runs: "That question needs internal numbers. Claude flagged it, and right now a fresh Daytona sandbox is driving an Anchor browser into our internal wiki. The Anchor key is a Daytona secret: the sandbox only ever sees a placeholder. Only the fact and its URL come back, then the sandbox is deleted." | Fact card pins: **Q3 revenue $4.2M, 18% over plan** · internal wiki · /finance/q3.html. Click the link. |
| | | Sam: "Then the trial ships with the Slack app as the onboarding path." | The Slack card relabels and links to the trial. |
| 1:50–2:30 | **How it's built** | "ElevenLabs Scribe realtime is the ears. Claude on Bedrock turns each phrase into graph edits, not pixels. SurrealDB Agent Memory stores every idea with its timestamp, quote and speaker, and supersedes are real relations, so we can replay how an idea evolved. Both agents share that memory. Arize traces each Claude call, and evals score the board against a scripted brainstorm for missed ideas, invented ideas and wrong supersedes." | Optional: show the architecture diagram from DEVPOST.md, or the `/api/history` JSON for the trial chain. |
| 2:30–3:00 | **Impact and close** | "You walk out with the decision, not the whole debate, and with answers instead of follow-ups. Every card traces back to who said it or where it came from. Confidential data stays in a box that throws itself away." | Hold on the final board. |

### Q&A prep (answer honestly)

- **"Is the sandbox network locked down?"** We wrote a per-sandbox allowlist (Anchor API and CDP hosts only), but our Daytona tier rejects per-sandbox allowlists, so the code falls back to a normal sandbox. The protections that do apply: a fresh ephemeral sandbox per question, the key is a secret placeholder that Daytona substitutes only on requests to `api.anchorbrowser.io`, only one JSON line leaves, and the sandbox is deleted.
- **"How do you know who's speaking?"** Realtime Scribe has no diarization, so the presenter taps the speaker. With diarizing realtime STT, the picker goes away.
- **"Is that real company data?"** No. The wiki is a fictional "Acme" seeded wiki, hosted on a public Daytona preview URL with no login. Real sources would log in through Anchor identities (next step).
- **"How does the agent find the right page?"** Keyword overlap between the question and the wiki's link keywords. It's simple and deterministic, and an LLM picker is next.
- **"What if Claude gets it wrong?"** Edits are schema-constrained and validated server-side, edits that reference unknown ids are skipped, and the Arize evals score faithfulness against the scripted transcript.
- **"Latency?"** The board call uses Sonnet with thinking off and low effort, memory writes happen after the response, and research runs in parallel, so the board keeps updating while the sandbox works.

## Demo video shot list (under 2:00)

Record a screen capture with voiceover. The cast's voices are captured live by the mic, or by the clip if the room is loud.

| # | Time | Shot | Audio / voiceover |
|---|---|---|---|
| 1 | 0:00–0:10 | Title card: *Live Brainstorm Whiteboard*, plus the sponsor logos row | VO: "A whiteboard that keeps up with how a group's thinking changes." |
| 2 | 0:10–0:20 | Empty board. Click **Start mic**, then tap **Maya** in the speaker picker | VO: "It listens through ElevenLabs Scribe realtime. Realtime STT has no speaker labels, so the presenter taps who's talking." |
| 3 | 0:20–0:40 | Lines 1–3: the goal card, then the free tier and Slack cards branch off with a smooth realign | Cast reads lines 1–3 |
| 4 | 0:40–0:55 | Line 4: zoom on the free-tier card becoming **30-day team trial** with "was: Free tier for small teams" | Cast reads line 4. VO: "It doesn't append. It supersedes, and it keeps the history." |
| 5 | 0:55–1:20 | Line 5: the question card shows **Researching in secure sandbox…**. Picture-in-picture or a cut to the Daytona dashboard showing the sandbox, if available | VO: "Claude flags a question that needs internal data. A fresh Daytona sandbox drives an Anchor browser into our wiki. The key is a Daytona secret, so the sandbox only sees a placeholder." |
| 6 | 1:20–1:30 | Fact card pins with the source link. Click it to show the fictional wiki page | VO: "The answer comes back with its source. Then the sandbox is deleted." |
| 7 | 1:30–1:40 | Line 7: the Slack card relabels and links to the trial | Cast reads line 7 |
| 8 | 1:40–1:52 | `/api/history?session=…` JSON (supersede chain with timestamps), then the Arize trace view <!-- verify after Arize PR merges --> | VO: "Every idea lives in SurrealDB Agent Memory with its quote, speaker and timestamp, shared by both agents. Arize traces every Claude call." |
| 9 | 1:52–2:00 | Final board plus the repo URL | VO: "Built on Vercel, Bedrock, ElevenLabs, Daytona, Anchor, SurrealDB and Arize." |

To get the session id for shot 8, use the `sessionId` from the network tab (the request body of any `/api/board` call).

## Fallbacks (noisy room or a failing service)

The sidebar has a **Fallbacks** panel. Decide within 5 seconds, and don't debug on stage.

1. **Mic picks up the room badly.** Press **Reset**, open **Fallbacks → Play recorded clip**, and choose the recorded brainstorm. It plays aloud and streams through the same ElevenLabs → Claude path, so the demo is still live. Tap the speaker names in time with the clip if you can. Otherwise chunks are tagged with the selected speaker.
2. **ElevenLabs, Bedrock or the network is down.** Press **Reset**, then **Fallbacks → Scripted line** to click through all 7 steps. The scripted script applies its expected edits locally with no network, including the pinned Q3 fact, so the supersede and fact beats still land. Say: "This is the scripted eval run, the same brainstorm we score with Arize."
3. **Research hangs past about 20 seconds.** Keep talking through the architecture beat. The route times out the sandbox command at 45 s and the card stops showing "Researching…". If no fact arrived, say so, press **Reset**, and click through **Scripted line** to show the pinned fact. The scripted counter always starts at step 1.
4. **Projector is too small to read the cards.** Zoom the browser. The board scales to fit.

For the video: if a live take fails, record with the clip fallback. Never fake the fact card in editing.
