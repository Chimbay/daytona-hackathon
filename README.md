# Live Brainstorm Whiteboard

A whiteboard that listens to a group brainstorm and redraws itself to match the idea being discussed. Ask a question that needs internal data ("How does our Q3 look?") and an agent looks it up in the team's private sources from an isolated sandbox, then pins the answer to the board with its source.

Built at the Daytona HackSprint NYC 2026.

## Tools

- **Vercel**: frontend and API routes
- **ElevenLabs Scribe**: real-time speech-to-text with speaker labels
- **AWS Bedrock (Claude)**: turns the conversation into board edits
- **Daytona**: isolated sandbox per research job, with credentials kept as secrets
- **Anchor Browser**: logs into internal sources and retrieves answers
- **SurrealDB Agent Memory**: stores ideas and facts with timestamps and sources; new ideas supersede old ones
- **Arize AX**: traces and evaluates the agent
