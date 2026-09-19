import styles from "./ProgressBar.module.css";

/**
 * Segmented progress — SCENE 01 / 03.
 *
 * Segmented rather than continuous because the product is discrete missions,
 * and a filled segment reads as a mission state rather than a loading bar.
 * Renders as an ordered list so the count is available to assistive tech.
 */
export function ProgressBar({
  total,
  current,
  label,
}: {
  total: number;
  /** 1-indexed, as displayed to the player. */
  current: number;
  label?: string;
}) {
  return (
    <div className={styles.wrap}>
      <ol className={styles.track} aria-label={label ?? `Step ${current} of ${total}`}>
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1;
          const state = n < current ? "done" : n === current ? "active" : "todo";
          return <li key={n} className={styles.seg} data-state={state} />;
        })}
      </ol>
    </div>
  );
}
