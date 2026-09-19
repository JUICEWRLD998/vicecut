# VICECUT — IMPLEMENTATION.md

## The Mission Director

> **Edit the world. Lock the frame. Roll the mission.**

This document is the single source of truth for implementing VICE CUT, the GTA VI-inspired cinematic mission-director experience for the Unlayer React Image Editor challenge.

The objective is not to build a generic image editor, dashboard, social network, police evidence locker, or full game.

The objective is to create a **90-second, judge-facing experience that feels like a missing feature from a premium open-world crime game**:

**MISSION → DIRECT SCENE → UNLAYER EDITOR → LOCK FRAME → CINEMATIC → MISSION OUTCOME**

The visual bar is extremely high. Do not ship a technically functional UI that looks like a template.

---

# 0. NON-NEGOTIABLE PRODUCT PRINCIPLES

1. **Unlayer must be load-bearing.**
   The user edits the mission scene with the React Image Editor. The edited result must visibly become part of the following cinematic experience.

2. **The app must feel like a game, not a SaaS dashboard.**
   No generic navbar, generic cards, excessive rounded containers, template gradients, random glassmorphism, emoji UI, or developer-looking panels.

3. **Every screen must have a reason to exist.**
   Remove anything that does not improve the cinematic flow or judging experience.

4. **The first 20 seconds must communicate the concept without explanation.**

5. **The WOW moment is:**
   Edit scene → press LOCK FRAME → editor disappears → edited image becomes the cinematic shot.

6. **The experience must be deterministic.**
   The demo cannot depend on APIs, random generation, network timing, live markets, or anything that may fail on camera.

7. **Do not build unnecessary infrastructure.**
   No auth, database, multiplayer, payments, blockchain, complex backend, real 3D engine, or real GTA gameplay.

8. **Do not clone existing submissions.**
   Explicitly avoid:
   - police evidence locker
   - GTA social network
   - billboard/poster generator
   - generic photo booth
   - generic GTA filter
   - generic AI-to-GTA image generator
   - generic car editor

9. **GTA VI-inspired, not a Rockstar clone.**
   Use the challenge's allowed assets and original/licensed imagery. If Rockstar assets are not permitted by the challenge rules, replace them with original Vice-City-inspired scenes.

10. **Polish beats feature count.**
    Three exceptional scenes beat twelve mediocre ones.

---

# 1. PRODUCT DEFINITION

## Working title

**VICE CUT**

## Subtitle

**THE MISSION DIRECTOR**

## Tagline

**Edit the world. Lock the frame. Roll the mission.**

## One-sentence pitch

> VICE CUT lets you direct a GTA-style mission scene by editing the world yourself, then immediately turns your edited frame into the opening shot of a cinematic mission.

## Core loop

```text
MISSION SELECT
      ↓
SCENE BRIEF
      ↓
DIRECT SCENE
      ↓
UNLAYER IMAGE EDITOR
      ↓
LOCK FRAME
      ↓
DIRECTOR CONFIRMATION
      ↓
CINEMATIC
      ↓
MISSION OUTCOME
      ↓
REPLAY / NEXT MISSION
```

---

# 2. TECHNICAL BASELINE

Use the existing project stack if already established. Otherwise:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Framer Motion or equivalent animation system
- `@unlayer/react-image-editor`
- local/static assets
- no backend unless absolutely necessary

Before building the full UI, prove this minimal path:

```text
source image
    ↓
React Image Editor
    ↓
save callback
    ↓
edited data URL / Blob
    ↓
render edited image
```

Do not architect around undocumented behavior.

Verify the installed package's actual API against the current Unlayer repository/docs before implementation.

---

# 3. PROJECT STRUCTURE

Recommended structure:

```text
src/
  app/
    page.tsx
    mission/[id]/page.tsx

  components/
    shell/
      GameShell.tsx
      Scanlines.tsx
      Vignette.tsx
      NoiseOverlay.tsx

    landing/
      TitleScreen.tsx
      StartPrompt.tsx

    missions/
      MissionSelect.tsx
      MissionCard.tsx
      MissionBrief.tsx
      MissionHUD.tsx

    editor/
      DirectorEditor.tsx
      EditorOverlay.tsx
      EditorToolbar.tsx
      SaveFrameButton.tsx

    cinematic/
      CinematicPlayer.tsx
      CinematicFrame.tsx
      CameraPush.tsx
      Dialogue.tsx
      RadioOverlay.tsx
      MissionObjective.tsx

    results/
      MissionResult.tsx
      DirectorScore.tsx
      OriginalVsCut.tsx

    ui/
      Button.tsx
      Typography.tsx
      ProgressBar.tsx
      CornerBracket.tsx

  data/
    missions.ts
    scenes.ts
    dialogue.ts

  lib/
    image.ts
    missions.ts
    cinematic.ts
    storage.ts

  styles/
    globals.css

public/
  scenes/
  characters/
  vehicles/
  ui/
  audio/
  textures/
```

