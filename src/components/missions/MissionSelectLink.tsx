import Link from "next/link";
import styles from "./MissionSelectLink.module.css";

/**
 * Back-out link to mission select.
 *
 * A real anchor, not a button — it navigates, so it must be middle-clickable,
 * openable in a new tab, and announced as a link. Styled to match the quiet
 * button variant so it sits in the same row without competing.
 */
export function MissionSelectLink() {
  return (
    <Link href="/missions" className={styles.link}>
      Operations
    </Link>
  );
}
