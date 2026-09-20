#!/usr/bin/env node
/**
 * THROWAWAY — delete before commit.
 *
 * Captures the sequence's real timeline: which frame is active, and when, from
 * the moment Enter is pressed until the overlay clears.
 *
 * Why this is worth its own run: a sequence stuck on frame 1 and a sequence
 * playing correctly look identical in a single screenshot. The frame counter
 * advancing is the only thing that distinguishes them. It also separates the
 * sequence's own duration from time spent waiting on the dev server to compile
 * the /missions route, which is what the start-paths test was actually timing.
 */

const PORT = Number(process.env.CDP_PORT ?? 9333);
const APP = process.env.APP ?? "http://localhost:3000/";
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

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const t = list.find((x) => x.type === "page" && x.webSocketDebuggerUrl);
  if (!t) throw new Error("no CDP page target");
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", () => rej(new Error("ws failed")), { once: true });
  });
  const cdp = new CDP(ws);
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });

  const evaluate = async (expression) => {
    const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true });
    if (r.exceptionDetails) throw new Error("eval threw");
    return r.result?.value;
  };

  await cdp.send("Page.navigate", { url: APP });
  await sleep(2200);
  if (!(await evaluate("!!document.querySelector('h1')"))) {
    throw new Error("title did not render");
  }

  const SAMPLE = `(() => {
    const ov = document.querySelector('[class*=overlay]');
    if (!ov) return 'GONE';
    const imgs = [...ov.querySelectorAll('img')];
    const act = imgs.findIndex(i => i.dataset.active === 'true');
    return String(act);
  })()`;

  const t0 = Date.now();
  for (const type of ["keyDown", "keyUp"]) {
    await cdp.send("Input.dispatchKeyEvent", {
      type, key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r",
    });
  }

  /** [elapsedMs, active frame index or GONE] */
  const samples = [];
  while (Date.now() - t0 < 15000) {
    const state = await evaluate(SAMPLE);
    samples.push([Date.now() - t0, state]);
    if (state === "GONE" && samples.length > 4) break;
    await sleep(90);
  }

  // Collapse runs of identical state into "frame N held for Xms".
  const runs = [];
  for (const [ms, state] of samples) {
    const last = runs[runs.length - 1];
    if (last && last.state === state) last.end = ms;
    else runs.push({ state, start: ms, end: ms });
  }

  console.log("\n=== sequence timeline ===");
  let prevEnd = 0;
  let firstFrameAt = null;
  let goneAt = null;
  for (const r of runs) {
    if (r.state !== "GONE" && firstFrameAt === null) firstFrameAt = r.start;
    if (r.state === "GONE") goneAt = r.start;
    const label = r.state === "GONE" ? "overlay cleared" : `frame ${r.state}`;
    const gap = r.start - prevEnd;
    console.log(
      `  +${String(r.start).padStart(5)}ms  ${label.padEnd(18)} held ~${r.end - r.start}ms` +
        (gap > 200 ? `   (gap ${gap}ms)` : ""),
    );
    prevEnd = r.end;
  }

  const distinct = new Set(runs.filter((r) => r.state !== "GONE").map((r) => r.state));
  console.log(
    `\n  distinct frames rendered: ${distinct.size}` +
      `   sequence visible for ~${goneAt === null ? "?" : goneAt - firstFrameAt}ms`,
  );
  if (distinct.size < 2) {
    console.log("  WARNING: fewer than two frames — the sequence is not advancing.");
  }

  ws.close();
  process.exit(0);
}

main().catch((e) => {
  console.error("TIMING ERROR:", e.message);
  process.exit(1);
});
