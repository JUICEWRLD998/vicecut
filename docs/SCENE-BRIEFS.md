# Scene sourcing briefs

Three hero scenes for VICE CUT. You source or shoot them; this file is the spec.

**Deliver into `public/scenes/`.** Filenames are fixed — the app loads them by
name and the data layer in `src/data/scenes.ts` will reference them exactly.

| Mission | File | Grade |
|---|---|---|
| THE NIGHT SHIFT | `night-marina.jpg` | Night / rain / neon |
| SOUTHBOUND | `coastal-highway.jpg` | Sunset / highway / heat |
| NO SIGNAL | `industrial-port.jpg` | Night / industrial / surveillance |

## Non-negotiables, all three

- **16:9**, minimum **2560×1440**, ideally 3840×2160. Not 1920×1080 — the title
  screen and cinematic both push and crop, and a 1080p source goes soft when the
  camera moves.
- **No watermarks, no visible licence marks.** Unsplash/Pexels are fine and
  licence-clean; check the photographer's restrictions and log them in
  `CREDITS.md` as you go, not at the end.
- **Dark enough to sit under warm off-white text (`#EDE8DD`).** If a region of the
  frame is bright, there must be a region that is not.
- **Room for UI.** One area of the frame must stay low-detail, so HUD text and
  corner brackets can sit on it without a scrim. This is the single most common
  way a good photo becomes unusable.
- **Same world.** All three must plausibly exist in one city/region. Match the
  colour temperature and the grain, or I will grade them to match.
- **Not a stock-photo composition.** Reject anything with a centred subject, a
  symmetrical horizon, or that editorial "lone figure gazing at vista" feeling.

Cut-off for "this is fine": if you cannot tell me where the eye lands first, it
is not usable.

---

## 01 — THE NIGHT SHIFT · `night-marina.jpg`

**Time 01:42. Vice City Marina.**

Shot on a wet quay at night, after rain. This is the hero image and must look
expensive enough on its own that nothing needs adding to it.

- **Subject:** one vehicle, dark, rear-three-quarter or side-on, *not* centred —
  it should sit in the lower-left or lower-right third and be mostly silhouette.
- **Light:** sodium/warm practical lamps as the key, their reflection running
  down wet asphalt. One cool source (teal, distant) for separation. Concrete
  must read glossy-wet with colour in the reflections.
- **Depth:** foreground wet ground → midground quay and lampposts → far water →
  distant lit skyline. All four planes must be readable.
- **One coral/pink neon or sign** somewhere in frame, small. That is the accent
  colour the whole UI is keyed to.
- **Negative space:** the upper-left third, sky or dark water, low detail.
- **Avoid:** daylight, crowds, readable signage, lens flare, HDR over-processing,
  a boat dead-centre, anything with a stock watermark.

## 02 — SOUTHBOUND · `coastal-highway.jpg`

**Time 19:18. Leonida Keys.**

The same world, the opposite light. This one is graded warm — heat haze, sun
below the horizon, long shadows.

- **Subject:** a single car, moving, low on the road, sharp; road lines leading
  away from the viewer toward a vanishing point off-centre.
- **Light:** sun low behind the subject, backlit — the car is a semi-silhouette
  against a hot sky. Warm sky (amber → coral), cool shadow. Palm silhouettes.
- **Depth:** asphalt foreground → car and road lines → palms → distant city or
  causeway → sky.
- **Negative space:** sky, upper right. Large and clean.
- **Avoid:** a generic "sports car on coastal highway" stock shot. If the car is
  beautifully lit and catalogue-clean, it is wrong — it must feel incidental to
  the landscape, not a product shot.

## 03 — NO SIGNAL · `industrial-port.jpg`

**Time 03:07. Port Gellhorn.**

Cold, hard, unlit except for security floods. This scene is where the player
obscures something, so the frame must contain something worth hiding.

- **Subject:** containers stacked in receding rows, parked vehicles or handling
  equipment between them. Geometric, ordered, oppressive.
- **Light:** hard security floods from an off-frame mast, deep black shadow
  between containers. High contrast, cool overall, one warm flood for warmth.
- **Surveillance feeling:** slightly elevated camera, mild compression, the sense
  of being watched through a fixed lens. A CCTV-tower silhouette helps.
- **Negative space:** the dark shadowed area, mid-frame, for the HUD.
- **Avoid:** daylight, warm domestic light, visible people, brand logos on
  containers.

---

## Also needed (small, can be sourced later)

Not blocking Phases 2–3. Flagging now so you can collect them in the same pass:

```
textures/film-grain.png     soft, tiling, very low contrast
textures/vignette.png       radial, transparent centre
textures/scanline.png       4–8px pitch, tiling vertically
textures/paper-texture.jpg  for the mission-select cards, subtle
```

Keep these low-contrast and small. Per the brief, they must never make the page
look cheap — if you can see the texture, it is too strong.

## Audio (optional, per §34)

The app must work with audio off. If you want it:

```
title-ambience.mp3   low drone, 30s+, loops
radio-static.mp3     short burst
button-confirm.mp3   single tick, no musical pitch
editor-lock.mp3      the LOCK FRAME beat
mission-complete.mp3 resolved, restrained
```

No copyrighted music. Royalty-free or generated.

## What I will do with whatever you deliver

Grade to a consistent look across all three, and verify each against the §30
art-direction checklist. If an image cannot carry warm text or has no usable
negative space, I will tell you rather than paper over it with a scrim — a scrim
is how this kind of scene ends up looking like a template.
