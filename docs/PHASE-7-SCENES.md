# Phase 7 — Southbound + No Signal: verified

**Checkpoint: PASS on the data contract, the build, and every check that does not
need a browser. PARTIAL on rendered verification — see "What is NOT verified".**

Phase 7 asks for two more scenes that "duplicate the architecture, NOT the exact
visual composition", each with **distinct art, distinct instruction, distinct
editing behavior, distinct cinematic treatment**. This records what was built,
what was verified, how, and the two traps that cost time.

## What Phase 7 turned out to be

The scenes themselves were largely authored in earlier phases — `southbound` and
`no-signal` already had scene art, briefs, briefing clips, targets and toolsets.
What was genuinely missing was **distinct cinematic treatment**: all three results
rendered identical chrome, so the third scene answered with the first scene's
words. The cause was specific and worth naming:

**Per-mission data was authored and then never rendered.** `mission.slate` carries
`framing`, `genre` and `process` for every mission — "Tight two / Neon noir /
Annotated print" for the night shift, "Raked push-in / Sunset pursuit / Framed
print" for Southbound — and nothing read the first three fields. `verdict` was the
only one in use.

So Phase 7's substantive work was closing that gap and removing the three places
where mission 01's vocabulary had leaked into shared chrome:

| Leak | Was | Now |
|---|---|---|
| The freeze panel's action | hardcoded "Mark the frame where it goes wrong" — mission 01's wording | `mission.instruction`, verbatim |
| The comparison plate's caption | hardcoded "The moment" | `briefing.targetLabel` — "The car", "The target" |
| The editor footer's answer key | hardcoded "the moment" | `briefing.targetLabel` + `momentHint` |

The result screen's slate is now rendered from data (`SlateStrip` in
`MissionOutcome.tsx`), which is what makes the three outcomes read as three
different operations rather than one screen reskinned.

## Files

```
src/data/missions.ts                             per-mission data (the layer)
src/components/missions/MissionOutcome.tsx       SlateStrip + MeasuredReadout + ScorePanel
src/components/missions/CutComparison.tsx        §21 plate, per-mission targetLabel
src/components/missions/MissionCinematic.tsx     renders the slate, HUD, beats, result
src/components/missions/BriefingClip.tsx         per-mission instruction on the freeze
src/components/editor/DirectorEditor.tsx         per-mission targetLabel in the footer
src/components/editor/editor-skin.ts             rail labels + glyphs, translations
src/components/editor/film-tools.ts              the tool legend
src/components/shell/Shell.module.css            audio toggle placement (fixed this phase)
```

Adding a fourth operation is still one object in `missions.ts`.

## Verified — how, and with what result

| Check | Method | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | exit 0 |
| Lint | `npx eslint` | 1 error, in `.tmp-ref/ref.js` (scratch, not shipped); 0 in `src/` |
| Production build | `npm run build` | exit 0; `/mission/the-night-shift`, `/mission/southbound`, `/mission/no-signal` all prerender as SSG |
| **Per-mission distinctness** | `.tmp-a/contract.cjs` against the real data module | **34/34 checks pass** |

The contract check asserts, per mission: distinct scene file, crop focus, mood,
clip opener, instruction, `targetLabel`, `momentHint`, slate `verdict`, toolset,
editor frame, shot, genre, process, radio line, objective, time and location —
**27 distinctness assertions**, plus that the four §16 toolsets match their briefs
(Southbound framing-led per §11, No Signal obstruction-led per §12), that no two
missions grade against the same target rect, that `SlateStrip` actually reads the
three slate fields, and that **none of the six rendered components carries a
hardcoded per-mission string**.

Rendered in a headless browser (from the runs that got through before the
debug-port failure below):

- **Mission 01, in the editor.** `EDITOR LIVE`, rail exactly `GRADE / FRAME /
  MARK / SLATE / SHAPE / PROP / MATTE` (7 tools, matching its toolset), the tool
  legend present, and the footer answer key reading `THE MOMENT: THE BURNING CAR.
  LEFT OF CENTRE, LOW IN FRAME.` — i.e. the per-mission `momentHint` is wired.
- **Mission 01, briefing clip.** Four frames with the right per-beat radio:
  `FRAME 01 / 04 THE MARINA — LUCIA: "You got one shot."`, `FRAME 02 / 04 THE
  APPROACH — JASON: "Nobody moves till I'm out."`, `FRAME 03 / 04 THE MEET —
  LUCIA: "Clean. Nobody's made us."`, then the freeze with the mission's own
  instruction. All four stills resolve.
- **Mission 01, brief.** Distinct instruction rendered: "Mark the moment the plan
  goes wrong."

