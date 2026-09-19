# Phase 2 — Design system: verified

**Checkpoint: PASS.** The UI looks premium before any mission logic exists.
Verified in a real headless Chrome, not inferred from source.

## Decisions taken

| Decision | Choice | Why |
|---|---|---|
| Type pairing | **A — Editorial Condensed** | Archivo carries both `wdth` and `wght`, so the condensed cut is tunable per surface instead of fixed. Reads as a print masthead rather than a poster face. Geist Mono was already loaded, so the mono costs no extra bytes. |
| Display face | Archivo, `wdth 76` | 752px → 592.5px on the wordmark vs `wdth 100` (ratio 0.788). Measured, not eyeballed. |
| UI face | Instrument Sans | Sentence-case narrative text, neutral against the condensed display. |
| Mono face | Geist Mono | Machine metadata only: `CAM 01`, `01:42`, `SCENE 01 / 03`. |
| Accent | **Coral `#FF5A72`**, single | Reserved for the primary action and the current step. Amber and cyan exist as support colours but are not used simultaneously. |
| Animation | `motion` 13.4.0 (`motion/react`) | `MotionConfig reducedMotion="user"` handles §24 globally. Not `framer-motion` — same project, current name. |
| Styling | CSS Modules + tokens, **no Tailwind** | The spec lists Tailwind as fallback stack; §2 says use the existing project stack. |

A rejected alternative worth recording: **Big Shoulders** (pairing B) renders 506px —
genuinely dramatic, but its nightclub-signage register sits adjacent to the brief's
own "gaming streamer UI / cartoon GTA parody" failure mode. Rejected on that
ground, not on quality.

## Files

```
src/styles/tokens.css                    colour, type, space, motion tokens
src/app/globals.css                      reset + focus + reduced-motion baseline
src/app/layout.tsx                       fonts, MotionConfig, metadata
src/lib/motion.ts                        shared transition + variant vocabulary
src/components/ui/Button.tsx             the only button, 3 variants
src/components/ui/Typography.tsx         Display / Metadata / Prose
src/components/ui/CornerBracket.tsx      single corner + all-four frame
src/components/ui/ProgressBar.tsx        segmented, SCENE 01 / 03
src/components/ui/RuleLine.tsx           hairline rule, optional label
src/components/shell/Shell.tsx           GameShell + FilmGrain/Vignette/Scanlines
src/app/design/page.tsx                  the playground (checkpoint evidence)
scripts/contrast.mjs                     WCAG checker with a planted control
```

`src/app/design/type/` (the Phase 2 specimen used to choose the pairing) was
deleted once the decision landed — the specimen was a decision instrument, not
product code.

## Contrast — measured, not eyeballed

`node scripts/contrast.mjs` exits non-zero if any declared pair drops below its
minimum. It carries a **planted positive control**: `paper on coral` measures
2.47:1 and must always FAIL. If that row ever passes, the checker is blind and
every other PASS is worthless.

| Pair | Ratio | Grade |
|---|---|---|
| paper on base | 16.21:1 | AA |
| paper on surface-1 | 15.23:1 | AA |
| muted on base | 5.87:1 | AA |
| muted-hi on base | 8.29:1 | AA |
| base on coral (primary label) | 6.56:1 | AA |
| coral on base (accent text) | 6.56:1 | AA |

**Coral is a fill, never a surface for off-white text.** That is the 2.47:1 row.

## Two real defects found and fixed during verification

1. **Overlays leaked to the whole page.** `FilmGrain`/`Vignette`/`Scanlines` were
   `position: fixed`, so the nested `<Scanlines />` demo instance in the HUD block
   covered the entire viewport and the plate's nested vignette/grain double-graded
   the page — visible as horizontal banding across the whole screenshot. Fixed by
   making `local` (absolute, fills the positioned ancestor) the default and adding
   an explicit `scope="viewport"` for page grading. Verified afterwards by
   measurement: plate-local layers are 1310×560, viewport layers 1569×905, and the
   scanline demo is confined to its 241×130 box.

   The follow-on trap: switching everything to `absolute` would have made a
   viewport vignette stretch over the full document height, so the two scopes had
   to be expressed separately rather than one replacing the other.

2. **CSS Modules collision.** A scale named `display` clashed with the `.display`
   base rule, so `styles.display` resolved to the wrong rule and the base class was
   applied twice. Base renamed to `.base`.

## Also verified

- **ProgressBar states** measured, not eyeballed: `done` = `rgba(237,232,221,0.28)`,
  `active` = `rgb(255,90,114)`, `todo` = `rgb(29,32,37)`. Hierarchy is correct —
  the current step is the only coral element.
- **CornerBracket placement**: the active tile carries 4 brackets at
  `rgb(255,90,114)`; idle tiles carry none. Determined by measurement after the
  screenshot made it ambiguous.
- **Build**: `npm run build` → 4 static routes (`/`, `/design`, `/spike`, `/_not-found`).
- `npx tsc --noEmit` and `npx eslint src` both clean.

## Notes on the composed fragments

Blocks 05 and 06 of the playground are the actual checkpoint: a title-screen
overlay and three mission tiles built only from primitives. Both compose over the
placeholder scene; the title plate uses a **directional** scrim (opaque left where
type sits, clearing right) rather than a flat veil, so the scene stays visible
instead of being killed by an even darkening.

## Carried forward

- The playground composes over `public/scenes/night-marina.svg`, still the
  placeholder-grade asset. Real art is coming per `docs/SCENE-BRIEFS.md`.
- The Vignette component exposes a `radius` prop idea but currently hard-codes the
  gradient in CSS per intensity. If a scoped vignette is ever needed on a small
  pane, that will need attention — noted, not built.
