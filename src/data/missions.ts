/**
 * Mission data.
 *
 * Kept deliberately separate from UI (§3): the components read this shape, they
 * do not own it. Adding a mission should mean adding one object here.
 *
 * `tools` is the curated editor toolset per mission (§16) — the editor should
 * feel directed, not like a box of every tool that exists.
 */

export type MissionId = "the-night-shift" | "southbound" | "no-signal";

/**
 * Curated editor toolset, per §16.
 *
 * Every one of the editor's eight tools is declared, and every key is REQUIRED.
 * Both halves of that are deliberate:
 *
 * - Required, because an omitted key is not "off" — the editor falls back to its
 *   own default, which is enabled. Omitting `resize` once silently shipped an
 *   extra tool in the curated rail, so the type makes omission a compile error.
 * - Explicit even when `false`, because the rail is an art-direction decision.
 *   `frame: false` on the redaction mission is a statement about that mission,
 *   not an oversight, and it should be readable as one at the point of editing.
 */
export type EditorTools = {
  crop: boolean;
  resize: boolean;
  filter: boolean;
  draw: boolean;
  text: boolean;
  shapes: boolean;
  stickers: boolean;
  frame: boolean;
};

/**
 * The pre-edit briefing clip (§10-12, §18).
 *
 * A short cut of stills that plays before the editor opens, ending on a freeze
 * frame the player then marks. It exists because the instruction was unearned:
 * mission 01 says "mark the moment the plan goes wrong" and, without this, the
 * player has never seen the plan or seen it go wrong. Five seconds of footage
 * earns the instruction and turns the editor from "decorate a photo" into
 * "annotate evidence of a specific failure".
 *
 * Built from stills rather than trailer footage, deliberately. The official
 * trailers were pulled and examined: Trailer 1 is a 90s lifestyle montage with
 * no narrative beat to freeze on, it is encoded MPEG-4 Part 2 (which browsers do
 * not play, so every clip would need re-encoding), and it carries frames this
 * project's own content bar would reject — two pool-party shots, a nightclub
 * interior, and a frame captioned "Neighborhood watch teen shot". It also opens
 * on an ESRB warning card. The screenshot set is already screened, already 4K,
 * already in this repo. Full reading in docs/SCENE-SOURCES.md.
 */
export type Briefing = {
  /**
   * Stills in cut order. THE LAST ONE IS THE FREEZE FRAME — it is what the
   * player marks, and what the target region below is measured against. Stated
   * once rather than as a separate field, so the two cannot drift apart.
   */
  frames: readonly string[];
  /** How long each still holds before the cut, in ms. */
  holdMs: number;
  /**
   * Where the moment actually is, as fractions of the frame.
   *
   * DERIVED FROM THE IMAGE, not authored by eye — see the note on the
   * derivation below. Generous on purpose (0.36 of the frame per side): a demo
   * that tells a judge they failed because their mark was 40px off is worse
   * than having no check at all.
   */
  target: { x: number; y: number; w: number; h: number };
  /** What the clip is showing, for the objective line over the freeze. */
  beat: string;
};

export type Mission = {
  id: MissionId;
  /** 1-based, drives "SCENE 01 / 03". */
  index: number;
  /** 2-digit display index, "01". */
  code: string;
  name: string;
  location: string;
  mood: string;
  /** In-world time, mono metadata. */
  time: string;
  scene: string;
  /**
   * CSS `object-position` for the scene crop. REQUIRED, like `tools`.
   *
   * The sources are 16:9 but a mission tile is close to 3:4, so `cover` keeps
   * only about a third of the frame's width. Centre-cropping a source whose
   * subject sits off-centre throws the subject away — "No Signal" rendered as
   * palm trees with the motel sign sliced off the edge until this was set.
   * Stating it per mission makes the crop a decision instead of a default.
   */
  sceneFocus: string;
  /** One line of situation. */
  synopsis: string;
  /** What the player is asked to do in the editor. */
  instruction: string;
  /** Where the cinematic leaves them. */
  objective: string;
  /** Verbatim radio line for the cinematic. */
  radio: { who: string; line: string };
  /**
   * The Director's Cut slate readout (§20).
   *
   * The editor hands back a flattened image; it hands back no idea what was
   * done to it. So the readout is part invention — but built from facts: the
   * measurements below (wraps, runtime) are computed from the locked frame
   * itself, and only the film-language naming is authored per mission. The
   * result reads as a real slate rather than a canned score, which is what §20
   * asks for when it says not to pretend these are measured AI scores.
   */
  slate: {
    /** What the camera did, in film language. */
    framing: string;
    /** The genre line. */
    genre: string;
    /** What the locked frame is a print of. */
    process: string;
    /**
     * The word the slate reports when the player annotated the frame — drawn,
     * typed, or placed a shape on it.
     *
     * Authored per mission so it echoes that mission's own instruction rather
     * than printing a generic "MARKED" three times: mission 01 says "mark the
     * moment", so its verdict is Marked; mission 03 says "obscure the target",
     * so its verdict is Redacted. The classification is derived from measured
     * pixels (`classifyEdit` in src/lib/frame.ts); only this word is authored,
     * and it is the vocabulary the brief already gave the player.
     */
    verdict: string;
  };
  /**
   * The pre-edit clip. Optional so a mission without one still works, but every
   * mission in the demo should have one — an instruction the player has not
   * earned is the weaker half of this product.
   */
  briefing?: Briefing;
  tools: EditorTools;
};

