# VICE CUT — The Mission Director

> **Edit the world. Lock the frame. Roll the mission.**

VICE CUT is a cinematic mission-director built around the **Unlayer React Image Editor**. You pick an operation, watch a short briefing clip, then step into the real Unlayer editor and direct a frozen frame yourself. Press **LOCK FRAME** and the editor disappears — your edited image takes the screen and becomes the opening shot of a mission cinematic, which then measures what you actually did to the frame and grades the cut.


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
