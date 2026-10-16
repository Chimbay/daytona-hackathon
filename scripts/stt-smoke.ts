// Streams a 16 kHz mono PCM16 WAV through the same Scribe path the browser uses.
// Usage: node scripts/stt-smoke.ts clip.wav [http://localhost:3102]
// Make a clip: say -o x.aiff "..." && afconvert -f WAVE -d LEI16@16000 -c 1 x.aiff x.wav
import { readFileSync } from "node:fs";
import { openScribe, streamPcm } from "../lib/scribe.ts";

const [file, origin = "http://localhost:3102"] = process.argv.slice(2);
const wav = readFileSync(file);
const dataAt = wav.indexOf("data") + 8; // afconvert inserts extra chunks, so find "data" rather than assume 44
const pcm = new Uint8Array(wav.buffer, wav.byteOffset + dataAt, wav.length - dataAt);

const { token } = await (await fetch(`${origin}/api/stt-token`, { method: "POST" })).json();
const conn = openScribe(token, "pcm", {
  onChunk: (c) => console.log("CHUNK", JSON.stringify(c)),
  onPartial: (t) => t && console.log("partial", t),
  onError: (e) => console.error("ERROR", e),
});
await streamPcm(conn, pcm);
setTimeout(() => conn.close(), 3000); // let the final commit arrive