export const MISSIONS: readonly Mission[] = [
  {
    id: "the-night-shift",
    index: 1,
    code: "01",
    name: "The Night Shift",
    location: "Vice City Marina",
    mood: "Night / Rain / Neon",
    time: "01:42 AM",
    scene: "/scenes/night-shift.jpg",
    sceneFocus: "50% 50%",
    synopsis: "The meet is compromised.",
    instruction: "Mark the moment the plan goes wrong.",
    objective: "Reach the marina",
    radio: { who: "JASON", line: "You got one shot." },
    slate: {
      framing: "Tight two",
      genre: "Neon noir",
      process: "Annotated print",
      verdict: "Marked",
    },
    /**
     * Three beats, ~1.5s each, ending on the freeze the player marks.
     *
     * 1. the world — the night city the mission happens in, which doubles as the
     *    mission's own scene so the clip and the level are visibly the same place
     * 2. the meet — Jason at the bar with the money out and two men watching him
     * 3. the moment — the burning car, and the two of them walking away from it
     *
     * The third frame is the freeze. The target region was derived from that
     * image rather than placed by eye, and the derivation has a real failure mode
     * worth recording: the first version scored a cell by luminance x saturation
     * and latched onto a flat sunset sky on mission 03, because a bright empty
     * gradient scores exactly like a lit subject. The measure now multiplies in a
     * high-pass term — how far a pixel departs from its blurred neighbourhood —
     * so bright AND detailed wins and bright AND flat no longer scores. Regions
     * were then drawn onto their frames and checked visually; scores alone would
     * not have caught it.
     */
    briefing: {
      frames: [
        "/scenes/night-shift.jpg",
        "/briefs/Jason_Duval_06.jpg",
        "/briefs/Jason_and_Lucia_08.jpg",
      ],
      holdMs: 1500,
      target: { x: 0.351, y: 0.542, w: 0.36, h: 0.36 },
      beat: "The meet is compromised.",
    },
    /* Annotation-led: mark it, label it, grade it, finish it. `resize` is the
       one tool with no narrative job here — the shot is already framed. */
    tools: {
      crop: true,
      resize: false,
      filter: true,
      draw: true,
      text: true,
      shapes: true,
      stickers: true,
      frame: true,
    },
  },
  {
    id: "southbound",
    index: 2,
    code: "02",
    name: "Southbound",
    location: "Leonida Keys",
    mood: "Sunset / Highway / Heat",
    time: "19:18",
    scene: "/scenes/southbound.jpg",
    sceneFocus: "50% 58%",
    synopsis: "The package moves south.",
    instruction: "Frame the escape.",
    objective: "Keep the car in frame",
    radio: { who: "LUCIA", line: "Don't lose him." },
    slate: {
      framing: "Raked push-in",
      genre: "Sunset pursuit",
      process: "Framed print",
      verdict: "Framed",
    },
    /* Framing-led, per §11 — the brief calls this the scene that "should
       demonstrate cropping/framing more than drawing", so the annotation tools
       are off entirely. Four tools, all about where the edges are. */
    tools: {
      crop: true,
      resize: true,
      filter: true,
      draw: false,
      text: false,
      shapes: false,
      stickers: false,
      frame: true,
    },
  },
  {
    id: "no-signal",
    index: 3,
    code: "03",
    name: "No Signal",
    location: "Port Gellhorn",
    mood: "Night / Industrial / Surveillance",
    time: "03:07",
    scene: "/scenes/no-signal.jpg",
    sceneFocus: "22% 50%",
    synopsis: "Someone is watching.",
    instruction: "Obscure the target.",
    objective: "Break the line of sight",
    radio: { who: "JASON", line: "Camera's live. Do something." },
    slate: {
      framing: "Redacted frame",
      genre: "Cold surveillance",
      process: "Seized footage",
      verdict: "Redacted",
    },
    /* Obstruction-led: censor bars, blackout strokes, redaction, and a grade to
       sell the camera. `crop` stays because reframing the target out of shot is
       a legitimate answer to the brief, which makes this the one mission where
       two different tools solve the same instruction. No resize or frame — this
       is surveillance footage, not a framed print. */
    tools: {
      crop: true,
      resize: false,
      filter: true,
      draw: true,
      text: true,
      shapes: true,
      stickers: true,
      frame: false,
    },
  },
] as const;

