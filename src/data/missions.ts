/**
 * Mission data.
 *
 * Kept deliberately separate from UI (§3): the components read this shape, they
 * do not own it. Adding a mission should mean adding one object here.
 *
 * `tools` is the curated editor toolset per mission (§16) — the editor should
 * feel directed, not like a box of every tool that exists. Consumed in Phase 5.
 */

export type MissionId = "the-night-shift" | "southbound" | "no-signal";

/**
 * Curated editor toolset, per §16.
 *
 * Every key is REQUIRED and must be stated explicitly. An omitted key is not
 * "off" — the editor falls back to its own default, which is enabled. Omitting
 * `resize` once silently shipped an extra tool in the curated rail, so the type
 * now makes the omission a compile error rather than a runtime surprise.
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
    tools: {
      crop: true,
      resize: false,
      filter: true,
      draw: true,
      text: true,
      shapes: true,
      stickers: false,
      frame: false,
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
    tools: {
      crop: true,
      resize: true,
      filter: true,
      draw: false,
      text: false,
      shapes: false,
      stickers: false,
      frame: false,
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
    tools: {
      crop: false,
      resize: false,
      filter: true,
      draw: true,
      text: true,
      shapes: true,
      stickers: false,
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