## What is NOT verified

Stated plainly, because a passing build is not a passing demo:

- **Southbound and No Signal were not driven through a browser this session.**
  Their distinctness is proven at the data and source level (above) but not
  visually. Their toolsets clearly differ from mission 01's — Southbound's rail
  has no annotation tools at all — but nobody has looked at the rendered screens.
- **The result screen was not reached in a browser.** The LOCK FRAME save on a 4K
  frame did not complete within any browser run this session, so
  `MissionOutcome`, `CutComparison` and `SlateStrip` were never seen rendered.
  Their correctness here rests on source inspection and the contract check.
- **The audio-toggle fix below was not seen rendered** (it landed after Chrome
  stopped accepting connections) and its geometry was not re-measured.

These want a re-run of `.tmp-a/phase7.mjs` once a browser can be attached.

## Defect found and fixed

**The audio toggle sat on top of the action button.** Measured on the editor at
1600×1000, not eyeballed:

```
Lock frame   x 1359..1560   y 843..889
Audio on     x 1435..1552   y 839..874
overlap      117 × 31 px (3627 px²)
elementFromPoint(centre of overlap) -> the Audio toggle
```

So the control that was hit by a click on the bottom-right of LOCK FRAME was the
audio toggle, and the toggle — being `position: fixed` at `--z-hud + 2` while the
editor sits at `z-index: 1` — painted over the button's own label. The screen was
rendering "LOCK FRAME" and "AUDIO ON" on top of each other. The briefing clip's
own action button lands in the same lane, so the same collision happened there.

Root cause is two controls claiming one lane: a session-level control pinned
bottom-right will always fight a screen-level bottom-right action. Fixed by moving
the toggle out of that lane (`bottom: calc(var(--s-6) + var(--s-7))`) rather than
raising the surfaces over it — raising them would only hide a control §34 requires
the player to be able to reach, which is worse than the collision it fixes. The
action bar's top edge measures 78px from the viewport bottom and the new offset is
80px, so it clears at every width.

## Traps worth keeping

### 1. `innerText` forces layout; `textContent` does not

The first two harness runs hung with every CDP call timing out — 12s evaluates,
30s screenshots — while the app sat perfectly healthy in the editor stage. It read
as a broken app. It was not.

The harness was polling `document.body.innerText` every 600ms to wait for the
editor to mount. `innerText` is layout-dependent by spec, so each read forces a
style+layout pass, and the Unlayer editor is mounting a 4K canvas plus a CDN
bundle. The probe was the load. A separate run using only `querySelector`,
`textContent` and `sleep(3000)` brought the editor up clean.

**Rule: never poll `innerText` while a heavy screen is mounting.** Poll cheap DOM
(`textContent`, `querySelectorAll`), read `innerText` once the screen has settled,
and treat a *cluster* of timeouts across unrelated calls as a load problem rather
than as N separate bugs. A single timed `node count` probe is what settled it:
2–6ms steady, then 1394ms during one mount.

### 2. The same path can fail two different ways, and neither is the app

Runs 1 and 2 both looked like "the app breaks after the briefing clip" and had
different causes: run 1 was the `innerText` load above; run 2 died on an
unhandled rejection with its reason on stderr, which had been redirected away, so
the log simply stopped mid-mission. **A verification log that stops without
saying why is indistinguishable from a crash**, and two runs of the same harness
are not two data points if the harness is what differs.

Corollaries that are now baked into the harness:

- Every CDP call carries a deadline; a failed probe returns a value, never throws.
- Bothered stderr is captured, not discarded — `node x.mjs > /dev/null 2>&1;
  echo $?` reports the *wrapper's* exit code, which was 0 while the node script
  had exited 1.
- `Document.body.innerText` splits words at element boundaries — the title screen
  renders `"VICE\nCUT"` — so text matching is done on a whitespace-collapsed copy,
  and the planted control asserts the uncollapsed form would have failed.

### 3. Two buttons can share one label, so click by position

Both the editor's own toolbar save and the app's footer button read "lock frame".
A text-only clicker presses whichever is first in the DOM, which is the editor's
toolbar button inside the editor's chrome — not the action the flow assumes.
The harness now picks the lowest on screen for that one.

## Carried forward

- Re-run `.tmp-a/phase7.mjs` for all three missions once Chrome can bind a debug
  port; confirm the result screen renders, and that no collision remains between
  the audio toggle and any bottom-right action.
- §25 demo mode and §26 fallback images are still not built; they belong with
  Phase 9 (demo hardening), which is where the 90-second flow gets rehearsed.
- Phase 8 (polish pass) has not been run. The result screen in particular has
  never been looked at.
