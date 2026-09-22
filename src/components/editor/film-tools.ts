/**
 * THE TOOL LEGEND — what each tool means, in the fiction.
 *
 * The rail can only hold five characters, so it can say GRADE but not "grade
 * the scene to set its mood". This is where the full verb lives: a panel beside
 * the frame that tells the player what each of THEIR tools does to the shot,
 * before they reach for it.
 *
 * Why it earns its space. The editor is the whole second half of the game, and
 * out of the box its rail is eight unlabelled-appearing buttons with stock
 * glyphs that mean nothing in this fiction. A judge who does not immediately
 * understand that MARK is the tool the brief is asking for will spend the demo
 * clicking things to find out. Naming the verbs is the difference between an
 * editor with a curated toolset and an editor the player can read.
 *
 * ORDER IS THE LIBRARY'S, NOT OURS, and that is deliberate. The legend's whole
 * claim is that it describes the rail beside it, so it is listed in the order
 * the editor actually renders that rail — filter, crop, resize, draw, text,
 * shapes, stickers, frame — rather than in ours. A legend that reads down one
 * order while the rail reads down another quietly misdescribes which tool is
 * which. That order comes from the editor, so it is the thing to re-check after
 * a version bump.
 *
 * Only the tools a mission actually enables are listed. A legend describing
 * tools that are not in the rail is worse than no legend: it sends the player
 * looking for a button that is not there.
 */

import type { EditorTools } from "@/data/missions";
import { RAIL } from "./editor-skin";

export interface FilmTool {
  key: keyof EditorTools;
  /** Matches the rail label, so the legend and the rail cannot drift apart. */
  rail: string;
  /** The full verb, as the director's call sheet would name it. */
  verb: string;
  /** What it does to the shot. One line. */
  effect: string;
}

/**
 * The eight tools, in the editor's own rail order.
 *
 * `effect` is written as direction rather than as feature copy — what the tool
 * DOES to the picture — because the player is making a film, not operating
 * software. It is also deliberately non-judgemental: the mission's brief decides
 * what counts as a good cut, and this panel must not pre-empt that.
 */
export const FILM_TOOLS: readonly FilmTool[] = [
  {
    key: "filter",
    rail: RAIL.filter,
    verb: "GRADE",
    effect: "Set the mood of the whole shot — light, colour, focus.",
  },
  {
    key: "crop",
    rail: RAIL.crop,
    verb: "REFRAME",
    effect: "Choose what the audience sees. What you cut out, they never saw.",
  },
  {
    key: "resize",
    rail: RAIL.resize,
    verb: "REFORMAT",
    effect: "Change the shape of the print itself.",
  },
  {
    key: "draw",
    rail: RAIL.draw,
    verb: "MARK",
    effect: "Put your hand on the frame. The most direct thing you can do.",
  },
  {
    key: "text",
    rail: RAIL.text,
    verb: "SLATE",
    effect: "Write on the frame — a caption, a timestamp, a title card.",
  },
  {
    key: "shapes",
    rail: RAIL.shapes,
    verb: "INSERT",
    effect: "Build a solid: a bar, a circle, an arrow, a rule.",
  },
  {
    key: "stickers",
    rail: RAIL.stickers,
    verb: "PROP",
    effect: "Bring something into the shot that was not in it.",
  },
  {
    key: "frame",
    rail: RAIL.frame,
    verb: "MATTE",
    effect: "Mount the print in a border, the way a finished still is presented.",
  },
] as const;

/**
 * The tools enabled for one mission, in rail order.
 *
 * Filtered rather than sliced: a mission declares its toolset as a map, and the
 * legend has to describe exactly that map — no more, no less.
 */
export function toolsFor(tools: EditorTools): FilmTool[] {
  return FILM_TOOLS.filter((t) => tools[t.key]);
}
