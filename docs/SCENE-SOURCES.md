# Scene sources

**Status: fulfilled 2026-09-20.** Every scene in the build is now official GTA VI
artwork, sourced from Rockstar. `SCENE-BRIEFS.md` is the shot spec that was
written when these were to be sourced from stock photography; it is kept only
for the rationale and is superseded by this file.

Five master files, all under `public/scenes/`:

| File | Used by | Source | Size |
|---|---|---|---|
| `title-cover.jpg` | Title screen, design playground (§05), start of the spike | Official Cover Art, landscape | 3840×2160, 132KB |
| `night-shift.jpg` | Mission 01 · The Night Shift | Vice City screenshot 08 | 3840×2160, 740KB |
| `southbound.jpg` | Mission 02 · Southbound | Leonida Keys screenshot 01 | 3840×2160, 810KB |
| `no-signal.jpg` | Mission 03 · No Signal | Port Gellhorn screenshot 01 | 3840×2160, 812KB |
| `Jason_and_Lucia_Robbery_landscape.jpg` | Title screen key art (`TITLE_ART`) | Official Cover Art, Jason & Lucia | 3840×2160, 1.6MB |

`southbound.jpg` was **replaced on 2026-09-22**, from Ambrosia screenshot 04 to
Leonida Keys screenshot 01. The Ambrosia frame is an inland field fire — power
lines, burning scrub, smoke — with no highway, no Keys and no subject in the
upper third, and the mission tile captioned it "LEONIDA KEYS / SUNSET / HIGHWAY /
HEAT". Every one of those words was contradicted by the picture beside it. The
mismatch was invisible screen by screen and obvious the moment the two were put
side by side, which is what the Phase 8 audit did.

Keys 01 is the coastal highway: the road runs across the frame with the bridge
causeway behind it and the Vice City skyline on the horizon, which is what the
mission actually says it is. Its `mood` was reworded to "Daylight / Highway /
Heat" to match, and its `time` stays 19:18 as the in-world clock for the run
rather than a claim about the light in the photograph.

One consequence worth knowing: **this still is also a sequence frame**
(`public/seq/03-Leonida_Keys_01.jpg`). So mission 02's opener in the mission-select
entry sequence now has to avoid it, or the same picture plays twice inside a
900ms transition — `entryFrames` in `MissionSelect.tsx` carries that guard.

Two derived sets also ship, both cut from the files above and re-encoded smaller:

| Directory | Used by | Derived from |
|---|---|---|
| `public/seq/` | Title → mission-select sequence (6 stills, §22) | Screenshots bundle — Vice City, Ambrosia, Leonida Keys, Mount Kalaga, Port Gellhorn |
| `public/ground/operation-select.jpg` | `/missions` backdrop, blurred | `public/seq/01-Vice_City_01.jpg`, downscaled to 1100×619 and blurred |
| `public/briefs/` | Pre-edit briefing clip freeze frames (§10-12) | Screenshots bundle — `Jason_Duval_06`, `Jason_and_Lucia_08`, `Port_Gellhorn_01` |

`operation-select.jpg` is the first frame of the sequence, chosen so the backdrop is
already decoded and in cache by the time `/missions` mounts. It is baked smaller and
pre-softened rather than being the 1920px seq frame run through a live blur: the blur
destroys the detail anyway, and a full-viewport CSS blur on a 1920px source is a
per-frame GPU cost. At 1100×619 it is 43KB, and the compositor only has to upscale it.
Re-derive with `sharp().resize({width: 1100}).blur(2).jpeg({quality: 80})`.

`public/briefs/` holds the frames the briefing clip freezes on. Each mission's target
region is derived from its freeze frame, not placed by eye — see the note below.

## Why the briefing clip is stills, not trailer footage

The clip was planned around official trailer video. It was sourced, examined, and
rejected. The findings, kept because "we already have the stills" is the sort of
decision that gets silently reversed later:

- **The trailers contain no usable beat.** Trailer 1 (`GTAVI_Trailer_1.mp4`, 680MB,
  3840×2160, 90s) is a lifestyle montage — barbed wire at sunset, beach aerials, a
  nightclub, a pool party. There is no "the meet is compromised" to freeze on, so a
  five-second cut of it is a mood rather than a moment, and the frame the player is
  asked to mark has no authored meaning.
- **The codec will not play in a browser.** It is `mpeg4` (MPEG-4 Part 2), not H.264,
  so every clip would need re-encoding before it renders at all.
- **The bundled "video clips" are not scenes.** `GTAVI_Videos.zip` (120MB) ships nine
  files; the character clips are 1.0–1.5s loops (Jason 1.0s / 30 frames, Lucia 1.5s /
  45 frames). Only the cover-art animation is substantial, at 32.7s.
- **It carries frames this project's own content bar rejects.** The trailer has two
  pool-party shots, a nightclub interior, and a frame captioned "Neighborhood watch
  teen shot, found around in Hamlet" — the same standard that rejected `Vice_City_06`
  and `Port_Gellhorn_04`. It also opens on an ESRB "inappropriate for children" card,
  which would be the first frame a judge sees.
- **The Extended Look is the only real gameplay source**, at 13.4GB, but it carries
  HUD, subtitles and streamer chrome through most of it, so a clean plate means
  cutting around all of it.

Trailer URLs, for the record, are directly downloadable from Rockstar's own CDN
(`media-rockstargames-com.akamaized.net/VI/downloads/videos/…`), and their media page
invites sharing. The blocker was content and codec, not availability.

**Deriving the target regions.** Each freeze frame's target region is computed from the
image. The first measure — `luminance × saturation` per grid cell — latched onto a flat
sunset sky on `Port_Gellhorn_06`, scoring an empty gradient like a lit subject. The
measure that works multiplies in a high-pass term (how far a pixel departs from its
blurred neighbourhood), so bright *and* detailed wins and bright *and* flat no longer
scores. Regions were then drawn onto their frames and checked visually: the scores
alone would not have caught the sky, because a wrong region still produces a
plausible-looking number.



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
