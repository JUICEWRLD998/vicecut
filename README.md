# VICE CUT — The Mission Director

> **Edit the world. Lock the frame. Roll the mission.**

VICE CUT is a cinematic mission-director built around the **Unlayer React Image Editor**. You pick an operation, watch a short briefing clip, then step into the real Unlayer editor and direct a frozen frame yourself. Press **LOCK FRAME** and the editor disappears — your edited image takes the screen and becomes the opening shot of a mission cinematic, which then measures what you actually did to the frame and grades the cut.

A fan-made, non-commercial hackathon entry. Not affiliated with Rockstar Games or Take-Two Interactive.

```
TITLE → SELECT OPERATION → BRIEF → BRIEFING CLIP → UNLAYER EDITOR
      → LOCK FRAME → CINEMATIC → DIRECTOR'S CUT → ROLL AGAIN
```

---

## The idea

Most image-editor demos prove an editor works. This one asks what the edit is *for*.

Mission 01's instruction is **"Mark the moment the plan goes wrong."** To act on that you have to have seen the plan, and seen it go wrong — so the mission opens with a briefing clip that shows the meet, the approach and the burning car, freezes on the last frame, and hands *that* frame to the editor. The edit becomes evidence, not decoration. The locked frame then opens the mission cinematic, and the result screen tells you whether your mark landed where the brief pointed.

---

## What's in it

| Piece | What it does |
|---|---|
| **Title screen** | Full-bleed key art, no navbar, keyboard start (Enter / Space / click) |
| **Mission select** | Three visual tiles, arrow-key navigation, `1`–`3` to jump |
| **Mission brief** | The instruction as the loudest element; the scene dims as the editor enters |
| **Briefing clip** | Four story beats of stills with per-beat radio, freezing on the frame you mark |
| **Unlayer editor** | The real editor, re-skinned into the fiction, with a curated toolset per mission |
| **LOCK FRAME** | Drives the editor's own save, captures the frame, hands it to the cinematic |
| **Cinematic** | Eight-beat sequence: frame → HUD → camera push → radio → objective → comparison → result |
| **Director's Cut** | Real frame measurements, an edit verdict, a deterministic score, and an original-vs-cut plate |

Everything works with **no backend, no API calls and no environment variables**.

---

## The three operations

Mission data lives in one file, `src/data/missions.ts`. A fourth operation is one more object.

| | **01 · The Night Shift** | **02 · Southbound** | **03 · No Signal** |
|---|---|---|---|
| **Location** | Vice City Marina | Leonida Keys | Port Gellhorn |
| **Clock / mood** | 01:42 AM · Night / Rain / Neon | 19:18 · Daylight / Highway / Heat | 03:07 · Night / Industrial / Surveillance |
| **Situation** | The meet is compromised. | The package moves south. | Someone is watching. |
| **Your instruction** | Mark the moment the plan goes wrong. | Frame the escape. | Obscure the target. |
| **What you're aiming at** | The burning car | Jason at the wheel | The motel sign |
| **Tools in the rail** | GRADE · FRAME · MARK · SLATE · SHAPE · PROP · MATTE | GRADE · FRAME · RATIO · MATTE | GRADE · FRAME · MARK · SLATE · SHAPE · PROP |
| **Verdict** | Marked | Framed | Redacted |

Mission 01 is annotation-led, 02 is framing-led, 03 is obstruction-led — and the toolset, the instruction, the cinematic copy and the grading all follow from that per-mission data rather than from a shared template.

---

## Stack

| | Version | Notes |
|---|---|---|
| Next.js | 16.3.5 | App Router, Turbopack |
| React | 19.2.8 | |
| TypeScript | 5.x | strict |
| `@unlayer/react-image-editor` | 1.0.2 | The core of the product; loads its engine from CDN at runtime |
| `motion` | 13.4.0 | `motion/react` |
| Styling | CSS Modules + design tokens | No Tailwind — tokens and modules throughout |
| Node | 24.x | For the zero-dependency verification driver |
| Package manager | npm | Lockfile committed |

