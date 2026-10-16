// Research agent: runs INSIDE an ephemeral Daytona sandbox (Node >= 22, zero deps).
//
// Opens an Anchor cloud browser, drives it over CDP to the internal wiki page that answers the
// question, and prints only {"fact","source"} JSON. $ANCHOR_API_KEY here is a Daytona secret
// placeholder: the real key is swapped in at the sandbox's egress, so this process never sees it.
// The CDP URL Anchor returns is session-scoped and does not contain the API key.
//
// Usage: node agent.mjs "<question>" "<wiki url>"    |    node agent.mjs --self-test

const API = "https://api.anchorbrowser.io/v1";
const HEADERS = { "anchor-api-key": process.env.ANCHOR_API_KEY ?? "", "content-type": "application/json" };

async function anchor(method, path, body) {
  const r = await fetch(API + path, { method, headers: HEADERS, body: body && JSON.stringify(body) });
  if (!r.ok) throw new Error(`anchor ${method} ${path} -> ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

// Minimal CDP client over the browser websocket (flattened target sessions).
async function cdpConnect(url) {
  const ws = new WebSocket(url);
  await new Promise((ok, fail) => ((ws.onopen = ok), (ws.onerror = () => fail(new Error("CDP connect failed")))));
  let id = 0;
  const pending = new Map();
  const waiters = [];
  ws.onmessage = ({ data }) => {
    const m = JSON.parse(data);
    if (m.id && pending.has(m.id)) {
      const { ok, fail } = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) fail(new Error(`CDP ${m.error.message}`));
      else ok(m.result);
    } else if (m.method) {
      for (const w of waiters.filter((w) => w.method === m.method)) {
        waiters.splice(waiters.indexOf(w), 1);
        w.ok(m.params);
      }
    }
  };
  const send = (method, params = {}, sessionId) =>
    new Promise((ok, fail) => {
      pending.set(++id, { ok, fail });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  const once = (method) => new Promise((ok) => waiters.push({ method, ok }));
  return { send, once, close: () => ws.close() };
}

async function openPage(cdp) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const s = (method, params) => cdp.send(method, params, sessionId);
  await s("Page.enable");
  await s("Network.enable");
  // Daytona shows a browser interstitial on preview URLs; this header skips it.
  await s("Network.setExtraHTTPHeaders", { headers: { "X-Daytona-Skip-Preview-Warning": "true" } });
  return {
    async goto(url) {
      const loaded = cdp.once("Page.loadEventFired");
      await s("Page.navigate", { url });
      await loaded;
    },
    async eval(expression) {
      const r = await s("Runtime.evaluate", { expression, returnByValue: true });
      if (r.exceptionDetails) throw new Error(`page eval failed: ${r.exceptionDetails.text}`);
      return r.result.value;
    },
  };
}

// Pick the wiki page whose keywords overlap the question most; null if nothing matches.
export function bestLink(question, links) {
  const words = new Set(question.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  let best = { score: 0, href: null };
  for (const l of links) {
    const score = l.kw.split(/\s+/).filter((k) => words.has(k)).length;
    if (score > best.score) best = { score, href: l.href };
  }
  return best.href;
}

async function research(question, wiki) {
  const { data } = await anchor("POST", "/sessions", { session: { timeout: { max_duration: 3, idle_timeout: 1 } } });
  const cdp = await cdpConnect(data.cdp_url);
  try {
    const page = await openPage(cdp);
    await page.goto(wiki.replace(/\/?$/, "/"));
    const links = await page.eval(
      `[...document.querySelectorAll('a[data-keywords]')].map(a => ({ href: a.href, kw: a.dataset.keywords }))`,
    );
    const href = bestLink(question, links);
    if (!href) return { error: "no wiki page matches the question" };
    await page.goto(href);
    return await page.eval(`({ fact: document.querySelector('[data-fact]').textContent.trim(), source: location.href })`);
  } finally {
    cdp.close();
    await anchor("DELETE", `/sessions/${data.id}`).catch(() => {});
  }
}

if (process.argv[2] === "--self-test") {
  const { strict: assert } = await import("node:assert");
  const links = [{ href: "/q3", kw: "q3 revenue" }, { href: "/hc", kw: "hiring headcount" }];
  assert.equal(bestLink("How does our Q3 look?", links), "/q3");
  assert.equal(bestLink("Are we hiring?", links), "/hc");
  assert.equal(bestLink("What's the weather?", links), null);
  console.log("ok");
} else {
  console.log(JSON.stringify(await research(process.argv[2], process.argv[3])));
}
