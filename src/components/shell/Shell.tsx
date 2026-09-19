import type { ReactNode } from "react";
import styles from "./Shell.module.css";

/**
 * Full-bleed decorative layers.
 *
 * Two deliberate scopes:
 *   "viewport" — pinned to the window. This is the page-level grading, and it
 *                must not stretch over a tall document, so it is `fixed`.
 *   "local"    — fills the nearest positioned ancestor. Used when the effect is
 *                a *motif* (a CCTV pane, a graded still), not page grading.
 *
 * Mixing these up is not cosmetic: a nested layer left at viewport scope covers
 * the entire page, which is exactly what happened when these were all `fixed`
 * and a demo instance graded the whole playground.
 *
 * Every layer is pointer-events: none and aria-hidden, and every one sits at an
 * opacity low enough to be felt rather than seen — the brief's rule is that if
 * you can consciously see the texture, it is too strong. The noise is seeded
 * (not random) so two runs of the presentation cannot look different.
 */

type Scope = "local" | "viewport";

/** Film grain. Static, not animated: moving grain reads as video compression. */
export function FilmGrain({ scope = "local" }: { scope?: Scope } = {}) {
  return <div className={styles.grain} data-scope={scope} aria-hidden="true" />;
}

/** Vignette. Darkens the frame edges so HUD text at the edges stays legible. */
export function Vignette({ scope = "local" }: { scope?: Scope } = {}) {
  return <div className={styles.vignette} data-scope={scope} aria-hidden="true" />;
}

/** Scanlines. 6px pitch, extremely faint. Reserved for the CCTV/cinematic layer. */
export function Scanlines({ scope = "local" }: { scope?: Scope } = {}) {
  return <div className={styles.scanlines} data-scope={scope} aria-hidden="true" />;
}

/**
 * The game shell: base surface plus the standard overlay stack.
 *
 * `intensity` scales the atmosphere for a surface. The editor and the results
 * screen run lighter than the title, because the title is the one place where
 * mood should win over legibility.
 */
export function GameShell({
  intensity = "default",
  grain = true,
  vignette = true,
  scanlines = false,
  children,
}: {
  intensity?: "default" | "light";
  grain?: boolean;
  vignette?: boolean;
  scanlines?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.shell} data-intensity={intensity}>
      {children}
      {vignette ? <Vignette scope="viewport" /> : null}
      {scanlines ? <Scanlines scope="viewport" /> : null}
      {grain ? <FilmGrain scope="viewport" /> : null}
    </div>
  );
}