No database, no auth, no server actions, no API routes, no AI calls.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run build && npm run start   # production
npx tsc --noEmit                 # types
npx eslint src                   # lint
node scripts/contrast.mjs        # WCAG palette check, exits non-zero on failure
```

No environment variables are required — a fresh clone runs the whole experience after `npm install`.

> **One network dependency.** The Unlayer engine isn't bundled; it boots from `cdn.unlayer.com` at runtime, so the editor needs connectivity to mount. Everything else in the app runs offline. Worth confirming on venue wifi before a live demo.

---

## Routes

| Route | Rendering | Purpose |
|---|---|---|
| `/` | Static | Title screen |
| `/missions` | Static | Select operation |
| `/mission/[id]` | SSG | The full mission flow, prerendered for all three operations |
| `/design` | Static | Design-system playground |
| `/spike` | Static | The editor contract in isolation — useful when touching the integration |

The mission flow is one route holding stages, not separate pages, so the editor instance and the locked frame survive the transitions between them.

---

## How Unlayer is used

### The API surface

```ts
import ImageEditor, {
  type ImageEditorSaveResult,
  type ImageEditorRef,
} from "@unlayer/react-image-editor";
```

| Surface | Used for |
|---|---|
| `image` prop | The frame to edit — the briefing clip's freeze frame |
| `options` prop | Theme, locale, translations, curated `features.imageEditor.tools` |
| `onLoad` | Fires once mounted; hands back the editor instance |
| `onSave` | `{ dataUrl, blob }` — the authoritative capture path |
| `onLoadError` / `onError` | Surfaced as an on-screen alert, never swallowed |
| `ref.editor.getImage()` | Fallback capture only |
| `ref.editor.hasChanges()` | The authoritative "did the player edit" answer |

### Curated tools per mission

The editor should feel directed, not like a box of everything that exists. Each mission declares its toolset in data, and all eight of the editor's tools are declared explicitly — `true` **or** `false`:

```ts
tools: { crop: true, resize: false, filter: true, draw: true,
         text: true, shapes: true, stickers: true, frame: true }
```

An omitted key is not "off" — the editor falls back to its own default, which is *enabled*. Requiring every key turns that into a compile error instead of a tool that quietly appears in a curated rail.

### Re-skinning the editor into the fiction

Out of the box the rail reads FILTER / CROP / DRAW / TEXT / SHAPES / STICKERS / FRAME with stock glyphs. That's most of the second half of the game, so it's renamed: `editor-skin.ts` replaces every string the running editor defines, and `film-tools.ts` adds a legend beside the frame explaining what each tool does to the shot.

| Library name | Rail | Legend |
|---|---|---|
| filter | `GRADE` | GRADE — set the mood of the whole shot |
| crop | `FRAME` | REFRAME — choose what the audience sees |
| resize | `RATIO` | REFORMAT — change the shape of the print |
| draw | `MARK` | MARK — put your hand on the frame |
| text | `SLATE` | SLATE — write on the frame |
| shapes | `SHAPE` | INSERT — build a solid |
| stickers | `PROP` | PROP — bring something into the shot |
| frame | `MATTE` | MATTE — mount the print in a border |

The re-skin uses only the library's supported surface — `translations` for copy, `tools[key].icon` for rail glyphs. Nothing reaches into its internals or depends on a class name, because the bundle ships on its own release cadence and anything inside it breaks on a version bump without warning.

### Five things to know before touching the integration

- **`options` identity is load-bearing.** Only `theme` / `locale` / `translations` are update-tier; every other key is **remount-tier**. An inline object literal recreates the editor on every render and silently discards the player's work. It's built once in a `useMemo` keyed on the toolset — the single most dangerous detail here.
- **`onSave` ≠ `getImage()`.** On a frame with Grayscale applied, `onSave` returned a desaturated frame while `getImage()` returned the *un-graded* original — so capturing via `getImage()` silently dropped a filter. It's fallback-only now, and flagged as degraded all the way to the result screen.
- **The README documents props the shipped types don't have** (`ariaLabel`, `tools.corners`, `tools.dock`). Trust the `.d.ts`.
- **The editor renders inline** — two `<canvas>` elements, not an iframe.
- **Two labels are also handles.** The lock path finds the editor's own save button by its label, and the legend cross-references the rail labels. Renaming one without the other once broke filter capture, so both live as exported constants with the reasoning attached.

---

## Measuring the edit

The editor hands back a flattened image and nothing else — no record of what was drawn, cropped, graded or framed. So rather than invent a score, `src/lib/frame.ts` measures it: the original scene and the locked frame are both drawn into a 320×180 offscreen canvas and compared pixel by pixel.

| Signal | Meaning |
|---|---|
| `edited` | Asked of the editor's own `hasChanges()`, not inferred from pixels |
| `coverage` | Share of the frame altered |
| `spread` | Share touched at all — this is what separates a grade from a mark |
| `markCentre` | Where the change actually landed |
| `onTargetShare` | Share of the mark that landed inside the mission's target region |

Two thresholds exist because one can't separate the two kinds of edit: a drawn stroke spreads 0–4% of the frame, while grayscale spreads 58% and sepia 91%. A filter is a **global change of moderate size**; a stroke is a **local change of large size**. That gives an edit verdict (`untouched` / `annotated` / `graded` / `reframed`) and a Director Score built purely from the measurements — deterministic, so the same edit always produces the same readout.

The comparison plate boxes the mission's target region on the original side and says whether your mark landed in it, so a verdict always arrives with its answer key.

---

## Design system

A single-look, dark-first interface — no light theme, because the scene imagery is night and a light variant would fight it.

| Token | Value | Role |
|---|---|---|
| `--c-base` | `#090a0c` | Asphalt page ground |
| `--c-surface-1/2/3` | `#111316` / `#16181c` / `#1d2025` | Panel, control, hover |
| `--c-paper` | `#ede8dd` | Text — 16.21:1 on base |
| `--c-accent` | `#ff5a72` | Vice coral: the primary action and the current step, nothing else |
| `--c-amber` / `--c-cyan` | `#ffb35c` / `#55d8e8` | Support colours, never used alongside coral |

