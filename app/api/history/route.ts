import { loadHistory, validSessionId } from "@/lib/memory";

// GET ?session=... → each idea's supersede chain (oldest → newest) with timestamps and provenance.
export async function GET(req: Request) {
  const session = new URL(req.url).searchParams.get("session");
  if (!validSessionId(session)) return Response.json({ error: "session must match [a-z0-9-]+" }, { status: 400 });
  try {
    return Response.json(await loadHistory(session));
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
