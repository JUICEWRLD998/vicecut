import styles from "./CornerBracket.module.css";

type Corner = "tl" | "tr" | "bl" | "br";

/**
 * Corner brackets — the brief's preferred framing device, and cheaper than
 * borders on every element. Rendered as two hairlines per corner so they stay
 * crisp at any size and pick up the accent on demand.
 *
 * Purely decorative, so it is aria-hidden and takes no pointer events.
 */
export function CornerBracket({
  corner = "tl",
  size = "var(--bracket)",
  tone = "line",
}: {
  corner?: Corner;
  size?: string;
  tone?: "line" | "accent" | "paper";
}) {
  return (
    <span
      aria-hidden="true"
      className={[styles.bracket, styles[corner], styles[tone]].join(" ")}
      style={{ "--bracket-size": size } as React.CSSProperties}
    />
  );
}

/** All four corners at once, anchored to a positioned ancestor. */
export function CornerBrackets({
  size = "var(--bracket)",
  tone = "line",
}: {
  size?: string;
  tone?: "line" | "accent" | "paper";
} = {}) {
  return (
    <span className={styles.frame} aria-hidden="true">
      <CornerBracket corner="tl" size={size} tone={tone} />
      <CornerBracket corner="tr" size={size} tone={tone} />
      <CornerBracket corner="bl" size={size} tone={tone} />
      <CornerBracket corner="br" size={size} tone={tone} />
    </span>
  );
}
