#!/usr/bin/env node
/**
 * WCAG contrast checker for the token palette.
 *
 * Contrast must be measured, not eyeballed: "bright enough" and "16:1" feel
 * identical, while "1.00:1" silently deletes a button.
 *
 *   node scripts/contrast.mjs            # check every declared pair
 *   node scripts/contrast.mjs --audit    # print all pairs vs the base surface
 */

const PAIRS = [
  // [foreground, background, label, minimum required, expectFail?]
  //
  // The last entry is a PLANTED POSITIVE CONTROL: paper-on-coral measures
  // 2.47:1 and is intentionally below AA, so it must always FAIL. If it ever
  // passes, this checker is blind and every PASS above it is worthless.
  ["#EDE8DD", "#090A0C", "paper on base", 4.5],
  ["#EDE8DD", "#111316", "paper on surface-1", 4.5],
  ["#EDE8DD", "#16181C", "paper on surface-2", 4.5],
  ["#8C8C88", "#090A0C", "muted on base", 4.5],
  ["#8C8C88", "#111316", "muted on surface-1", 4.5],
  ["#A8A8A3", "#090A0C", "muted-hi on base", 4.5],
  ["#090A0C", "#FF5A72", "base on coral (primary button label)", 4.5],
  ["#090A0C", "#FF7085", "base on coral-hi (button hover label)", 4.5],
  ["#090A0C", "#E84E63", "base on coral-lo (button active label)", 4.5],
  ["#090A0C", "#EDE8DD", "base on paper (inverse button)", 4.5],
  ["#FF5A72", "#090A0C", "coral on base (accent text)", 3.0],
  ["#FF5A72", "#111316", "coral on surface-1", 3.0],
  ["#A8A8A3", "#090A0C", "muted-hi on base (11px meta)", 4.5],
  ["#FFB35C", "#090A0C", "amber on base", 3.0],
  ["#55D8E8", "#090A0C", "cyan on base", 3.0],
  ["#EDE8DD", "#FF5A72", "CONTROL — paper on coral, must fail", 4.5, true],
];

const hex = (h) => {
  const v = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
};

const lin = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = (h) => {
  const [r, g, b] = hex(h).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

if (process.argv.includes("--audit")) {
  const bg = process.argv[3] ?? "#090A0C";
  const fgs = [
    "#EDE8DD", "#8C8C88", "#A8A8A3", "#FFFFFF", "#000000",
    "#FF5A72", "#FFB35C", "#55D8E8", "#111316", "#16181C",
  ];
  console.log(`all foregrounds against ${bg}:\n`);
  for (const f of fgs) {
    const r = ratio(f, bg);
    console.log(
      `  ${f}  ${r.toFixed(2)}:1  ${r >= 4.5 ? "AA-normal" : r >= 3 ? "AA-large only" : "FAILS"}`,
    );
  }
  process.exit(0);
}

let failed = 0;
let controlFailed = false;

for (const [fg, bg, label, min, expectFail] of PAIRS) {
  const r = ratio(fg, bg);
  const passes = r >= min;
  const ok = expectFail ? !passes : passes;
  if (!ok) failed++;
  if (expectFail && !passes) controlFailed = true;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${r.toFixed(2)}:1  (need ${min})${expectFail ? " [control]" : ""}  ${label}  ${fg} on ${bg}`,
  );
}

if (!controlFailed) {
  console.log(
    "\nCONTROL DID NOT FAIL — the checker is blind. Every PASS above is meaningless.",
  );
  process.exit(1);
}

console.log(
  failed === 0
    ? "\nall declared pairs pass (control failed as designed, so the checker works)"
    : `\n${failed} pair(s) below the required minimum`,
);
process.exit(failed === 0 ? 0 : 1);
