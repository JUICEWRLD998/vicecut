# Phase 8 — Polish pass: verified

**Checkpoint: PASS on every measurable axis, and one content defect found and
fixed that no amount of source-reading would have surfaced.**

§27 calls this phase mandatory and §29 Rules 12–13 set the bar: *"Every scene
should be reviewed at the actual deployed viewport"* and *"Do not say 'looks
good' based on source code. Actually inspect the rendered UI."* Phase 8's own list
is spacing, typography, hierarchy, alignment, image crop, transition timing,
button states, hover states, loading states, text contrast and unnecessary UI.

So this pass drove every screen in a real browser and MEASURED the parts that can
be measured, rather than reading them off the source.

## Method

`.tmp-a/phase8.mjs` walks 15 screens and, on each, injects one audit function that
reports:

| Axis | How |
|---|---|
| Contrast | every text-bearing element, resolving its effective background by climbing ancestors and compositing translucent layers, then the WCAG ratio at the right threshold for its size and weight (4.5:1, or 3:1 for large text) |
| Overlap | every pair of enabled interactive controls whose boxes intersect, plus which one wins `elementFromPoint` at the centre of the intersection |
| Overflow | document horizontal overflow, and any element past the right edge |
| Clipped text | elements with a clipped overflow whose content is taller than their box |
| Hover states | the LOCK FRAME button's computed style at rest and under a real pointer move |
| Console | page errors and uncaught exceptions, attributed to the screen |

Screens: title, mission select, brief, briefing clip (playing and frozen), editor,
cinematic, result (top and scrolled), `/design`, `/spike`, and title / select /
brief again at 1366×768.

## Result

```
screensAudited:      15
samplerBlindOn:      []          <- the control passed everywhere
contrastFailures:     0
interactiveOverlaps:  0          <- the Phase 7 toggle fix holds
clippedTextRuns:      0
horizontalOverflow:   []
errors:               0
```

Hover is live, not static: `LOCK FRAME` moves `rgb(255,90,114)` →
`rgb(255,112,133)` under the cursor with `cursor: pointer`.

The audio-toggle fix from Phase 7 is confirmed visually here — `06-editor-01.png`
shows `AUDIO ON` sitting above the LOCK FRAME button rather than across its label,
and the overlap probe independently reports zero.

## The defect that mattered

**Mission 02's art contradicted its own caption.**

The tile rendered `SOUTHBOUND / LEONIDA KEYS / SUNSET / HIGHWAY / HEAT` — its
aria-label says the same — over an image of an **inland Ambrosia field fire**:
power lines, burning scrub, smoke. No highway. No Keys. No subject in the upper
third, just haze.

This is the class of defect that source reading cannot find. `missions.ts` was
internally consistent, the component was correct, the build was clean, and every
automated check passed — because both halves were wrong *together*. It was only
visible by putting the caption next to the picture at the real crop, which is what
rendering the screen does and what the audit's screenshot step caught.

The primary source was re-examined and the whole Leonida Keys still set checked:
Keys 01 is the coastal highway with the bridge causeway and the Vice City skyline
on the horizon — which is what the mission actually claims to be. Keys 02 and 04
are a comedic street scene and a beach bar; 03 is an underwater reef; 05 is an
iguana close-up; 06 is a boat party. Only 01 is the location the brief describes.

**Fixed:** `public/scenes/southbound.jpg` replaced with the Keys highway master
(3840×2160, 810KB, down from 1.1MB), and the tile's `mood` reworded from
"Sunset / Highway / Heat" to **"Daylight / Highway / Heat"** so the words stop
claiming a sunset the photograph does not show. Full reasoning in
`docs/SCENE-SOURCES.md`.

## The second defect, and how it was nearly missed

Replacing the scene created a **duplicate frame inside the mission-select entry
sequence**. That sequence plays three stills and lands on the mission's own scene
so the player arrives where they just travelled to — but the Keys highway is
*also* a sequence still (`public/seq/03-Leonida_Keys_01.jpg`), so mission 02's
transition would open and close on the same photograph inside 900ms.

I guarded it by comparing paths, and my verification reported **PASS**. Both were
wrong, for the same reason: the scene master and the sequence derivative are the
same photograph in two different files, so the strings never matched and the guard
never fired. The check was worse than useless — it certified the bug.

Mission 03 had the same latent problem and always had: its scene *is* the still
the sequence leads with, so its transition opened and closed on one photograph.

**Fixed at the root** in two places:

- `seqStillForScene` in `src/data/missions.ts` declares which scene master and
  which sequence still are the same photograph. It cannot be derived — the paths
  differ and only looking at the two images establishes it — so it is data.
- `entryFrames` in `MissionSelect.tsx` excludes that still from the opener, and
  also excludes the middle still. The destination stays last, because landing on
  it is the point.

Verified against the shipped data and then in the browser:

```
01 The Night Shift   Vice_City_01  -> Mount_Kalaga_05 -> night-shift    distinct
02 Southbound        Mount_Kalaga_05 -> Vice_City_08  -> KEYS-HIGHWAY   distinct
03 No Signal         Vice_City_08  -> Ambrosia_04     -> PORT-GELLHORN  distinct
```

## Detector bugs found and fixed during the pass

Phase 8's own guard-rail required a planted positive control before any negative
result was written down, and it earned its keep twice.

**1. The control certified a blind walker.** The first version planted two spans
and checked only the ratio arithmetic — which passed. Meanwhile the walker
reported `0 text nodes checked, no failures` on the title and mission-select
screens. A zero looked exactly like a clean pass. Two fixes: the walker no longer
skips quietly (every skip reason is counted, so a zero is explainable), and the
control now plants a real failing element **on the page** and requires the same
walker to come back with it. It reports whether the walker can catch a planted
2.85:1 failure, not merely whether the maths is right.

**2. A stale detector manufactured failures.** Five screens reported
`CLIPPED TEXT` on the same paragraph — which was the screen-reader-only live
region, clipped to 1px by design. The detector now recognises the sr-only
treatment and skips it.

**3. A probe that could not see the thing it was testing.** The sequence check
filtered for `/seq/` paths, so it could never observe the transition's final
frame, which is served from `/scenes/`. It now identifies transition stills by
geometry (covering most of the viewport), which is a property of the sequence
rather than of a filename.

**4. A template literal closed a template literal.** Adding the skip telemetry
put a backticked word inside the injected audit string and broke the script's
syntax — the survey died before touching a browser.

## Not changed

Everything else the pass checked was already correct and is left alone: no
contrast failures across 15 screens, no overlaps, no overflow, no clipped text, no
console errors, and the design tokens carry the hierarchy without further tuning.
Two source comments that still named the removed AI debrief in the present tense
were corrected in the Phase 7 commit; the two that describe it in the past tense
as history are kept, because they explain why the current layout is what it is.

## Carried forward

- The `mood` wording is now accurate to the art, but mission 02's `time` field
  still reads `19:18`, in-world clock, while the photograph is midday. Harmless,
  and worth knowing before someone reads the two together.
- §25 demo mode and §26 fallback images are still unbuilt; both belong with
  Phase 9 (demo hardening), which is where the 90-second flow gets rehearsed.
- Phase 10 is the submission hardening pass: README, CREDITS, asset notes. The
  README does not yet exist, and the soundtrack credit currently lives only on
  screen and in `public/audio/README.md`.
