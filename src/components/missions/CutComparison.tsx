"use client";

import { useCallback, useRef, useState } from "react";
import { Metadata } from "@/components/ui/Typography";
import styles from "./CutComparison.module.css";

/**
 * THE COMPARISON (§21) — the payoff element of the result.
 *
 * This exists because the comparison used to happen in the wrong place, at the
 * wrong time, and that is what made the result screen read as broken.
 *
 * What it replaced: the full-bleed wipe stayed mounted through the result beat,
 * so a bare 2px accent line drew straight down the middle of the finished page
 * and split the locked frame behind a panel that has no background of its own.
 * On a frame nobody edited, both halves were pixel-identical and there were no
 * labels left to explain it — it read as a rendering fault, not as a comparison.
 *
 * What it is instead: a FRAMED element of the result document. Same wipe, same
 * interaction, but inside a bordered panel with its own labels and its own
 * caption, sitting where the reader is already looking. The comparison is a beat
 * in the cinematic; the result is the paperwork, and the paperwork carries a
 * plate.
 *
 * And it answers the question the result was not answering. The briefs say
 * "mark the moment the plan goes wrong" and "obscure the target" — but the
 * target was a hidden rect in `missions.ts`, so a player was graded against a
 * region they had never been shown. Here it is drawn: THE MOMENT is boxed on
 * the original, in amber, and the caption says whether their mark landed in it.
 * A verdict without its answer key is a verdict that reads as noise.
 *
 * Drawn ONLY on the original side of the divider (the box lives inside the
 * clipped layer), because the region is authored in the original's coordinate
 * space. If the player cropped, their frame is a different shape and a box
 * drawn over it would be a lie about where the moment is.
 */

/**
 * Where the divider opens.
 *
 * 74, not the 52 the cinematic used to rest at, and not 50. The moment box spans
 * roughly 35% to 71% of the frame, so a divider anywhere left of 71% opens with
 * the answer key half-wiped — the plate's whole job is to show the player where
 * the moment was. Opening clear of it lets the reveal land as "here is the
 * original, boxed" and then hands over the wipe.
 */
const DIVIDER_OPEN = 74;

export function CutComparison({
  originalSrc,
  cutSrc,
  target,
  targetLabel,
  onTarget,
  onTargetShare,
  edited,
  missionName,
}: {
  originalSrc: string;
  cutSrc: string;
  /** The moment, as fractions of the original frame. Absent on a mission with no briefing. */
  target?: { x: number; y: number; w: number; h: number };
  /**
   * What this mission calls its target region — "The moment", "The car",
   * "The target". Passed in because the tag is drawn INSIDE the frame and has to
   * speak the mission's own vocabulary: the plate hardcoded "The moment", so
   * Southbound captioned a car with the word only mission 01 ever uses.
   */
  targetLabel?: string;
  onTarget: boolean;
  onTargetShare: number;
  /** Whether the editor reported an edit at lock time. */
  edited: boolean;
  missionName: string;
}) {
  const [divider, setDivider] = useState(DIVIDER_OPEN);
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const setFromClientX = useCallback((clientX: number) => {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    setDivider(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 4;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setDivider((d) => Math.max(0, d - step));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setDivider((d) => Math.min(100, d + step));
    } else if (e.key === "Home") {
      e.preventDefault();
      setDivider(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setDivider(100);
    }
  }, []);

  /**
   * The caption, in the player's own terms.
   *
   * Three cases, and the unmarked one is the one that was missing. The result
   * used to print "MARK OFF TARGET · 0% of the mark inside the moment" for a
   * frame nobody had touched, which reads as a scoring bug: there was no mark,
   * so zero of it being inside anything is not a finding. Saying so plainly is
   * the difference between a verdict and an error message.
   *
   * The label comes from the mission rather than from here, so Southbound says
   * "the car" and No Signal says "the target". Hardcoding "the moment" told two
   * of three missions they had failed at something their brief never asked for.
   *
   * The preposition is "inside" and the phrasing is percentage-first, because
   * that is the only construction that reads correctly for all three labels.
   * "landed on" works for a car and a target but produces "landed on the moment",
   * which is not English — a moment is not a surface. "inside" is true of the
   * region in every case: inside the moment, inside the car, inside the target.
   */
  const what = (targetLabel ?? "the target").toLowerCase();
  const caption = !edited
    ? target
      ? `You submitted the frame unmarked. ${targetLabel ?? "The target"} was here.`
      : "You submitted the frame unmarked."
    : onTarget
      ? `Your mark is inside ${what} — ${onTargetShare}% of it.`
      : `Only ${onTargetShare}% of your mark reached ${what}.`;

  return (
    <figure className={styles.panel}>
      <div
        ref={frameRef}
        className={styles.frame}
        data-dragging={dragging}
        onPointerDown={(e) => {
          setDragging(true);
          setFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging) setFromClientX(e.clientX);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
      >
        {/* The player's cut is the base layer, so the panel reads as their frame
            with the original wiped over it — not as the original with their work
            hidden behind it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.cut} src={cutSrc} alt={`Your cut of ${missionName}`} />

        <div className={styles.originalLayer} style={{ clipPath: `inset(0 ${100 - divider}% 0 0)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.original} src={originalSrc} alt={`${missionName} as it was shot`} />

          {target ? (
            <div
              className={styles.moment}
              data-hit={onTarget && edited}
              style={{
                left: `${target.x * 100}%`,
                top: `${target.y * 100}%`,
                width: `${target.w * 100}%`,
                height: `${target.h * 100}%`,
              }}
            >
              <span className={styles.momentTag}>{targetLabel ?? "The target"}</span>
            </div>
          ) : null}
        </div>

        {/* The divider. Keyboard-reachable and arrow-operable, per the same rule
            the rest of the product follows: a control a judge cannot reach is
            not a control. pointer-events are off so a drag passes through to the
            frame beneath it, which is a far larger target than a 2px line. */}
        <div
          className={styles.divider}
          style={{ left: `${divider}%` }}
          role="slider"
          tabIndex={0}
          aria-label="Wipe between the original and your cut"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(divider)}
          aria-valuetext={`${Math.round(divider)}% original`}
          onKeyDown={onKey}
        >
          <span className={styles.grip} aria-hidden="true" />
        </div>

        <span className={styles.tagLeft}>Original</span>
        <span className={styles.tagRight}>Your cut</span>
      </div>

      <figcaption className={styles.caption}>
        <Metadata tone={edited && onTarget ? "accent" : "muted"}>{caption}</Metadata>
        <Metadata className={styles.hint}>Drag to compare</Metadata>
      </figcaption>
    </figure>
  );
}
