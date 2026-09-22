"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * A number that counts up to its value.
 *
 * Stolen in mechanism, not in look, from the reference implementation — and it
 * earns its place for one reason: a figure that ARRIVES is read, and a figure
 * that is simply there is skimmed. The result screen is a payoff, and the payoff
 * is the moment the numbers land.
 *
 * Two rules, both load-bearing:
 *
 *  1. IT ALWAYS ENDS EXACTLY ON THE TARGET. The measured value is the real one
 *     (`analyseFrame` computed it from the locked frame's pixels), so an
 *     animation that stopped a frame early would leave a WRONG number on screen.
 *     The eased value is interpolated from 0 to `target` and the last frame sets
 *     `target * 1`, but the return is also rounded the same way the static
 *     figures are, so no path leaves a stale value behind.
 *
 *  2. REDUCED MOTION GETS THE VALUE IMMEDIATELY. Counting is pure decoration; the
 *     number is content. §24 requires the app to stay fully usable, and someone
 *     who has asked for less motion should not have to watch a slot machine to
 *     read their own score.
 *
 * The ease is cubic-out — fast arrival, settled landing — because a linear count
 * reads as a progress bar rather than as a figure being struck.
 */
export function useCountUp(
  target: number,
  {
    durationMs = 900,
    decimals = 0,
    /** False while the value is unknown, so nothing counts to a placeholder. */
    enabled = true,
  }: { durationMs?: number; decimals?: number; enabled?: boolean } = {},
): string {
  const reduced = useReducedMotion() === true;
  const format = (n: number) =>
    decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));

  const [value, setValue] = useState(() =>
    enabled && !reduced ? format(0) : format(target),
  );
  const frame = useRef<number>(0);

  useEffect(() => {
    // Reduced motion, or a disabled counter, lands on the target immediately —
    // but still through the frame callback, so nothing is set synchronously in
    // the effect body and there is no cascading render on mount.
    const jump = !enabled || reduced;
    const start = performance.now();

    const tick = (now: number) => {
      const t = jump ? 1 : Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(format(target * (jump ? 1 : eased)));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
    // `format` is rebuilt every render by design; including it would restart the
    // count on every parent render, which is exactly the bug that makes these
    // counters stutter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, enabled, reduced, decimals]);

  return value;
}
