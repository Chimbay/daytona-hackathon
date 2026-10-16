# Pitch and demo plan

Two parts: the **3-minute stage pitch** (top 8 only, followed by 2 minutes of Q&A) and the **demo video under 2 minutes** for Devpost (Round 1 is judged on the Devpost page alone, so the video carries the demo).

The demo is **live**: three people brainstorm out loud into the mic and the board redraws in real time. The lines below are a guide that hits every feature; ad-libbing is fine. The same brainstorm exists as a recorded clip (`public/demo/brainstorm.wav`, 53 s) as a fallback only.

| # | Speaker | Line | What the board should do |
|---|---|---|---|
| 1 | Maya | "Okay team, the goal for today is simple. How do we double our sign-ups next quarter?" | Goal card: *Double sign-ups next quarter* |
| 2 | Dev | "One idea. We hire two more sales reps to go after bigger accounts." | *Hire two more sales reps* branches off the goal |
| 3 | Sam | "Another idea. A referral program, where every user gets a free month for each friend they invite." | Referral card branches off the goal |
| 4 | Maya | "Actually, instead of hiring sales reps, let's build a self-serve onboarding flow. It scales much better than people." | **Supersede:** sales reps becomes *Self-serve onboarding flow*, with "was: Hire two more sales reps" |
| 5 | Dev | "Nice. And the referral program should send new users straight into that onboarding flow." | Referral links to self-serve |
| 6 | Sam | "But can we afford all of this? What was our Q3 revenue?" | Question card pulses **Researching in secure sandbox…**, then the fact pins with an *internal wiki · /finance/q3.html* link |
| 7 | Maya | "Good question. Let's check the numbers, then ship self-serve onboarding first." | Self-serve card relabels |

The clip voices are macOS text-to-speech, and realtime STT has no speaker labels. When the clip plays, every line is tagged with whichever speaker is selected in the picker, unless you tap along.

## Pre-flight (do this before going on stage or recording)

- [ ] Open https://imagine-lac-xi.vercel.app/board (or `npm run dev` → `localhost:3000/board`). Use full screen, and use dark mode if the projector washes out.
- [ ] Confirm the wiki is up: the `WIKI_URL` sandbox must be running. Relaunch it with `node --env-file=.env.local wiki/launch.mts` if needed, and update `WIKI_URL` on Vercel if the URL changed.
- [ ] Warm up: run one research question, wait at least a minute, then press **Reset**. The first secret check and sandbox are the slowest, and **Anchor rate-limits back-to-back session creation**, so never ask two research questions close together.
- [ ] Speaker names in the picker: `Maya, Dev, Sam`.
- [ ] Mic permission already granted to the tab. Press **Start mic**, say a sentence, and watch the **level meter** move and the **live caption** appear over the board, then **Reset**.
- [ ] Tune for the room before going on: **Pause before sending** (1.2 s default; raise to 1.5–2 s if phrases get cut mid-sentence, lower to 0.8 s if the board lags) and tick **Noisy room** if background chatter turns into captions. Both apply the next time the mic starts.
- [ ] Laptop volume up, so the fallback clip is audible if you need it.
- [ ] Arize project `brainstorm-board` open in another tab (for the video).

## 3-minute pitch

| Time | Beat | Say | Do |
|---|---|---|---|
| 0:00–0:20 | **Hook** | "Every brainstorm ends with a whiteboard full of ideas we already killed, and a list of 'I'll check and get back to you.' We built a whiteboard that keeps up with the room." | Board on screen, empty. |
| 0:20–0:35 | **Why it's new** | "Voice-to-mind-map exists, but it's one person dictating, and it only appends. A group changes its mind. Our board tracks that: new ideas *supersede* old ones." | — |
| 0:35–1:45 | **Live demo** | Press **Start mic**; the cast talks through lines 1–5. Fallback only: **Fallbacks → Play demo clip**. | If live, tap the speaker before each line. At line 4, point at *Hire two more sales reps* turning into *Self-serve onboarding flow* with the "was:" trail, and at the board realigning. |
| | | Line 6: "What was our Q3 revenue?" While it runs: "That needs internal numbers. Claude flagged it, and a fresh Daytona sandbox is driving an Anchor browser through our internal wiki. The Anchor key is a Daytona secret, so the sandbox only ever sees a placeholder. The page text comes out, Claude Haiku picks the answer outside the sandbox, and the sandbox is deleted." | Fact card pins with its source. Click the link to show the wiki page. |
| | | Line 7. | — |
| 1:45–2:15 | **Memory** | "Every card lives in SurrealDB Agent Memory with its quote, speaker and time, and it's shared by both agents." | **Click the self-serve card.** The history panel ("From SurrealDB Agent Memory") shows v1 *Hire two more sales reps* (superseded, said by Dev) and v2 *Self-serve onboarding* (said by Maya), each with its quote and "added by board-agent". Then click the fact card to show "added by research-agent" and the source URL. |
| 2:15–2:35 | **How it's built** | "ElevenLabs Scribe realtime is the ears. Claude on Bedrock turns each phrase into graph edits, not pixels. Arize traces every model call, and we have an eval that scores the board for missed ideas, invented ideas, supersedes and research flags. All of it runs on Vercel." | Optional: the architecture diagram from DEVPOST.md. |
| 2:35–3:00 | **Impact and close** | "You walk out with the decision, not the whole debate, and with answers instead of follow-ups. Every card traces back to who said it or where it came from. Confidential data stays in a box that throws itself away." | Hold on the final board. |

### Q&A prep (answer honestly)