export const MISSION_COUNT = MISSIONS.length;

/**
 * Title-screen art (§8).
 *
 * The official GTA VI cover, not a mission scene: the landing page sits above
 * the fiction, so it carries the key art rather than an in-world frame.
 *
 * Note this file is the flat 16:9 cover plate — the logo lockup on its own dark
 * ground — not the 9-panel poster. The poster's panel grid and centred logo
 * carry no region a wordmark can sit on: measured, the title band came out at
 * 1.75:1 against --c-paper, i.e. below the 2.47:1 pair the contrast script
 * already plants as a deliberate failure. The plate reads and the poster does
 * not, so the plate is what ships. Full reading in docs/SCENE-SOURCES.md.
 */
export const TITLE_SCENE = "/scenes/title-cover.jpg";

/**
 * Title-screen key art — the Jason & Lucia robbery artwork.
 *
 * This replaced TITLE_SCENE on the landing page (2026-09-20). Both are official
 * cover art and both were kept, because they are genuinely different tools:
 * TITLE_SCENE is a flat plate whose value is that its mid-frame is empty, which
 * is why the `/design` playground and the spike composition still use it — it
 * lets a designer see the scrim and type over the *real* landing structure.
 * This one is the actual landing art.
 *
 * It carries the type far better than the plate did. The figures sit centre-
 * right against a clean violet sky, so the whole left column is low-detail and
 * the wordmark can run at the full hero size instead of being capped to clear
 * the GTA VI lockup. It is also bright and saturated, which is the point: the
 * sequence now opens on it at full strength and the world reads as a world.
 */
export const TITLE_ART = "/scenes/Jason_and_Lucia_Robbery_landscape.jpg";

/**
 * The title-to-mission-select transition (§22).
 *
 * Six stills run on the reference implementation's cadence — one frame every
 * 520ms, crossfading — then the app lands on mission select in place of the old
 * white exposure wipe.
 *
 * Order is an arc, not a ranking: dusk → gold → blue → green → night → neon.
 * The last frame is the neon skyline deliberately, so the sequence lands on the
 * same note the mission-select screen picks up. Reordering these changes the
 * feel more than swapping any single image does.
 *
 * Served at 1920x1080 from `public/seq/` — half the 3840x2160 masters. Each
 * still is on screen for about half a second, so full resolution bought nothing
 * and cost roughly 6MB during a transition. Re-derive from the official
 * screenshots bundle; see docs/SCENE-SOURCES.md.
 */
export const SEQUENCE_SCENES = [
  "/seq/01-Vice_City_01.jpg",
  "/seq/02-Ambrosia_04.jpg",
  "/seq/03-Leonida_Keys_01.jpg",
  "/seq/04-Mount_Kalaga_National_Park_05.jpg",
  "/seq/05-Port_Gellhorn_01.jpg",
  "/seq/06-Vice_City_08.jpg",
] as const;

export function getMission(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id);
}

/**
 * The image the editor opens on, and the frame the locked result is measured
 * against.
 *
 * This is the briefing's freeze frame when there is one, not `mission.scene`.
 * The two are different pictures — mission 01's `scene` is the night-city aerial
 * used for the tile and the brief, while its freeze is the burning car — and
 * measuring a locked frame against the wrong one would report a near-100%
 * change on a frame nobody touched. Both the editor's source and the analysis
 * baseline read from here, so they cannot disagree.
 */
export function editableFrame(mission: Mission): string {
  const frames = mission.briefing?.frames;
  return frames && frames.length > 0 ? frames[frames.length - 1] : mission.scene;
}

/**
 * Next mission in sequence, or undefined at the end. Used by "NEXT OPERATION";
 * the final mission offers only "ROLL AGAIN".
 */
export function getNextMission(id: string): Mission | undefined {
  const i = MISSIONS.findIndex((m) => m.id === id);
  return i === -1 ? undefined : MISSIONS[i + 1];
}

/** All mission ids, for generateStaticParams. */
export function missionIds(): MissionId[] {
  return MISSIONS.map((m) => m.id);
}
