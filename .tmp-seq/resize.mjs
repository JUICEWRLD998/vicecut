#!/usr/bin/env node
/**
 * THROWAWAY — delete before commit.
 *
 * Applies the six chosen sequence stills to public/seq/, downscaled to
 * 1920x1080.
 *
 * They render full-bleed for ~560ms each, so the 3840x2160 masters are wasted
 * bytes: six of them would be roughly 6MB for imagery that never displays above
 * ~1600px, spent during a transition where bandwidth is the one thing you
 * cannot afford. Half resolution still exceeds what the stage needs.
 *
 * Downscales with headless Chrome's canvas rather than adding an image library:
 * the project has no sharp/jimp dependency and should not gain one for a
 * one-off. Node 24 ships fetch and WebSocket, so this is zero-dependency like
 * scripts/driver.mjs.
 */

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const PORT = Number(process.env.PORT ?? 9455);
const CHROME =
  process.env.CHROME_PATH ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROFILE = join(tmpdir(), "vice-resize-chrome");
const DIR = resolve(import.meta.dirname ?? ".");

const OUT_W = 1920;
const OUT_H = 1080;
const QUALITY = 0.82;

/**
 * Chosen after looking at all 42 Places stills.
 *
 * Ordered as an arc rather than for individual strength: dusk -> gold -> blue ->
 * green -> night -> neon. The last still is the neon skyline on purpose — it is
 * the darkest and most saturated, so the sequence lands on the same note the
 * mission-select screen then picks up. Screened out several otherwise strong
 * frames for beachwear/swimwear content, since this is shown to strangers.
 */
const PICKS = [
  "Vice_City_01",                  // VICE CITY sign at dusk, jet overhead
  "Ambrosia_04",                   // golden hour, burning fields, power lines
  "Leonida_Keys_01",               // turquoise Keys from the air, day
  "Mount_Kalaga_National_Park_05", // jungle waterhole, golden hour
  "Port_Gellhorn_01",              // Starlet Motel, night neon
  "Vice_City_08",                  // Vice City neon at night
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const { resolve: res, reject } = this.pending.get(m.id);
        this.pending.delete(m.id);
        m.error ? reject(new Error(JSON.stringify(m.error))) : res(m.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.seq;
    return new Promise((res, rej) => {
      this.pending.set(id, { resolve: res, reject: rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function connect() {
  let list = null;
  for (let i = 0; i < 25; i++) {
    try {
      list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      break;
    } catch {
      await sleep(400);
    }
  }
  if (!list) throw new Error(`CDP unreachable on ${PORT}`);
  const t = list.find((x) => x.type === "page" && x.webSocketDebuggerUrl);
  if (!t) throw new Error("no page target");
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", () => rej(new Error("ws failed")), { once: true });
  });
  const cdp = new CDP(ws);
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  return { cdp, ws };
}

async function main() {
  const srcDir = join(DIR, "pick");
  const outDir = join(DIR, "..", "public", "seq");
  mkdirSync(outDir, { recursive: true });

  // Fail loudly on a missing source rather than silently shipping five frames.
  const have = new Set(readdirSync(srcDir).filter((f) => f.endsWith(".jpg")));
  const missing = PICKS.filter((p) => !have.has(`${p}.jpg`));
  if (missing.length) throw new Error(`missing source stills: ${missing.join(", ")}`);

  mkdirSync(PROFILE, { recursive: true });
  const child = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PROFILE}`,
      "--allow-file-access-from-files",
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { detached: true, stdio: "ignore" },
  );
  child.unref();

  const { cdp, ws } = await connect();

  const page = `<!doctype html><meta charset="utf-8"><body><script>
    window.__resize = (src) => new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => {
        const c = document.createElement('canvas');
        c.width = ${OUT_W}; c.height = ${OUT_H};
        const g = c.getContext('2d');
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = 'high';
        g.drawImage(i, 0, 0, ${OUT_W}, ${OUT_H});
        res(c.toDataURL('image/jpeg', ${QUALITY}).split(',')[1]);
      };
      i.onerror = () => rej(new Error('load failed'));
      i.src = src;
    });
    window.__ready = true;
  </script></body>`;
  const pagePath = join(DIR, "resize.html");
  writeFileSync(pagePath, page, "utf8");
  await cdp.send("Page.navigate", { url: "file:///" + pagePath.replace(/\\/g, "/") });
  await sleep(900);

  let total = 0;
  for (let n = 0; n < PICKS.length; n++) {
    const name = PICKS[n];
    const src = join(srcDir, `${name}.jpg`);
    // Prefixed so the sequence order is the filename order, which makes the
    // arc readable in the data file and on disk.
    const outName = `${String(n + 1).padStart(2, "0")}-${name}.jpg`;
    const r = await cdp.send("Runtime.evaluate", {
      expression: `window.__resize(${JSON.stringify("file:///" + src.replace(/\\/g, "/"))})`,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) {
      throw new Error(`${name}: ${r.exceptionDetails.exception?.description ?? "failed"}`);
    }
    const buf = Buffer.from(r.result.value, "base64");
    writeFileSync(join(outDir, outName), buf);
    total += buf.length;
    console.log(`  ${outName.padEnd(46)} ${(buf.length / 1024).toFixed(0).padStart(5)}KB`);
  }
  console.log(`\n${PICKS.length} stills, ${(total / 1024 / 1024).toFixed(2)}MB total`);
  ws.close();
  process.exit(0);
}

main().catch((e) => {
  console.error("RESIZE ERROR:", e.message);
  process.exit(1);
});
