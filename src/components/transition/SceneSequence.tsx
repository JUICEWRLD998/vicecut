"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Metadata } from "@/components/ui/Typography";
import styles from "./SceneSequence.module.css";

/**
 * SCENE SEQUENCE — the title-to-mission-select transition.
 *
 * A run of stills on a fast crossfade with a climbing progress rule. The
 * cadence is the reference implementation's (a single interval swapping the
 * frame every 520ms, extracted from its bundle), not an invention: keeping the
 * swap in JS and the crossfade in CSS means the two never contend for the DOM.
 *
 * It also has a second job. Mission select needs three images, and this overlay
 * is the only dead time in the flow — the sequence buys ~2.5s, which is exactly
 * enough to warm them (see `preload`) so the tiles come out of cache instead of
 * stalling on first reveal (§33).
 *
 * Render it as a sibling of the screen it covers, not inside a transformed
 * ancestor: `position: fixed` degrades to the nearest transformed containing
 * block, and a clipping parent would crop the overlay.
 */

/**
 * Crossfade length. One source of truth — it is published to CSS as `--xfade`
 * and used for the completion budget below, so the two cannot drift apart.
 */
const CROSSFADE_MS = 360;

/**
 * Reduced motion: one still, held just long enough to register, then complete.
 * Deliberately not zero — completing on the frame the overlay paints reads as a
 * flicker rather than a transition.
 */
const REDUCED_HOLD_MS = 700;

type Props = {
  /** Image srcs, already-resolved public paths. Cycled in order, once through. */
  scenes: readonly string[];
  /** Called once the sequence has finished playing. */
  onComplete: () => void;
  /** ms each image is held before the crossfade. */
  holdMs?: number;
  /**
   * Optional srcs to fetch while the sequence plays — in practice the mission
   * scenes. Fire-and-forget by design: the goal is the browser HTTP cache so a
   * later `<img>` is a hit, so nothing is retained and nothing must finish.
   */
  preload?: readonly string[];
  /** Caption slug shown beside the frame counter. */
  label?: string;
  /**
   * Let any key or click end the sequence immediately. Default true.
   *
   * The run is ~3.5s. That is right the first time and tedious on the third, and
   * the flow below this screen is keyboard-driven — so a judge replaying it
   * would otherwise sit through the whole thing every lap with no way past it.
   */
  skippable?: boolean;
};

export function SceneSequence({
  scenes,
  onComplete,
  holdMs = 520,
  preload,
  label,
  skippable = true,
}: Props) {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const reduced = reduceMotion === true;

  const doneRef = useRef(false);
  /**
   * The latest callback, kept in a ref so a caller passing an inline arrow
   * cannot restart a half-played sequence by changing `finish`'s identity.
   */
  const completeRef = useRef(onComplete);
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  const finish = useCallback(() => {
    // React 19 StrictMode invokes effects twice in dev. Without this guard the
    // caller's navigation would fire twice and the sequence would run again.
    if (doneRef.current) return;
    doneRef.current = true;
    completeRef.current();
  }, []);

  const sceneCount = scenes.length;

  useEffect(() => {
    if (sceneCount === 0) {
      // Nothing to show. Complete on the next tick anyway, so a caller that
      // hands over an empty list still advances instead of hanging here.
      const empty = window.setTimeout(finish, 0);
      return () => window.clearTimeout(empty);
    }

    if (reduced) {
      // No interval is ever created under reduced motion, and completion is a
      // fixed timer rather than an animation callback. `MotionConfig
      // reducedMotion="user"` suppresses the motion but says nothing about
      // completion, so this path has to carry it on its own — otherwise the
      // overlay soft-locks the app.
      //
      // No index reset here: this component is mounted fresh each time the
      // overlay appears, so `useState` already starts it at 0. Resetting in the
      // effect body would be a cascading render for no state change.
      const still = window.setTimeout(finish, REDUCED_HOLD_MS);
      return () => window.clearTimeout(still);
    }

    const advance = window.setInterval(() => {
      // Clamped, not wrapped. `% sceneCount` would flash back to the first
      // still for the final crossfade, so the sequence would appear to restart
      // on its last beat. Holding the last frame lets it land instead.
      setIndex((i) => Math.min(i + 1, sceneCount - 1));
    }, holdMs);

    // Completion is scheduled independently of the interval instead of derived
    // from it. A throttled or coalesced interval — background tab, long frame —
    // would otherwise strand the overlay on screen with no way out. The extra
    // crossfade lets the final frame land before the overlay leaves.
    const done = window.setTimeout(finish, sceneCount * holdMs + CROSSFADE_MS);

    return () => {
      window.clearInterval(advance);
      window.clearTimeout(done);
    };
  }, [finish, holdMs, reduced, sceneCount]);

  const preloadKey = preload?.join("\u0000") ?? "";
  useEffect(() => {
    if (!preloadKey) return;
    // Spend the hold time on the mission stills so mission select's tiles paint
    // from cache. The Image objects are not held: the cache is the point.
    for (const src of preloadKey.split("\u0000")) {
      const img = new window.Image();
      img.src = src;
    }
  }, [preloadKey]);

  useEffect(() => {
    if (!skippable) return;
    // `finish` is idempotent, so ending early and ending on time cannot both
    // navigate.
    const skip = () => finish();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [finish, skippable]);

  const total = sceneCount === 0 ? 1 : sceneCount;
  const shown = Math.min(index + 1, total);
  const pad = (n: number) => String(n).padStart(2, "0");
  const durationS = (sceneCount * holdMs + CROSSFADE_MS) / 1000;

  return (
    <div
      className={styles.overlay}
      style={
        {
          "--xfade": `${CROSSFADE_MS}ms`,
          // Published so the container's camera push spans the whole run rather
          // than one still. Same value the completion timer uses, so the push
          // and the overlay cannot finish out of step.
          "--seq-duration": `${durationS}s`,
        } as CSSProperties
      }
    >
      {/* Every still mounts at once, mirroring the reference, which preloaded
          its whole set before the first swap. A frame that mounts on demand
          crossfades in from a not-yet-decoded state and pops when it lands. */}
      <div className={styles.frames}>
        {scenes.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            className={styles.frame}
            src={src}
            alt=""
            aria-hidden="true"
            data-active={i === index}
          />
        ))}
      </div>

      <div className={styles.scrim} aria-hidden="true" />

      {/* Hidden from assistive tech: as a typographic slug this reads as noise.
          The live region below carries the same information once, as a
          sentence, and is what a screen reader actually hears. */}
      <div className={styles.hud} aria-hidden="true">
        <div className={styles.rule}>
          <motion.span
            className={styles.ruleFill}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={
              reduced
                ? { duration: 0 }
                : { duration: durationS, ease: "linear" }
            }
          />
        </div>
        <div className={styles.row}>
          <Metadata tone="accent">{`Frame ${pad(shown)} / ${pad(total)}`}</Metadata>
          {label ? <Metadata tone="paper">{label}</Metadata> : null}
        </div>
      </div>

      <p className={styles.srOnly} role="status" aria-live="polite">
        {`Frame ${shown} of ${total}${label ? `. ${label}` : ""}`}
      </p>
    </div>
  );
}
