#!/usr/bin/env node
/**
 * CDP driver for local verification. Zero dependencies — Node 24 ships fetch and
 * WebSocket.
 *
 *   node scripts/driver.mjs launch            start headless Chrome (idempotent)
 *   node scripts/driver.mjs targets           list CDP page targets
 *   node scripts/driver.mjs goto <url>        navigate the app target
 *   node scripts/driver.mjs until "<expr>"    poll a JS expression until truthy
 *   node scripts/driver.mjs eval "<expr>"     evaluate and print JSON
 *   node scripts/driver.mjs shot <name>       screenshot to the shots dir
 *   node scripts/driver.mjs logs              dump captured console/page errors
 *   node scripts/driver.mjs click --text "<t>"| click "<selector>"
 *   node scripts/driver.mjs moveto <x> <y>    hover
 *   node scripts/driver.mjs drag <x1> <y1> <x2> <y2>
 *   node scripts/driver.mjs key <Key>         press a key
 *   node scripts/driver.mjs kill              stop Chrome
 *
 * Probes read the app's own self-reported state, never a structural guess: a
 * stale structural probe manufactures failures instead of failing honestly.
 */

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.CDP_PORT ?? 9333);
const BASE = `http://127.0.0.1:${PORT}`;
const APP_URL = process.env.APP_URL ?? "http://localhost:3000/spike";
const CHROME =
  process.env.CHROME_PATH ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROFILE = join(tmpdir(), "vicecut-chrome");
const SHOTS = join(tmpdir(), "vicecut-shots");

const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
    this.console = [];
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error
          ? reject(new Error(JSON.stringify(msg.error)))
          : resolve(msg.result);
        return;
      }
      if (msg.method === "Runtime.consoleAPICalled") {
        const text = (msg.params.args ?? [])
          .map((a) => a.value ?? a.description ?? a.type)
          .join(" ");
        this.console.push({ kind: "console", level: msg.params.type, text });
      }
      if (msg.method === "Runtime.exceptionThrown") {
        this.console.push({
          kind: "exception",
          text:
            msg.params.exceptionDetails?.exception?.description ??
            msg.params.exceptionDetails?.text ??
            "unknown",
        });
      }
      if (msg.method === "Log.entryAdded") {
        const e = msg.params.entry;
        this.console.push({
          kind: "log",
          level: e.level,
          text: `${e.url ?? ""} ${e.text}`.trim(),
        });
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function listTargets() {
  try {
    return await (await fetch(`${BASE}/json/list`)).json();
  } catch {
    return null;
  }
}

/** Prefer the target already on the app; fall back to any page target. */
async function findTarget() {
  const list = await listTargets();
  if (!list) return null;
  const pages = list.filter((t) => t.type === "page" && t.webSocketDebuggerUrl);
  return (
    pages.find((t) => /localhost:3000|127\.0\.0\.1:3000/.test(t.url)) ??
    pages[0] ??
    null
  );
}

async function connect() {
  let target = await findTarget();
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(500);
    target = await findTarget();
  }
  if (!target) {
    throw new Error("no CDP page target — run: node scripts/driver.mjs launch");
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", () => rej(new Error("CDP websocket failed")), {
      once: true,
    });
  });
  const cdp = new CDP(ws);
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("Log.enable");
  return { cdp, ws, target };
}

