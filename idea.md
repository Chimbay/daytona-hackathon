# Imaginar

A whiteboard that listens to a group brainstorm and redraws itself to match the idea being discussed. When someone asks a question that needs internal data ("How does our Q3 look?"), an agent looks it up in the team's private sources from an isolated sandbox and pins the answer to the board with its source.

## Tools

| Tool | Purpose |
|---|---|
| Vercel | Hosts the whiteboard frontend and API routes |
| ElevenLabs Scribe | Real-time speech-to-text with speaker labels |
| AWS Bedrock (Claude) | Turns transcript into board edits; detects questions that need research |
| Daytona | Isolated sandbox per research job: holds credentials as secrets, restricts network, deleted after use |
| Anchor Browser | Logs into internal sources from the Daytona sandbox and retrieves the answer |
| SurrealDB Agent Memory | Stores ideas and facts with timestamps and source; new ideas supersede old ones |
| Arize AX | Traces Claude calls; evaluates whether the board matches the conversation |
