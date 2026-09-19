import styles from "./RuleLine.module.css";

/**
 * Hairline rule, optionally labelled on the trailing edge.
 *
 * The brief prefers thin rules to boxes around things, so this is the main
 * structural divider in the product.
 */
export function RuleLine({
  label,
  align = "right",
  tone = "line",
}: {
  label?: string;
  align?: "left" | "right";
  tone?: "line" | "accent";
}) {
  return (
    <div className={[styles.rule, styles[tone]].join(" ")}>
      {label && align === "left" ? (
        <span className={styles.label}>{label}</span>
      ) : null}
      <span className={styles.line} />
      {label && align === "right" ? (
        <span className={styles.label}>{label}</span>
      ) : null}
    </div>
  );
}