async function launch() {
  if (await findTarget()) {
    log("chrome already serving a target on", PORT);
    return;
  }
  if (!existsSync(CHROME)) throw new Error(`chrome not found at ${CHROME}`);
  mkdirSync(PROFILE, { recursive: true });
  mkdirSync(SHOTS, { recursive: true });
  const child = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PROFILE}`,
      "--window-size=1600,1000",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-features=Translate,PaintHolding",
      APP_URL,
    ],
    { detached: true, stdio: "ignore" },
  );
  child.unref();
  log("launched chrome ->", APP_URL);
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  if (cmd === "launch") return launch();

  if (cmd === "kill") {
    spawn("taskkill", ["/F", "/IM", "chrome.exe"], { stdio: "ignore" });
    log("chrome stopped");
    return;
  }

  if (cmd === "targets") {
    const list = await listTargets();
    if (!list) throw new Error("CDP not reachable — run launch first");
    const pages = list
      .filter((t) => t.type === "page")
      .map((t) => ({ url: t.url, id: t.id }));
    log(JSON.stringify(pages, null, 2));
    return;
  }

  const { cdp, ws, target } = await connect();
  const finish = async (result) => {
    log(result);
    try {
      ws.close();
    } catch {}
    process.exit(0);
  };

  if (cmd === "goto") {
    const url = args[0] ?? APP_URL;
    const done = new Promise((resolve) => {
      const onMsg = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.method === "Page.loadEventFired") {
          ws.removeEventListener("message", onMsg);
          resolve();
        }
      };
      ws.addEventListener("message", onMsg);
    });
    await cdp.send("Page.navigate", { url });
    await Promise.race([done, sleep(20_000)]);
    await sleep(1200);
    return finish(`navigated ${target.url} -> ${url}`);
  }

  if (cmd === "eval") {
    const r = await cdp.send("Runtime.evaluate", {
      expression: args.join(" "),
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) {
      return finish(
        `EVAL THREW: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`,
      );
    }
    return finish(JSON.stringify(r.result?.value ?? r.result, null, 2));
  }

  if (cmd === "until") {
    const expr = args.join(" ");
    const deadline = Date.now() + Number(process.env.UNTIL_MS ?? 45_000);
    while (Date.now() < deadline) {
      const r = await cdp.send("Runtime.evaluate", {
        expression: expr,
        returnByValue: true,
      });
      if (r.result?.value) return finish(`CONDITION MET: ${expr}`);
      await sleep(400);
    }
    return finish(`TIMEOUT waiting for: ${expr}`);
  }

  if (cmd === "shot") {
    mkdirSync(SHOTS, { recursive: true });
    const name = args[0] ?? `shot-${Date.now()}`;
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
    const path = join(SHOTS, `${name}.png`);
    writeFileSync(path, Buffer.from(data, "base64"));
    return finish(path);
  }

  if (cmd === "logs") {
    return finish(JSON.stringify(cdp.console.slice(-40), null, 2));
  }

  const pointFrom = async (selArgs) => {
    if (selArgs[0] === "--text") {
      const text = selArgs.slice(1).join(" ");
      const r = await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const t = ${JSON.stringify(text)}.toLowerCase();
          const els = [...document.querySelectorAll('button,[role=button],a,[tabindex],[class*=tool]')];
          const hit = els.find(e => ((e.innerText||e.textContent||'').trim().toLowerCase()) === t)
                   ?? els.find(e => ((e.innerText||e.textContent||'').trim().toLowerCase()).includes(t));
          if (!hit) return null;
          const b = hit.getBoundingClientRect();
          if (!b.width || !b.height) return { missing: 'zero-size', label: (hit.innerText||'').trim().slice(0,80) };
          return { x: b.x + b.width/2, y: b.y + b.height/2, label: (hit.innerText||'').trim().slice(0,80) };
        })()`,
        returnByValue: true,
      });
      return r.result?.value ?? null;
    }
    const r = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const el = document.querySelector(${JSON.stringify(selArgs[0])});
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { x: b.x + b.width/2, y: b.y + b.height/2, label: el.tagName };
      })()`,
      returnByValue: true,
    });
    return r.result?.value ?? null;
  };

  if (cmd === "click") {
    const p = await pointFrom(args);
    if (!p) throw new Error(`no match for: ${args.join(" ")}`);
    if (p.missing) throw new Error(`matched but unusable (${p.missing}): ${p.label}`);
    for (const type of ["mousePressed", "mouseReleased"]) {
      await cdp.send("Input.dispatchMouseEvent", {
        type,
        x: p.x,
        y: p.y,
        button: "left",
        clickCount: 1,
        buttons: type === "mousePressed" ? 1 : 0,
      });
    }
    return finish(`clicked ${p.label || ""} at ${Math.round(p.x)},${Math.round(p.y)}`);
  }

  if (cmd === "moveto") {
    const [x, y] = args.map(Number);
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, buttons: 0 });
    return finish(`moved to ${x},${y}`);
  }

  if (cmd === "drag") {
    const [x1, y1, x2, y2] = args.map(Number);
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x1, y: y1, buttons: 0 });
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mousePressed", x: x1, y: y1, button: "left", clickCount: 1, buttons: 1,
    });
    const steps = 16;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: Math.round(x1 + (x2 - x1) * t),
        y: Math.round(y1 + (y2 - y1) * t),
        button: "left",
        buttons: 1,
      });
      await sleep(14);
    }
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseReleased", x: x2, y: y2, button: "left", clickCount: 1, buttons: 0,
    });
    return finish(`dragged ${x1},${y1} -> ${x2},${y2}`);
  }

  if (cmd === "key") {
    const key = args[0];
    const codes = {
      Escape: { code: "Escape", keyCode: 27, text: "" },
      Enter: { code: "Enter", keyCode: 13, text: "\r" },
    };
    const c = codes[key] ?? { code: key, keyCode: 0, text: "" };
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyDown", key, code: c.code, windowsVirtualKeyCode: c.keyCode, text: c.text,
    });
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyUp", key, code: c.code, windowsVirtualKeyCode: c.keyCode,
    });
    return finish(`pressed ${key}`);
  }

  throw new Error(`unknown command: ${cmd}`);
}

main().catch((e) => {
  console.error("DRIVER ERROR:", e.message);
  process.exit(1);
});