Keep mission data separate from UI.

---

# 4. VISUAL DIRECTION

## Overall aesthetic

Target:

**premium open-world crime-game UI + cinematic Vice City nightlife + modern editorial typography.**

Do NOT target:

- generic cyberpunk
- generic neon dashboard
- purple AI aesthetic
- excessive glassmorphism
- futuristic holograms
- gaming streamer UI
- cartoon GTA parody

The visual language should feel grounded and expensive.

---

# 5. COLOR SYSTEM

Use a restrained palette.

### Base

- Asphalt / near-black: `#090A0C`
- Deep charcoal: `#111316`
- Warm paper: `#EDE8DD`
- Muted gray: `#8C8C88`

### Accent

Use one primary warm neon accent derived from the scene.

Suggested:

- Vice coral/pink: `#FF5A72`

Secondary:

- Sodium amber: `#FFB35C`
- Electric cyan: `#55D8E8`

Do not use all accents simultaneously.

Most screens should use:

**dark base + warm text + one accent.**

---

# 6. TYPOGRAPHY

Use at most two families.

### Display

A strong condensed display font for:

- mission names
- large numbers
- location
- title screen

### UI

A clean grotesk/sans font for:

- controls
- instructions
- metadata
- mission objectives

Optional monospace only for tiny technical metadata such as:

```text
CAM 01
01:42
LEONIDA
FRAME 07
```

Avoid excessive uppercase.

Use hierarchy intentionally.

---

# 7. UI RULES

## Absolutely avoid

- generic rounded cards everywhere
- huge shadows
- rainbow gradients
- excessive blur
- random icons
- emoji
- sparkles
- “AI magic” buttons
- floating dashboard widgets
- unnecessary borders around every element

## Preferred

- full-bleed imagery
- thin rules
- corner brackets
- small metadata
- strong typography
- asymmetrical composition
- negative space
- cinematic overlays
- restrained motion

The interface should often feel like information is sitting **on top of the world**, not inside cards.

---

# 8. SCREEN INVENTORY

We need exactly these primary experiences.

## SCREEN 01 — TITLE

Full screen.

Background:
- cinematic Vice City-inspired night scene
- subtle moving light
- slight film grain
- very slow camera push

Text:

```text
VICE CUT

THE MISSION DIRECTOR

EDIT THE WORLD.
LOCK THE FRAME.
ROLL THE MISSION.
```

Bottom:

```text
PRESS ENTER / CLICK TO START
```

Small:

```text
A CINEMATIC EXPERIMENT
```

Do not show a navbar.

---

# 9. SCREEN 02 — MISSION SELECT

Title:

```text
SELECT OPERATION
```

Three mission choices.

Each should be a large visual tile, not a dashboard card.

### Mission 01

**THE NIGHT SHIFT**

Location:
**Vice City Marina**

Mood:
**Night / Rain / Neon**

---

### Mission 02

**SOUTHBOUND**

Location:
**Leonida Keys**

Mood:
**Sunset / Highway / Heat**

---

### Mission 03

**NO SIGNAL**

Location:
**Port Gellhorn**

Mood:
**Night / Industrial / Surveillance**

The first mission is the primary demo.

The other two prove the product scales beyond one scene.

---

# 10. SCENE 01 — THE NIGHT SHIFT

## Visual objective

This is the hero scene.

It must look expensive enough to stop a judge.

Composition:

- wet pavement
- night city lights
- ocean/marina or waterfront
- dark vehicle silhouette
- strong practical lights
- foreground depth
- one obvious focal subject
- negative space where editor annotations can be placed

Avoid a flat stock-photo composition.

Prefer 16:9, minimum 1920×1080.

Ideal: 2560×1440 or 3840×2160 if file size remains reasonable.

## Mission brief

```text
THE NIGHT SHIFT

01:42 AM
VICE CITY MARINA

THE MEET IS COMPROMISED.

DIRECT THE SCENE.
```

Instruction:

