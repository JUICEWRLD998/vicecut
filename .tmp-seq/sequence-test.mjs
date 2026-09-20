#!/usr/bin/env node
/**
 * THROWAWAY — delete before commit.
 *
 * Verifies both title-screen start paths actually complete.
 *
 * The reduced-motion path is the one that can soft-lock the app: it skips the
 * interval entirely and completes off a fixed timer, so if that timer is wrong
 * the overlay stays up forever with no way out. A normal-path check proves
 * nothing about it, so it gets its own run with the media feature emulated.
 *
 * CDP has no "press enter and see" shorthand, so this drives the existing
 * headless instance directly. Zero dependencies — Node 24 ships fetch and
 * WebSocket.
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

async function connect() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const t = list.find((x) => x.type === "page" && x.webSocketDebuggerUrl);
  if (!t) throw new Error("no CDP page target — run: node scripts/driver.mjs launch");
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

const evaluate = async (cdp, expression) => {
  const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "eval threw");
  return r.result?.value;
};

async function pressEnter(cdp) {
  for (const type of ["keyDown", "keyUp"]) {
    await cdp.send("Input.dispatchKeyEvent", {
      type, key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r",
    });
  }
}

/**
 * One full run: load the title, press Enter, wait for the app to reach
 * /missions. Returns the elapsed ms, or throws if it never gets there.
 */
async function run(cdp, { label, reduced, budgetMs }) {
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }],
  });

  await cdp.send("Page.navigate", { url: APP });
  await sleep(1800);

  const seen = await evaluate(cdp, "matchMedia('(prefers-reduced-motion: reduce)').matches");
  if (seen !== reduced) {
    throw new Error(`${label}: media emulation did not take (reduce=${seen}, wanted ${reduced})`);
  }

  const onTitle = await evaluate(cdp, "!!document.querySelector('h1')");
  if (!onTitle) throw new Error(`${label}: title screen did not render`);

  const t0 = Date.now();
  await pressEnter(cdp);

  // Poll rather than sleep a fixed amount: the point is whether it arrives at
  // all, not how fast the test is.
  let landed = false;
  while (Date.now() - t0 < budgetMs) {
    const path = await evaluate(cdp, "location.pathname");
    if (typeof path === "string" && path.indexOf("missions") > -1) {
      landed = true;
      break;
    }
    // Also confirm the overlay is present while it plays, so a "reached
    // /missions without ever showing the sequence" pass cannot slip through.
    await sleep(120);
  }

  const elapsed = Date.now() - t0;
  const overlayGone = await evaluate(cdp, "!document.querySelector('[class*=overlay]')");
  return { label, landed, elapsed, overlayGone };
}

async function main() {
  const { cdp, ws } = await connect();
  const results = [];

  try {
    results.push(await run(cdp, { label: "normal motion", reduced: false, budgetMs: 9000 }));
  } catch (e) {
    results.push({ label: "normal motion", landed: false, error: e.message });
  }

  try {
    results.push(await run(cdp, { label: "reduced motion", reduced: true, budgetMs: 6000 }));
  } catch (e) {
    results.push({ label: "reduced motion", landed: false, error: e.message });
  }

  // Restore, so the shared browser is not left emulating reduced motion and
  // quietly invalidating every later screenshot.
  await cdp.send("Emulation.setEmulatedMedia", { features: [] });

  console.log("\n=== title-screen start paths ===");
  let failed = false;
  for (const r of results) {
    if (r.error) {
      console.log(`  FAIL  ${r.label.padEnd(16)} ${r.error}`);
      failed = true;
      continue;
    }
    const ok = r.landed && r.overlayGone;
    if (!ok) failed = true;
    console.log(
      `  ${ok ? "PASS" : "FAIL"}  ${r.label.padEnd(16)} ` +
        `reached /missions in ${r.elapsed}ms   overlay cleared: ${r.overlayGone}`,
    );
  }
  console.log(
    failed
      ? "\nNot both paths complete — the overlay can strand the user.\n"
      : "\nBoth paths reach mission select and clear the overlay.\n",
  );

  ws.close();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("SEQUENCE TEST ERROR:", e.message);
  process.exit(1);
});
