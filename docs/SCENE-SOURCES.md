# Scene sources

**Status: fulfilled 2026-09-20.** Every scene in the build is now official GTA VI
artwork, sourced from Rockstar. `SCENE-BRIEFS.md` is the shot spec that was
written when these were to be sourced from stock photography; it is kept only
for the rationale and is superseded by this file.

Only four files, all under `public/scenes/`:

| File | Used by | Source | Size |
|---|---|---|---|
| `title-cover.jpg` | Title screen, design playground (§05), start of the spike | Official Cover Art, landscape | 3840×2160, 132KB |
| `night-shift.jpg` | Mission 01 · The Night Shift | Vice City screenshot 08 | 3840×2160, 740KB |
| `southbound.jpg` | Mission 02 · Southbound | Ambrosia screenshot 04 | 3840×2160, 1.1MB |
| `no-signal.jpg` | Mission 03 · No Signal | Port Gellhorn screenshot 01 | 3840×2160, 812KB |

## Where they came from, and the URLs to re-fetch them

Every file is served from Rockstar's CDN. The suffix `?akim=1&imdensity=1&imwidth=3840`
is what yields the 3840px variant; drop it and you get a small thumbnail.

**Asset pages** (for finding replacements):
- <https://www.rockstargames.com/VI> — homepage, carries the cover plate and key art
- <https://www.rockstargames.com/VI/media> — Media & Artwork hub

**Direct URLs used:**

```
# Title screen — the cover plate (flat dark ground, logo centred)
https://www.rockstargames.com/VI/_next/static/media/GTAVI_Official_Cover_Art_Landscape.03y6bcce9e2jr.jpg

# Mission scenes — from the official Screenshots bundle
# https://media-rockstargames-com.akamaized.net/VI/downloads/screenshots/GTAVI_Screenshots.zip  (72MB)
shots/Places/Vice City/Vice_City_08.jpg
shots/Places/Ambrosia/Ambrosia_04.jpg
shots/Places/Port Gellhorn/Port_Gellhorn_01.jpg
```

The screenshots zip is worth keeping a copy of: it is 99 stills at 3840×2160,
organised `People/` and `Places/`, and `Places/` maps exactly onto this project's
three missions (Vice City / Leonida Keys / Port Gellhorn).

### Not used, but worth knowing about

- **Transparent logo PNG** — `poster_logo.0m-7c805zusl7.png`, 2560×1440 RGBA
  (verified `colorType 6`). Served from
  `https://www.rockstargames.com/VI/_next/static/media/poster_logo.0m-7c805zusl7.png`.
  A proper alpha lockup, so it composites over a scene without the opaque black
  plate the JPG cover carries. Nothing uses it today because the cover plate is
  the background rather than a mark on one — if a later phase wants to *stamp*
  the GTA VI mark onto a scene, use this file, not the JPG, and no
  `mix-blend-mode` is needed. The `_next/static` filenames carry build hashes and
  will rot when Rockstar rebuilds the site; re-source from the Media hub if 404.
- **Artwork & Wallpapers zip** — 225MB at
  `https://media-rockstargames-com.akamaized.net/VI/downloads/artwork_wallpapers/GTAVI_Artwork_Wallpapers.zip`.
  Contains three landscape pieces at 3840×2160: `Official_Cover_Art_landscape`,
  `The_Album_Cover_Art_landscape`, `Vice_City_Postcard_landscape`.
- **Key art** — `featured.0y5yxwenpsgc3.jpg`, 3840×1970, Jason & Lucia walking at
  sunset. The strongest single background image of the set. Not currently used;
  it was option B in the title-screen decision below.

## The cover decision

The brief was "use the real GTA VI cover" for the landing background. Two
different assets are called by that name, and they behave nothing alike.

**The poster** (`Official_Cover_Art_landscape.jpg`) is the familiar 9-panel grid
with the GTA VI logo lockup dead centre. As a landing background it does not
work, and this was measured rather than judged. Cropped `cover` into the real
1600×1000 stage, against `--c-paper` `#EDE8DD`:

- title band (left 5 columns, rows 1–3): **1.75:1** — the type is unreadable on it
- worst zone overall: 1.06:1
- no quiet region anywhere: the quietest 3×2 block still sits at L=0.152

For scale, `scripts/contrast.mjs` plants `paper on coral` at 2.47:1 as a
*deliberate* failure. The poster is below that, and it has no negative space and
a rigid panel grid that fights a left-weighted composition. A scrim heavy enough
to fix it (≥0.74 black) turns the artwork into an unreadable smear.

**The plate** (`GTAVI_Official_Cover_Art_Landscape.jpg`) is the same lockup on a
flat near-black ground. Rendered, the lockup clears the type column entirely and
needed only a lighter, tighter scrim than the old photographic ramp.

So the plate is what ships. The poster is recognisable, which is presumably why
it was asked for, but the two lockups in the same band (wordmark bottom ~y258,
lockup top ~y270 in a 1000px stage — 12px of clearance at a 1600px viewport,
which every other viewport eats) is not a close call.

The other three ways this was resolved were rendered and rejected, and the
option that lost by the smallest margin is worth recording: scene-as-background
with the cover worn as a small mark bottom-right. It composes well but the JPG
plate is opaque, so it reads as a sticker. If that option is ever wanted, the
transparent PNG above is the asset that makes it work.

## Content screened out

Screenshots were chosen one at a time against the requirement that this is a
hackathon demo shown to strangers, which is tighter than the brief's own checks.
Rejected for content, not for quality:

`Vice_City_06` (bikini/police-car tableau) · `Vice_City_07` (strip-club
interior) · `Vice_City_12` (cannabis grow, weapon) · `Port_Gellhorn_02`
(gold-plated rifle pointed at camera) · `Port_Gellhorn_03` (adult cabaret
marquee) · `Port_Gellhorn_04` (adult cabaret signage) · `Port_Gellhorn_05`
(campfire party)

Also rejected on the brief's own terms: any centred portrait (face-forward
character stills), anything shot in flat daylight — `Vice_City_09`, `_10`,
`_11`, `Ambrosia_01` — and every `Port_Gellhorn` frame that was warm-golden
rather than night, since mission 03 is the surveillance scene and needs to be
dark.

## Crops

`cover` into a mission tile keeps roughly a third of the source width, because
the tile is close to 3:4 and the sources are 16:9. A centre crop therefore
throws away off-centre subjects: "No Signal" rendered as palm trees with the
motel sign sliced off until a focus was set. Each mission therefore declares
`sceneFocus` in `src/data/missions.ts`, and the field is required — the same
treatment as `tools`, so that omitting it is a compile error rather than a
silent centre crop.

## Licensing — read before publishing

Rockstar's own download page describes the hub as *"Download and share official
videos, screenshots, and more."* That is a share invitation, **not a licence
grant**, and it has not been read in full here. This project is a fan-made
non-commercial hackathon entry, which is the context the assets were chosen in.

**If this ships anywhere commercial, get the terms reviewed first** — or swap to
the stock sourcing route that `SCENE-BRIEFS.md` describes. The four files are
isolated under `public/scenes/` and referenced from exactly one module
(`src/data/missions.ts`) plus two pages, so the swap is a one-file change.