- **"Is the sandbox network locked down?"** We wrote a per-sandbox allowlist (Anchor API and CDP hosts only), but our Daytona tier rejects per-sandbox allowlists, so the code falls back to a normal sandbox. The protections that do apply: a fresh ephemeral sandbox per question, the key is a secret placeholder that Daytona substitutes only on requests to `api.anchorbrowser.io`, no AWS keys in the sandbox, only page text leaves, and the sandbox is deleted.
- **"How do you know who's speaking?"** Realtime Scribe has no diarization, so the presenter taps the speaker. With diarizing realtime STT, the picker goes away.
- **"Is that real company data?"** No. The wiki is a fictional "Acme" seeded wiki on a public Daytona preview URL with no login. Real sources would log in through Anchor identities (next step).
- **"Can the model make up a source?"** No. Haiku returns a page index, and the source URL is the `href` of a page the browser actually read. If the Haiku call fails, a keyword match is the fallback.
- **"How good is it?"** The eval replays a scripted brainstorm through the real model and scores missed ideas, invented ideas, supersedes and research flags. Be upfront: the scored script is also the few-shot set, so that score is optimistic. On the held-out demo-clip brainstorm, which the model never sees as an example: 6 of 7 steps pass, 0 of 5 ideas missed, 1 invented (an extra "Can we afford all this?" question), supersede and research flags 100%.
- **"What if Claude gets it wrong?"** Edits are schema-constrained and validated server-side, edits that reference unknown ids are skipped, and every call is traced in Arize.
- **"Latency?"** The board call uses Sonnet with thinking off and low effort, memory writes happen after the response, and research runs in parallel, so the board keeps updating while the sandbox works.

## Demo video shot list (under 2:00)

Record a live take: the cast talks into the mic and the screen shows the live captions and the board redrawing. If a live take fails, use the demo clip as the audio source (**Fallbacks → Play demo clip**). Add a voiceover in the gaps. Since speakers come from the picker, tap Maya, Dev or Sam in time with the clip, or say in the VO that the presenter tags speakers.

| # | Time | Shot | Audio / voiceover |
|---|---|---|---|
| 1 | 0:00–0:08 | Title card: *Imaginar*, plus the sponsor logos row | VO: "A whiteboard that keeps up with how a group's thinking changes." |
| 2 | 0:08–0:15 | Empty board at imagine-lac-xi.vercel.app/board. Open **Fallbacks**, press **Play demo clip** | VO: "It listens through ElevenLabs Scribe realtime. Realtime STT has no speaker labels, so the presenter tags who's talking." |
| 3 | 0:15–0:35 | Clip lines 1–3: the goal card, then sales reps and referral branch off with a smooth realign | Clip audio |
| 4 | 0:35–0:50 | Line 4: zoom on the sales-reps card becoming **Self-serve onboarding flow** with "was: Hire two more sales reps" | Clip audio, then VO: "It doesn't append. It supersedes." |
| 5 | 0:50–1:15 | Line 6: the question card pulses **Researching in secure sandbox…**, then the fact pins with its source. Click the source link to show the fictional wiki page | VO: "Claude flags a question that needs internal data. A fresh Daytona sandbox drives an Anchor browser through our wiki, with the key held as a Daytona secret. Claude Haiku picks the answer outside the sandbox, and the sandbox is deleted." |
| 6 | 1:15–1:35 | **Click the self-serve card.** The history panel slides in: "From SurrealDB Agent Memory", v1 superseded, v2 live, with quotes, speakers, times and "added by board-agent". Click the fact card to show "added by research-agent" | VO: "Every version lives in SurrealDB Agent Memory with its quote, speaker and time, shared by the board agent and the research agent." |
| 7 | 1:35–1:50 | Arize AX project `brainstorm-board`: a `board-edits` trace with the Bedrock LLM span, then the eval experiment | VO: "Arize traces every model call, and our eval scores the board for missed ideas, invented ideas and supersedes." |
| 8 | 1:50–2:00 | Final board plus the repo URL | VO: "Built on Vercel, Bedrock, ElevenLabs, Daytona, Anchor, SurrealDB and Arize." |

The history panel reads memory, which lands about a second after each update. If it says "Not in memory yet", press **Refresh**.

## Fallbacks (noisy room or a failing service)

The sidebar has a **Fallbacks** panel. Decide within 5 seconds, and don't debug on stage.

1. **Mic picks up the room badly.** First try **Stop listening**, tick **Noisy room** (and/or raise the pause), **Start mic** again. If it's still bad, open **Fallbacks → Play demo clip**, which resets the board first. The clip plays aloud and streams through the same ElevenLabs → Claude path, so the demo is still live. Tap speaker names in time with it if you can.
2. **ElevenLabs, Bedrock or the network is down.** Press **Reset**, then **Fallbacks → Scripted line** to click through all 7 steps. This replays `demoScript` (a free tier superseded by a 30-day trial, then "How does our Q3 look?"), not the clip's brainstorm, and applies the expected edits locally with no network, including the pinned Q3 fact. Say: "This is the scripted run we score our evals against." The history panel needs the network, so skip the memory beat.
3. **Research hangs or fails** (Anchor rate limit, wiki down). Keep talking through the architecture beat. The route times out the sandbox command at 45 s, and the card stops pulsing. If no fact arrived, say so, and show the fact on the Scripted-line run, or in an earlier take for the video.
4. **Projector is too small to read the cards.** Zoom the browser. The board scales to fit.

For the video: if a live take fails, record another take with the clip. Never fake the fact card in editing.