```text
MARK THE MOMENT THE PLAN GOES WRONG.
```

The editor should make drawing/annotation feel purposeful.

---

# 11. SCENE 02 — SOUTHBOUND

Visual:

- coastal highway
- sunset
- sports car / muscle car silhouette
- palm trees
- distant city
- warm sky
- road perspective

Mission:

```text
SOUTHBOUND

19:18
LEONIDA KEYS

THE PACKAGE MOVES SOUTH.

BUILD THE SHOT.
```

Editor instruction:

```text
FRAME THE ESCAPE.
```

This scene should demonstrate cropping/framing more than drawing.

---

# 12. SCENE 03 — NO SIGNAL

Visual:

- industrial port
- shipping containers
- security lights
- parked vehicles
- dark sky
- strong shadows
- surveillance-camera feeling

Mission:

```text
NO SIGNAL

03:07
PORT GELLHORN

SOMEONE IS WATCHING.

CHANGE WHAT THEY SEE.
```

Editor instruction:

```text
OBSCURE THE TARGET.
```

This scene should demonstrate filters, shapes, drawing, and visual obstruction.

---

# 13. ASSET PLAN

Create or source the following asset groups.

## A. Hero scenes

Minimum:

```text
night-marina.jpg
coastal-highway.jpg
industrial-port.jpg
```

Each:
- 16:9
- cinematic
- high resolution
- same overall visual world
- no visible watermarks
- properly licensed/allowed for the challenge

## B. Detail assets

```text
car-01
car-02
car-03
boat-01
street-light
palm
building
shipping-container
```

Only use if actually needed.

## C. UI textures

```text
film-grain
subtle-noise
vignette
scanline
paper-texture
```

Keep opacity extremely low.

These should never make the page look cheap.

## D. Audio

Optional but highly recommended:

```text
title-ambience
radio-static
button-confirm
editor-lock
cinematic-hit
mission-complete
```

Audio should be subtle.

No copyrighted music unless explicitly permitted.

---

# 14. IMAGE SOURCING RULE

Before adding any image:

1. Verify license/permission.
2. Verify challenge rules.
3. Prefer original/generated/licensed images.
4. Keep a `CREDITS.md`.
5. Never use an image merely because it looks good.
6. Every final scene must look like it belongs to the same fictional universe.

If using Rockstar/GTA material, verify the challenge's asset rules first. If uncertain, use original GTA VI-inspired artwork instead.

---

# 15. UNLAYER EDITOR EXPERIENCE

The editor should not appear as a random popup.

Transition:

```text
MISSION BRIEF
    ↓
DIRECT SCENE
    ↓
scene darkens slightly
    ↓
editor enters
```

Top-left:

```text
DIRECTOR MODE
SCENE 01 / 03
```

Top-right:

```text
ESC
```

Bottom:

```text
LOCK FRAME
```

The editor itself should remain recognizable as Unlayer.

Do not fake the editor UI.

The point is to demonstrate the actual sponsor technology.

---

# 16. EDITOR CONFIGURATION

Only expose tools that make sense for the mission.

Avoid overwhelming the user.

For THE NIGHT SHIFT prioritize:

- drawing
- text
- shapes
- crop
- filters

For SOUTHBOUND prioritize:

- crop
- resize
- filters
- framing

For NO SIGNAL prioritize:

- drawing
- shapes
- text
- filters

Do not show every possible tool just because it exists.

The editor should feel curated.

---

# 17. THE LOCK FRAME MOMENT

This is the most important interaction in the whole application.

Button:

```text
LOCK FRAME
```

On click:

1. Save edited image.
2. Freeze editor.
3. Remove editor chrome.
4. Brief white/film exposure.
5. Full-screen edited image.
6. Add tiny metadata:

```text
DIRECTOR FRAME
01 / 03
```

7. Begin cinematic camera movement.

This transition must feel intentional.

Do NOT simply route to another page.

---

# 18. CINEMATIC ENGINE

We do not need real 3D.

Use:

- image scale
- x/y translation
- opacity
- blur
- parallax
- masked crops
- foreground layers if available
- HUD overlays
- dialogue timing

Example:

```text
0s      edited frame appears
0.5s    HUD fades in
1.0s    slow camera push begins
2.5s    radio dialogue
4.0s    objective appears
6.0s    second visual beat
8.0s    mission result
```

The camera movement should be subtle.

Avoid cheesy Ken Burns effects.

---

# 19. CINEMATIC UI

Use tiny in-world elements:

