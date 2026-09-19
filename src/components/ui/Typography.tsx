import type { ReactNode } from "react";
import styles from "./Typography.module.css";

type Scale = "hero" | "display" | "title" | "section";

/**
 * Condensed display type — mission names, the wordmark, large numerals.
 *
 * The condensed width is the whole point of the face choice, so it is driven
 * from the token rather than left at the font's default width.
 */
export function Display({
  as: Tag = "h2",
  scale = "title",
  className,
  children,
}: {
  as?: "h1" | "h2" | "h3" | "p" | "span";
  scale?: Scale;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={[styles.base, styles[scale], className].filter(Boolean).join(" ")}>
      {children}
    </Tag>
  );
}

/**
 * Monospace micro-metadata: CAM 01, 01:42, FRAME 07, SCENE 01 / 03.
 *
 * Used sparingly by design — the brief warns against excessive uppercase, so
 * this is reserved for genuine machine-ish data, not for headings.
 */
export function Metadata({
  as: Tag = "span",
  tone = "muted",
  className,
  children,
}: {
  as?: "span" | "p" | "div" | "dt" | "dd";
  tone?: "muted" | "paper" | "accent";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={[styles.meta, styles[`meta-${tone}`], className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Tag>
  );
}

/**
 * Narrative UI text — dialogue, briefs, instructions. Sentence case, per the
 * brief. Display carries drama; this carries meaning.
 */
export function Prose({
  as: Tag = "p",
  size = "base",
  tone = "paper",
  className,
  children,
}: {
  as?: "p" | "span" | "div";
  size?: "base" | "lead" | "small";
  tone?: "paper" | "muted";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={[styles.prose, styles[`prose-${size}`], styles[`prose-${tone}`], className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Tag>
  );
}
