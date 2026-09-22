"use client";

import { motion, useReducedMotion } from "motion/react";
import styles from "./Meter.module.css";

/**
 * A FIGURE WITH A SCALE UNDER IT.
 *
 * This exists because the result screen used to print bare numbers — FRAMING 58,
 * COMPOSITION 58, CONTROL 0 — and a bare number is not a result. 58 against what?
 * Is 0 bad, or is it the floor? A reader has to be told the range and where the
 * line is, or the figure is decoration.
 *
 * So each figure carries three things it did not have:
 *
 *   the BAR      — the value as a length, so two figures compare at a glance
 *                  without the reader doing arithmetic in their head.
 *   the MARKS    — the thresholds the outcome actually turns on, ruled onto the
 *                  track. These are not invented for show: they come from the
 *                  game's own bands (see `directorRep` in src/lib/frame.ts and
 *                  `GRADE_SPREAD` in the same file). Without them the only way to
 *                  find the line is to push the value until a colour changes.
 *   the CAPTION  — which side of the nearest line the value fell, in words.
 *
 * The reference implementation does exactly this and it is the single clearest
 * reason its result screen reads as a report rather than as a scoreboard. The
 * look here is ours — one flat bar on a hairline track, no card, no gradient.
 */

export type MeterTone = "paper" | "accent" | "amber";

export function Meter({
  value,
  tone = "paper",
  /** Percentages (0-100) to rule off. See the note above for where these come from. */
  marks = [],
  height = 5,
}: {
  value: number;
  tone?: MeterTone;
  /**
   * Readonly on purpose: the callers pass shared constant band tables
   * (`REP_BANDS`), and a mutable `number[]` here would force every one of them
   * to be declared mutable or spread-copied at each call site.
   */
  marks?: readonly number[];
  height?: number;
}) {
  const reduced = useReducedMotion() === true;
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className={styles.track}
      style={{ height }}
      role="presentation"
      data-tone={tone}
    >
      {/* The track texture. A faint tick every 10% so the bar reads as a gauge
          with divisions rather than as an arbitrary progress fill. */}
      <div className={styles.ticks} aria-hidden="true" />

      <motion.div
        className={styles.fill}
        initial={reduced ? false : { width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={
          reduced ? { duration: 0 } : { duration: 0.9, ease: [0.16, 1, 0.3, 1] }
        }
      />

      {marks.map((m) => (
        <span
          key={m}
          className={styles.mark}
          style={{ left: `${Math.max(0, Math.min(100, m))}%` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/**
 * A labelled figure: name on the left, value on the right, scale beneath.
 *
 * The value is a STRING because it is usually a count-up mid-animation (see
 * `useCountUp`); passing a number here would freeze it at its target.
 */
export function MeterRow({
  label,
  value,
  tone = "paper",
  marks = [],
  caption,
  delayMs = 0,
}: {
  label: string;
  value: string;
  tone?: MeterTone;
  marks?: readonly number[];
  /** One short line naming the line the value landed on. Omit when there is none. */
  caption?: string;
  delayMs?: number;
}) {
  return (
    <div className={styles.row} style={{ transitionDelay: `${delayMs}ms` }}>
      <div className={styles.rowHead}>
        <span className={styles.rowLabel}>{label}</span>
        <span className={styles.rowValue}>{value}</span>
      </div>
      <Meter
        value={Number.parseFloat(value) || 0}
        tone={tone}
        marks={marks}
      />
      {caption ? <span className={styles.rowCaption}>{caption}</span> : null}
    </div>
  );
}

/**
 * A single measured fact, as a label-over-value block.
 *
 * Deliberately not a Meter: ALTERED 0.3% has no threshold to land on, so a gauge
 * would be inventing a scale to fill. It gets the figure and the unit and nothing
 * else — see the readout note in MissionCinematic for why the unit matters more
 * than the bar here.
 */
export function Figure({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className={styles.figure}>
      <span className={styles.figureLabel}>{label}</span>
      <span className={styles.figureValue}>{value}</span>
      {unit ? <span className={styles.figureUnit}>{unit}</span> : null}
    </div>
  );
}