```text
CAM 01
REC
01:42
VICE CITY
```

Mission objective:

```text
OBJECTIVE

REACH THE MARINA
```

Radio:

```text
[ RADIO ]

JASON:
"You got one shot."
```

Keep dialogue short.

---

# 20. MISSION OUTCOME

After the cinematic:

```text
DIRECTOR'S CUT

FRAME LOCKED
SCENE DIRECTED
MISSION ROLLED
```

Then:

```text
DIRECTOR SCORE

FRAMING      92
COMPOSITION  88
CONTROL      96

FINAL CUT
```

Do not pretend these are objectively measured AI scores.

They are deterministic fictional game metrics.

Optional:

```text
DIRECTOR REP +120
```

Button:

```text
ROLL AGAIN
```

Secondary:

```text
NEXT OPERATION
```

---

# 21. ORIGINAL VS DIRECTOR CUT

This is important for judging.

Show a split or slider:

```text
ORIGINAL                 DIRECTOR CUT
```

The edited image should visibly differ.

This lets the judge immediately understand:

**“Ah — the user actually changed the scene.”**

Do not overcomplicate the comparison.

---

# 22. ANIMATION SYSTEM

Animation must feel cinematic, not flashy.

Use:

- 150–250ms UI transitions
- 400–800ms major scene transitions
- slow image pushes
- staggered text reveals
- subtle opacity changes
- occasional directional movement

Avoid:

- bouncing cards
- excessive spring animations
- spinning UI
- particles everywhere
- constant motion

Rule:

> If the animation attracts more attention than the scene, it is too much.

---

# 23. RESPONSIVE DESIGN

Primary target:

**desktop 1440×900 / 1920×1080**

Secondary:

**1366×768**

Do not optimize the project around mobile if it damages the cinematic desktop experience.

Still make the app gracefully handle smaller screens.

---

# 24. ACCESSIBILITY / UX

Minimum:

- keyboard start
- ESC handling
- visible focus state where appropriate
- buttons have clear labels
- reduced-motion support
- editor remains usable without animation
- no tiny unreadable critical text

---

# 25. DEMO MODE

Implement a deterministic demo route/state.

Example:

```text
/demo
```

or a hidden query:

```text
?demo=true
```

Demo mode should:

- start at THE NIGHT SHIFT
- use the hero scene
- make the expected editor actions obvious
- provide a known fallback edited image
- never require external services
- never depend on random state

The presenter should be able to rehearse the exact sequence repeatedly.

---

# 26. FAILURE FALLBACK

Every mission must have:

```text
originalImage
fallbackEditedImage
```

If Unlayer save fails:

```text
SAVE FAILED
```

must NOT destroy the demo.

The app can fall back to the deterministic edited frame for presentation purposes.

But do not fake that the editor saved something if it did not. Keep internal state honest.

---

# 27. DEVELOPMENT PHASES

## PHASE 1 — Repository + technical spike

Tasks:

- inspect current repository
- inspect package manager
- inspect existing Next/React version
- install/verify Unlayer package
- build minimal editor page
- prove save callback
- render saved image

Checkpoint:

**Edited image successfully renders after save.**

Do not proceed until this works.

---

# PHASE 2 — Design system

Build:

- typography
- colors
- buttons
- metadata
- corner brackets
- HUD primitives
- transitions
- film grain
- vignette

Create a small visual playground route.

Checkpoint:

**The UI already looks premium before mission logic exists.**

If it looks like a template, stop and redesign.

---

# PHASE 3 — Title + mission select

Build:

- title screen
- start interaction
- mission select
- mission cards
- scene previews
- hover states
- keyboard support

Checkpoint:

A screen recording of the first 15 seconds should already look like a polished game interface.

---

# PHASE 4 — Hero scene

Build THE NIGHT SHIFT first.

Do not build all three simultaneously.

Tasks:

- scene asset
- mission brief
- scene metadata
- DIRECT SCENE action
- editor transition

Checkpoint:

Mission selection → scene brief → editor works.

---

# PHASE 5 — Unlayer integration

Tasks:

- configure tools
- load scene
- save edited image
- store edited image
- preview edited image
- implement LOCK FRAME

Checkpoint:

**Original → edit → lock → edited image visible.**

This is the core technical milestone.

---

# PHASE 6 — Cinematic engine

Build:

- camera movement
- HUD
- radio
- mission objective
- dialogue
- transition
- result screen

Checkpoint:

Complete THE NIGHT SHIFT from start to finish.

