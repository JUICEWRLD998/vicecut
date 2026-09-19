import type { Transition, Variants } from "motion/react";

/**
 * Shared motion vocabulary.
 *
 * Every animation in VICE CUT comes from here so timing stays coherent, and so
 * §22's rule is enforceable in one place: if an animation attracts more
 * attention than the scene, it is too much.
 *
 * Directional ease-out only. No spring, no bounce, no overshoot — those read as
 * "web app", and this is supposed to read as a game.
 */

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

/** UI feedback: 150–250ms per §22. */
export const T_UI: Transition = { duration: 0.18, ease: EASE_OUT };
export const T_UI_SLOW: Transition = { duration: 0.24, ease: EASE_OUT };

/** Scene-level transitions: 400–800ms per §22. */
export const T_SCENE: Transition = { duration: 0.56, ease: EASE_OUT };
export const T_SCENE_SLOW: Transition = { duration: 0.8, ease: EASE_OUT };

/** Staggered text reveal, used by the title card and cinematic HUD. */
export const staggerContainer = (stagger = 0.08, delay = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

/** A line of text arriving from below. Small distance — restraint is the point. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: T_SCENE },
};

/** HUD and metadata: opacity only, because these sit on top of the image. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: T_UI_SLOW },
};

/** Thin rules / brackets drawing themselves. */
export const wipeX: Variants = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: { scaleX: 1, opacity: 1, transition: T_SCENE },
};

export const wipeY: Variants = {
  hidden: { scaleY: 0, opacity: 0 },
  visible: { scaleY: 1, opacity: 1, transition: T_SCENE },
};

/** The LOCK FRAME exposure flash. Brief, once, never looped. */
export const exposureFlash: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: [0, 0.86, 0],
    transition: { duration: 0.42, times: [0, 0.12, 1], ease: EASE_IN_OUT },
  },
};

/** Slow camera push, §18. Scale only, and small: 1 -> 1.06 reads as a dolly,
 *  1 -> 1.4 reads as a zoom effect. */
export const cameraPush: Variants = {
  hidden: { scale: 1 },
  visible: { scale: 1.06, transition: { duration: 8, ease: "linear" } },
};
