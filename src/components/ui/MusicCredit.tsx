import { musicCredit } from "@/lib/audio";
import styles from "./MusicCredit.module.css";

/**
 * THE MUSIC CREDIT.
 *
 * The bed is CC BY 4.0, which requires attribution "reasonable to the medium".
 * For a web app the deployed page is the medium, so a line in the README does
 * not discharge the obligation — the credit has to be on screen, where a visitor
 * can actually see it.
 *
 * Placed at the foot of the mission result, which is the one screen in the
 * product with nothing competing for attention. Putting it on the title screen,
 * where it would argue with the pitch, is the mistake this placement exists to
 * avoid.
 *
 * RENDERS NOTHING when there is nothing to credit. `musicCredit()` returns null
 * for a track with no artist or no licence, so swapping the bed for a CC0 file
 * removes this line automatically — rather than leaving a stale credit claiming
 * work that is no longer playing.
 *
 * A server component: it reads a module constant and renders static text, so
 * there is no reason for it to ship to the client.
 */
export function MusicCredit() {
  const credit = musicCredit();
  if (!credit) return null;

  return (
    <p className={styles.credit}>
      <span className={styles.label}>Music</span>{" "}
      <span className={styles.title}>{credit.title}</span> by{" "}
      <a
        className={styles.link}
        href={credit.artistUrl}
        target="_blank"
        rel="noreferrer noopener"
      >
        {credit.artist}
      </a>{" "}
      —{" "}
      <a
        className={styles.link}
        href={credit.licenseUrl}
        target="_blank"
        rel="noreferrer noopener"
      >
        {credit.license}
      </a>
    </p>
  );
}