---

# PHASE 7 — Second + third scenes

Duplicate the architecture, NOT the exact visual composition.

Build:

- SOUTHBOUND
- NO SIGNAL

Each must have:
- distinct art
- distinct instruction
- distinct editing behavior
- distinct cinematic treatment

---

# PHASE 8 — Polish pass

This phase is mandatory.

Inspect every screen visually.

Fix:

- spacing
- typography
- hierarchy
- alignment
- image crop
- transition timing
- button states
- hover states
- loading states
- text contrast
- unnecessary UI

Remove anything that looks like generated boilerplate.

---

# PHASE 9 — Demo hardening

Run the exact 90-second flow repeatedly.

Test:

```text
refresh
start
mission select
scene
editor
edit
save
lock
cinematic
result
replay
```

No manual repair should be required.

---

# PHASE 10 — Submission hardening

Create:

```text
README.md
CREDITS.md
LICENSE / asset notes
```

README sections:

1. What is VICE CUT?
2. Problem / concept
3. User flow
4. Why Unlayer
5. Architecture
6. Technical implementation
7. Scenes
8. Demo instructions
9. Asset credits
10. Challenge criteria mapping
11. Known limitations

Never claim something that the repository does not actually demonstrate.

---

# 28. SKILLS REQUIRED

Claude should approach this as a multidisciplinary build.

## React / Next.js

Required for:

- app architecture
- state
- routing
- component composition

## TypeScript

Required for:

- mission data
- scene configuration
- editor state
- cinematic timeline
- predictable behavior

## Unlayer React Image Editor

Required for:

- editor integration
- save flow
- image retrieval
- curated tool configuration

## UI/UX

Critical for:

- hierarchy
- spacing
- visual storytelling
- interaction design

## Motion design

Critical for:

- title transitions
- scene transitions
- editor entrance/exit
- cinematic camera movement

## Art direction

Critical for:

- consistent imagery
- composition
- color
- scene continuity

## Frontend performance

Critical for:

- image optimization
- preloading
- smooth animation
- avoiding layout shifts

## Cinematic composition

Critical for:

- camera framing
- visual hierarchy
- focal points
- pacing

---

# 29. CLAUDE'S WORKING RULES

Claude must follow these rules while coding:

### Rule 1

Before creating a component, determine whether it is actually needed.

### Rule 2

Do not introduce a generic UI component just because it is convenient.

### Rule 3

Do not use placeholder images in the final experience.

### Rule 4

Do not use lorem ipsum.

### Rule 5

Do not use emoji in the product UI.

### Rule 6

Do not add random gradients.

### Rule 7

Do not add glassmorphism unless the composition genuinely needs it.

### Rule 8

Do not use giant rounded cards as the primary visual structure.

### Rule 9

Do not expose technical implementation details to the player.

### Rule 10

Every animation must have a narrative purpose.

### Rule 11

Every image must have intentional composition.

### Rule 12

Every scene should be reviewed at the actual deployed viewport.

### Rule 13

Do not say “looks good” based on source code.

Actually inspect the rendered UI.

### Rule 14

Do not stop at “functional.”

The target is:

**functional + cinematic + coherent + memorable.**

---

# 30. SCENE ART DIRECTION CHECKLIST

Before accepting a scene:

- [ ] 16:9
- [ ] high resolution
- [ ] clear focal point
- [ ] foreground/midground/background separation
- [ ] enough negative space for UI
- [ ] believable lighting
- [ ] cinematic color grading
- [ ] no obvious stock-photo feeling
- [ ] no watermarks
- [ ] no inconsistent art style
- [ ] visually coherent with other scenes
- [ ] works behind white and warm text
- [ ] looks good before any UI is added

If the raw scene doesn't look good fullscreen, do not try to rescue it with UI.

---

# 31. UI QUALITY GATE

A screen passes only if all are true:

### Hierarchy

The eye knows where to look first.

### Contrast

Critical information is immediately readable.

### Spacing

Nothing feels crowded.

### Alignment

Elements share deliberate alignment systems.

### Typography

Font sizes and weights clearly communicate hierarchy.

### Motion

Transitions feel intentional.

### Imagery

The image does most of the visual work.

### Restraint

There are no unnecessary decorative elements.

---

# 32. PERFORMANCE

Optimize images.

Use:

- WebP/AVIF where compatible
- responsive image loading
- preload the first hero scene
- lazy-load later scenes
- avoid huge uncompressed PNGs
- avoid loading all mission assets at startup

