// Mints a single-use ElevenLabs Scribe realtime token (expires in 15 min) so the
// browser can open the STT WebSocket without ever seeing ELEVENLABS_API_KEY.
export async function POST() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Response.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 500 });

  const res = await fetch("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe", {
    method: "POST",
    headers: { "xi-api-key": key },
    cache: "no-store",
  });
  if (!res.ok) return Response.json({ error: `token mint failed (${res.status})` }, { status: 502 });

  const { token } = (await res.json()) as { token: string };
  return Response.json({ token });
}
