import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "solid" | "ghost" | "quiet";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  /** Optional mono hint on the trailing edge, e.g. "ENTER". */
  hint?: string;
  children: ReactNode;
};

/**
 * The only button in the product.
 *
 * Deliberately square-cornered with a hairline border: the brief asks for thin
 * rules and small metadata rather than rounded cards. `solid` is coral-filled
 * with base-coloured text (6.56:1); paper on coral is 2.47:1 and is never a
 * valid combination, so the fill variant owns the dark label.
 */
export function Button({
  variant = "ghost",
  hint,
  children,
  className,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={[styles.btn, styles[variant], className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      <span className={styles.label}>{children}</span>
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </button>
  );
}