The first screen must appear quickly.

---

# 33. PRELOADING STRATEGY

On title screen:

```text
preload hero scene
preload first cinematic frame
preload critical UI assets
```

After entering mission select:

```text
preload mission 01
```

After selecting mission 01:

```text
preload cinematic assets
preload mission 02 in background
```

Do not block the user on unnecessary assets.

---

# 34. AUDIO STRATEGY

Audio should be optional.

The application must remain functional with audio disabled.

Use:

- low-volume ambience
- short radio static
- subtle confirmation sounds
- one cinematic transition sound
- mission completion sound

Do not use a loud soundtrack that overwhelms the UI.

---

# 35. FINAL 90-SECOND DEMO

The final demo should be:

```text
00:00
VICE CUT title

00:07
mission select

00:12
THE NIGHT SHIFT

00:16
mission brief

00:22
DIRECT SCENE

00:25
UNLAYER EDITOR

00:32
make edits

00:38
LOCK FRAME

00:40
edited image takes over

00:44
cinematic begins

00:50
radio dialogue

00:58
objective

01:05
cinematic payoff

01:12
DIRECTOR'S CUT result

01:20
original vs edited

01:27
ROLL AGAIN

01:30
VICE CUT
```

The exact timing can change after rehearsal, but the story structure must remain.

---

# 36. FINAL DEMO BACKUP

Record a complete clean demo.

Have:

1. live deployed version
2. local version
3. recorded 90-second video
4. deterministic fallback images
5. screenshots
6. README
7. GitHub repository

If internet fails, the recorded demo still tells the story.

---

# 37. FINAL ACCEPTANCE TEST

The project is NOT finished until a fresh user can:

1. open the URL
2. understand what VICE CUT is without reading documentation
3. start a mission
4. understand the scene instruction
5. open the actual Unlayer editor
6. make a visible edit
7. lock the frame
8. see the edited image become cinematic
9. understand the mission outcome
10. replay the experience

Target:

**No verbal explanation required.**

---

# 38. FINAL JUDGE TEST

Ask a person unfamiliar with the project to watch the first 30 seconds.

Immediately ask:

> “What do you think this is?”

Expected answer should be approximately:

> “It's like a GTA-style mission where you edit the scene before playing/directing it.”

If they say:

> “It's a photo editor.”

The concept has failed.

If they say:

> “It's some kind of social media thing.”

The concept has failed.

If they say:

> “It's a website with GTA images.”

The concept has failed.

If they say:

> “Wait, I edited the scene and then it became the mission?”

The concept is working.

---

# 39. DEFINITION OF DONE

VICE CUT is done when:

```text
[✓] premium title screen
[✓] premium mission select
[✓] 3 coherent cinematic scenes
[✓] actual Unlayer editor integrated
[✓] editing changes the scene
[✓] LOCK FRAME transition is cinematic
[✓] edited scene becomes cinematic frame
[✓] mission outcome exists
[✓] original vs director cut exists
[✓] deterministic demo
[✓] fallback behavior
[✓] responsive desktop experience
[✓] optimized images
[✓] audio optional
[✓] README
[✓] asset credits
[✓] deployed
[✓] public repo
[✓] end-to-end tested
[✓] 90-second demo rehearsed
```

---

# 40. THE SINGLE MOST IMPORTANT IMPLEMENTATION PRINCIPLE

Do not build:

**“a website that uses the Unlayer Image Editor.”**

Build:

**“a mission-director game experience whose central mechanic happens to be powered by the Unlayer Image Editor.”**

The judge should remember:

> **“That was the one where I edited the GTA scene myself and then watched my edit become the mission.”**

That is the product.

That is the demo.

That is the reason Unlayer belongs in the project.

---

# 41. FIRST COMMAND / FIRST TASK FOR CLAUDE

Before implementing anything substantial:

1. Inspect the existing repository.
2. Inspect package.json and current framework versions.
3. Inspect the installed/available Unlayer React Image Editor package and its current documented API.
4. Verify the minimal save → edited-image render flow.
5. Report the exact API discovered.
6. Do not invent methods or props.
7. Then create the design-system foundation.
8. Then build THE NIGHT SHIFT before the other scenes.
9. Do not build all screens at once.
10. After each major phase, run the project and visually inspect the rendered result.

Start with the technical spike.

The first success condition is:

**A real image enters Unlayer → the user edits it → the saved result is rendered → that exact result can be handed to the cinematic layer.**
