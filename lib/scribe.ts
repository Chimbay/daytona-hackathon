// Framework-free Scribe realtime plumbing, shared by the React hook and the Node smoke test.
import { AudioFormat, CommitStrategy, RealtimeEvents, Scribe } from "@elevenlabs/client";

export type Chunk = { speaker?: string; text: string };

export type ScribeHandlers = {
  onChunk: (chunk: Chunk) => void;
  onPartial?: (text: string) => void;
  onError?: (error: unknown) => void;
  onClose?: () => void;
};

export const SAMPLE_RATE = 16000;
const MODEL_ID = "scribe_v2_realtime";
// VAD commits on pauses, so a mic stream and a replayed clip yield the same segments.
const base = { modelId: MODEL_ID, commitStrategy: CommitStrategy.VAD, languageCode: "en" };

// Realtime Scribe has no diarization option, so speaker stays undefined.
export function openScribe(token: string, mode: "mic" | "pcm", h: ScribeHandlers) {
  const conn =
    mode === "mic"
      ? Scribe.connect({
          ...base,
          token,
          microphone: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        })
      : Scribe.connect({ ...base, token, audioFormat: AudioFormat.PCM_16000, sampleRate: SAMPLE_RATE });

  conn.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (d: { text: string }) => h.onPartial?.(d.text));
  conn.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (d: { text: string }) => {
    h.onPartial?.("");
    const text = d.text.trim();
    if (text) h.onChunk({ text });
  });
  conn.on(RealtimeEvents.ERROR, (e: unknown) => h.onError?.(e));
  conn.on(RealtimeEvents.CLOSE, () => h.onClose?.());
  return conn;
}

export type ScribeConnection = ReturnType<typeof openScribe>;

export function waitForSession(conn: ScribeConnection) {
  return new Promise<void>((resolve) => conn.on(RealtimeEvents.SESSION_STARTED, () => resolve()));
}

/** Float [-1,1] samples → 16-bit little-endian PCM bytes. */
export function floatToPcm16(samples: Float32Array): Uint8Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return new Uint8Array(out.buffer);
}

function toBase64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Streams 16 kHz PCM16 at real-time pace (so VAD sees natural pauses), then commits the tail. */
export async function streamPcm(conn: ScribeConnection, pcm: Uint8Array, signal?: AbortSignal) {
  const CHUNK_MS = 100;
  const step = (SAMPLE_RATE * 2 * CHUNK_MS) / 1000;
  await waitForSession(conn);
  for (let off = 0; off < pcm.length && !signal?.aborted; off += step) {
    conn.send({ audioBase64: toBase64(pcm.subarray(off, off + step)) });
    await new Promise((r) => setTimeout(r, CHUNK_MS));
  }
  if (!signal?.aborted) conn.commit();
}
