// Server-side error helpers shared by the API routes and the model calls.
import { APIConnectionTimeoutError } from "@anthropic-ai/sdk";

// Model/agent output is untrusted text: bad JSON becomes undefined, never a throw.
export function parseJson(text: string | undefined): unknown {
  try {
    return JSON.parse(text ?? "");
  } catch {
    return undefined;
  }
}

// fetch + AbortSignal.timeout throws a TimeoutError; the Anthropic SDK throws its own class.
export const isTimeout = (e: unknown) =>
  e instanceof APIConnectionTimeoutError || (e instanceof Error && e.name === "TimeoutError");

// Logs the real error server-side; the client only gets a short message (no upstream bodies or secrets).
export function upstreamError(what: string, e: unknown) {
  console.error(`${what} failed`, e);
  return isTimeout(e)
    ? Response.json({ error: `${what} timed out` }, { status: 504 })
    : Response.json({ error: `${what} failed` }, { status: 502 });
}
