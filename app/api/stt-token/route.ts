import { upstreamError } from "@/lib/errors";

// Mints a single-use ElevenLabs Scribe realtime token (expires in 15 min) so the
// browser can open the STT WebSocket without ever seeing ELEVENLABS_API_KEY.
export async function POST() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Response.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 500 });

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe", {
      method: "POST",
      headers: { "xi-api-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return Response.json({ error: `token mint failed (${res.status})` }, { status: 502 });
    const { token } = (await res.json()) as { token?: unknown };
    if (typeof token !== "string") throw new Error("no token in ElevenLabs response");
    return Response.json({ token });
  } catch (e) {
    return upstreamError("token mint", e);
  }
}
