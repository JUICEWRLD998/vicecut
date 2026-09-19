# Phase 1 — Technical spike: verified

**Checkpoint: MET.** A real image enters Unlayer → the user edits it → the saved
result renders → that exact payload is what the cinematic layer will consume.

Verified on 2026-09-19 in a real headless Chrome over CDP, not inferred from source.

## Stack as built

| Thing | Version |
|---|---|
| Next.js | 16.3.5 (Turbopack, App Router, `src/`) |
| React | 19.2.8 |
| TypeScript | 5.x |
| `@unlayer/react-image-editor` | 1.0.2 |
| `@unlayer/types` (transitive) | 1.448.0 |
| Node | 24.14.1 |
| Package manager | npm (lockfile committed) |

Tailwind is **not** installed — the spec's §2 lists it as a fallback stack, and the
project convention is CSS Modules + tokens. Scene/cinematic styling uses CSS Modules.

## Exact API discovered (from the shipped `.d.ts`, cross-checked in the browser)

Default export is the component:

```ts
import ImageEditor, { type ImageEditorSaveResult, type ImageEditorRef } from '@unlayer/react-image-editor';
```

**Props that matter here**

| Prop | Type | Note |
|---|---|---|
| `image` | `string` (required) | URL or base64 data URL. Changing it applies via a **serialized `reset()`** |
| `options` | `ImageEditorOptions` | `theme`, `locale`, `projectId`, `features`, `env`, `offline`, `translations`, … |
| `minHeight` | `number \| string` | default `500` |
| `onLoad` | `(editor: ImageEditorInstance) => void` | fires once mounted |
| `onSave` | `(result: ImageEditorSaveResult) => void` | `result = { dataUrl: string; blob: Blob }` |
| `onLoadError` | `() => void` | image never reached the canvas (CORS / 404 / decode) |
| `onError` | `(error: Error) => void` | wrapper-level: embed script load, `createEditor`, reset re-apply |

**Ref instance** (`RefAttributes<ImageEditorRef>` → `{ editor: ImageEditorInstance | null }`)

```ts
editor.getImage(): string | null   // flattened canvas data URL
editor.hasChanges(): boolean       // unsaved edits present
editor.reset(imageUrl?): void | Promise<void>  // clears undo/redo AND chat
editor.updateOptions(partial): void
editor.destroy(): void
```

**Tool curation** — `options.features.imageEditor.tools`, each key
`boolean | { enabled?: boolean; icon?: string }`:

```
crop · resize · filter · draw · text · shapes · stickers · frame
```

## Traps found (do not re-derive these)

1. **The README documents props and keys the shipped types do not have.**
   `ariaLabel` is in the README, absent from `ImageEditorProps` (tsc rejects it —
   `TS2322`). `features.imageEditor.tools.corners` and `features.imageEditor.dock`
   are also README-only; they are **not** in `@unlayer/types@1.448.0`. Trust the
   `.d.ts`, not the README, until a version bumps.
2. **`options` identity is load-bearing.** Only `theme` / `locale` / `translations`
   are update-tier; every other key is **remount-tier**. An inline object literal
   re-creates the editor on each render and silently discards the user's edits.
   `EDITOR_OPTIONS` is therefore a frozen module-level const.
3. **The editor is not bundled — it boots from a CDN.**
   `https://cdn.unlayer.com/image-editor/embed.js` at runtime, which installs
   `window.ImageEditor` and `window.__ImageEditorImpl__`. This is a live
   `unlayer.com` dependency and must be verified present at the venue. It is not
   a random/network *failure* risk in the §0.6 sense (it is deterministic), but it
   does need connectivity. `options.offline` exists for the offline path.
4. **The editor renders inline, not in an iframe** — 2 `<canvas>` elements.
   (Noted because a probe asserting an iframe would misreport against this build.)
5. **Save is not the same payload as `getImage()`.** `onSave` gives `{dataUrl, blob}`
   (`image/jpeg`); `getImage()` returns a data URL and no blob.

## Evidence

Sequence driven in headless Chrome, one continuous run:

| Step | Observed |
|---|---|
| Mount | `editor: mounted`, inline canvases, `window.__ImageEditorImpl__` defined |
| Draw a stroke | `hasChanges()` → `true`; pencil line visible on the canvas |
| Click Save | `FRAME onSave` · `BLOB image/jpeg / 79713 bytes` · data URL `data:image/jpeg;base64,…` |
| Edited frame render | the saved payload renders in the page with the stroke intact |
| `Capture via getImage()` | `FRAME getImage()`, blob reported as **no blob** |
| Pixel diff, source vs saved | `changedPixelPct 1.8`, `maxChannelDiff 169`, both `1920×1080` |

The diff is the part that matters: it proves the render is genuinely the edited
frame, not the source image displayed twice.

Screenshots: `spike-01-mounted.png`, `spike-02-drew.png`, `spike-03-saved.png`
in the driver's shots dir (temp, not committed).

## Files added

```
src/app/spike/page.tsx          the spike, and the contract the cinematic layer uses
src/app/spike/spike.module.css  harness-only styling (Phase 2 replaces it)
src/app/page.tsx                redirects to /spike (Phase 3 replaces it)
public/scenes/night-marina.svg  authored hero scene, 1920×1080 16:9, placeholder-grade
scripts/driver.mjs              dependency-free CDP driver (Node 24 fetch + WebSocket)
```

## Commands

```bash
npm run dev                      # http://localhost:3000/spike
node scripts/driver.mjs launch   # headless Chrome, idempotent
node scripts/driver.mjs shot name
node scripts/driver.mjs kill
npx tsc --noEmit && npx eslint src && npm run build
```

## Open items carried forward

- **`public/scenes/night-marina.svg` is a placeholder-grade composition**, authored
  so the spike runs against production-shaped raster input at the right resolution.
  It is *not* the hero scene of §10 and does not pass the §30 art-direction
  checklist. Phase 4 replaces it.
- The §0.6 "no network" principle is satisfied everywhere except the Unlayer embed
  itself, which is inherent to using the sponsor's editor.
