"use client";

import { motion, useReducedMotion } from "motion/react";
import styles from "./Stamp.module.css";

/**
 * THE VERDICT, STRUCK.
 *
 * A stamp rather than a heading, and the difference is the whole point: a heading
 * is read as a title, a stamp is read as a DECISION. It is rotated slightly, its
 * border is doubled the way a rubber stamp bleeds at the edge, and it lands with
 * a short press instead of fading in — one of the few places in this product
 * where motion is allowed to draw attention, because this is the moment the
 * mission answers the player.
 *
 * The words come from the mission's own brief. Mission 01 says "mark the moment"
 * and stamps MARKED; mission 03 says "obscure the target" and stamps REDACTED. So
 * the verdict always answers in the vocabulary the player was given, which is
 * what stops it reading as a generic "SUCCESS".
 *
 * Tone is doing real work here, not decoration: `accent` means the brief was
 * answered, `muted` means the frame arrived without any direction in it. It is
 * deliberately NOT a red/danger state — an unmarked frame is a miss, not a
 * failure of the demo, and red would make a legitimate play read as an error.
 */

export type StampTone = "accent" | "amber" | "muted";

export function Stamp({
  children,
  tone = "accent",
  rotate = -4,
  delayMs = 0,
}: {
  children: string;
  tone?: StampTone;
  /** Degrees. Small — past about 8 it reads as a sticker rather than a stamp. */
  rotate?: number;
  delayMs?: number;
}) {
  const reduced = useReducedMotion() === true;

  return (
    <motion.div
      className={styles.stamp}
      data-tone={tone}
      style={{ rotate: `${rotate}deg` }}
      initial={reduced ? false : { opacity: 0, scale: 1.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: 0.18, delay: delayMs / 1000, ease: [0.16, 1, 0.3, 1] }
      }
    >
      {children}
    </motion.div>
  );
}
