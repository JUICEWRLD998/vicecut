# Phase 3 — Title, mission select, mission brief: verified

**Checkpoint: PASS.** A screen recording of the first 15 seconds reads as a polished
game interface. Verified in a real headless Chrome end to end.

## Flow

```
/                      TITLE       Enter, Space, or click anywhere
/missions              SELECT      ← → to move, 1-3 to jump, Enter to open
/mission/[id]          BRIEF       Direct scene -> dims -> editor
                       DIRECTOR    Lock frame (capture only until Phase 6)
```

Three screens have a reason to exist (§8, §9, §10). The mission flow is **one
route holding stages**, not separate pages, because §17 is explicit that the
hand-off into the editor must not read as routing away — and routing there would
also discard the editor instance on every test of the transition.

## Files

```
src/data/missions.ts                              the mission layer, engine-free
src/components/landing/TitleScreen.tsx            SCREEN 01
src/components/missions/MissionSelect.tsx         SCREEN 02
src/components/missions/MissionBrief.tsx          SCREEN 03
src/components/missions/MissionStage.tsx          brief -> director stage machine
src/components/missions/MissionSelectLink.tsx     back-out, a real anchor
src/components/editor/DirectorEditor.tsx          Unlayer, curated per mission
src/app/missions/page.tsx                         static
src/app/mission/[id]/page.tsx                     SSG via generateStaticParams
public/scenes/coastal-highway.svg                 mission 02 scene
public/scenes/industrial-port.svg                 mission 03 scene
```

`missions.ts` carries everything, so adding an operation is one object rather than
edits across components (§3).

## Tool rails verified against §16

Measured in the browser, not read from code — the tool rail text was queried after
mounting each mission's editor:

| Mission | §16 asks for | Rendered rail |
|---|---|---|
| The Night Shift | draw, text, shapes, crop, filter | Filter, Crop, Draw, Text, Shapes |
| Southbound | crop, resize, filters, framing | Filter, Crop, Resize |
| No Signal | drawing, shapes, text, filters | Filter, Draw, Text, Shapes |

## Defects found and fixed

1. **An omitted tool key is not "off".** Mission 01's tool map did not mention
   `resize`, and `Resize` appeared in the rail anyway — the editor falls back to
   its own default (enabled) for any key you leave out. Only the explicitly-false
   `stickers` and `frame` were suppressed. Fixed at the root: every key in
   `EditorTools` is now required, so omitting one is a compile error rather than a
   silent extra tool. Round-tripped through all three missions to confirm.
2. **`autoFocus` on the start prompt.** It painted a focus ring on the prompt at
   first paint, making the prompt read as a boxed button rather than a line of
   text on the scene. Enter is handled globally, so autofocus earned nothing —
   removed. Tabbing still reaches it, and `:focus-visible` still shows for
   keyboard users.

## Verification notes worth keeping

- **Two false negatives, both from dev-server latency, not the app.** After
  navigating to a route the dev server had not compiled yet, the page reported as
  not-navigated. Both looked exactly like a broken handler. The tell: a
  `keydown` probe on `window` showed the event arriving, and the destination
  rendered correctly a few seconds later. Check whether a probe failure is the
  app or the harness before chasing the app.
- **LOCK FRAME both paths exercised.** With no editor save, the frame comes from
  `getImage()` and is logged as `canvas fallback, no editor save` — §26's honesty
  requirement is satisfied by recording the provenance, not by pretending a save
  happened. With an editor save it is `onSave`, a JPEG, no degraded marker.

## Build

```
/                    static
/missions            static
/mission/[id]        SSG — the-night-shift, southbound, no-signal prerendered
/design              static (Phase 2 playground, kept)
/spike               static (Phase 1 harness, kept)
```

`tsc` and `eslint` clean.

## Carried forward

- **`public/scenes/coastal-highway.svg` is the weakest asset.** At full size the
  palms and the car read as clip art — hard crisp edges and drawn fronds, which is
  the "filled outlines instead of shaded forms" tell. `night-marina.svg` holds up;
  `industrial-port.svg` is in between. All three are placeholders scheduled for
  replacement per `docs/SCENE-BRIEFS.md`, and Southbound should be first to go.
- LOCK FRAME currently captures and logs. Phase 6 turns the captured frame into
  the cinematic, which is where `CapturedFrame.dataUrl` becomes the opening shot.
- §25 demo mode and §26 fallback images are not built yet; they belong with the
  cinematic in Phase 6/9.
