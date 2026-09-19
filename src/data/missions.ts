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
    scene: "/scenes/night-marina.svg",
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
    scene: "/scenes/coastal-highway.svg",
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
    scene: "/scenes/industrial-port.svg",
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