Coral is a fill, never a surface for off-white text — paper on coral measures 2.47:1 and fails. Labels on coral use `--c-base`.

Type is **Archivo** (variable width axis) for display, **Instrument Sans** for UI, **Geist Mono** for machine metadata like `CAM 01` and `SCENE 01 / 03`.

Motion is directional ease-out only, never springy: 180ms for UI feedback, 560ms for scene transitions. Every animation comes from one shared vocabulary, so timing stays coherent and no single transition attracts more attention than the scene.

---

## Accessibility

- **Keyboard is a first-class path** — Enter/Space/click starts, arrows move the selection, `1`–`3` jump, Escape leaves the editor.
- **`reducedMotion="user"`** is applied globally. Under reduced motion the cinematic lands straight on the result: the comparison and scores are content, and only the build-up is dropped.
- **Escape on a dirty canvas arms a confirmation** that expires on its own, rather than a native dialog that would break the frame.
- **The comparison divider is pointer *and* keyboard operable**, bound to the whole stage rather than the 2px handle.
- **The cinematic is narrated** to assistive tech as whole sentences, and every decorative layer is `pointer-events: none` + `aria-hidden`.

---

## Credits and licensing

**Scene imagery** is official GTA VI artwork sourced from Rockstar's media CDN — screenshots, cover art and key art. Full provenance, direct URLs and derivation commands are in [`docs/SCENE-SOURCES.md`](docs/SCENE-SOURCES.md).

> That hub invites sharing, but an invitation is **not a licence grant**. This is a fan-made non-commercial entry, which is the context the assets were chosen in. **If this ever ships commercially, get the terms reviewed** or swap to stock sourcing. The assets are isolated under `public/scenes/`, `public/briefs/`, `public/seq/` and `public/ground/`, referenced from one data module plus two pages, so the swap is a small change.

**Soundtrack** — "Neon Laser Horizon" by Kevin MacLeod (incompetech.com), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), which **requires** attribution. For a web app the deployed page is the medium, so the credit ships on screen at the foot of the mission result. Swapping to a CC0 track removes that line automatically. Sound-effect cues are synthesised in Web Audio, not assets.

**Third-party software** — Next.js and React (MIT), Unlayer React Image Editor, Motion (MIT), and the Archivo, Instrument Sans and Geist Mono typefaces (Open Font Licence).

---

## Repository map

```
src/
  app/                 routes
  components/          landing, missions, editor, transition, shell, ui
  data/missions.ts     the mission layer — everything per-operation
  lib/                 frame analysis, audio engine, motion, countup
  styles/tokens.css    colour, type, space, motion tokens
public/
  scenes/ briefs/ seq/ ground/ audio/
scripts/
  driver.mjs           zero-dependency CDP verification driver
  contrast.mjs         WCAG checker with a planted control
docs/                  scene provenance and sourcing notes
```

---

## Known limitations

- **No demo mode.** There's no single-command rehearsed route. The experience is deterministic and needs no external service, and a failed save already falls back to the canvas with the degradation carried through honestly to the result screen — but the fallback frame per mission isn't pre-baked.
- **The editor needs connectivity**, since its engine boots from a CDN. Everything else runs offline.
- **No automated test suite or CI.** Verification is the CDP driver, the contrast checker and manual passes across every screen.
- **Mission 02's clock is in-world**, reading `19:18` over artwork shot at midday. The mood line matches the art; the clock is the run's own time.
