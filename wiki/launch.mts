// (Re)launch the fake internal wiki in its own public Daytona sandbox and print WIKI_URL.
// Run: node --env-file=.env.local wiki/launch.mts   (then put the printed WIKI_URL in .env.local)
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { Daytona } from "@daytona/sdk";

const NAME = "brainstorm-wiki";
const PORT = 8080;
const dir = import.meta.dirname;

const daytona = new Daytona({ apiKey: process.env.DAYTONA_API_KEY, apiUrl: process.env.DAYTONA_API_URL });
try {
  await (await daytona.get(NAME)).delete();
} catch {} // not running yet

const sandbox = await daytona.create({ name: NAME, public: true, autoStopInterval: 0 });
const files = readdirSync(dir, { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith(".html"))
  .map((f) => ({ source: readFileSync(join(dir, f)), destination: `/home/daytona/wiki/${relative(".", f)}` }));
await sandbox.fs.uploadFiles(files);
await sandbox.process.createSession("wiki");
await sandbox.process.executeSessionCommand("wiki", {
  command: `cd /home/daytona/wiki && python3 -m http.server ${PORT}`,
  runAsync: true,
});
const { url } = await sandbox.getPreviewLink(PORT);
console.log(`WIKI_URL=${url}`);
