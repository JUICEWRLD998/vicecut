"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { audio } from "@/lib/audio";
import styles from "./AudioToggle.module.css";

/**
 * The audio toggle (§24, §34).
 *
 * §34 requires the app to stay functional with audio off, so the control has to
 * be reachable and honest. Two deliberate choices:
 *
 *  - It renders nothing during SSR and on the first client paint, because the
 *    stored preference lives in localStorage and reading it during render would
 *    desynchronise the server and client markup. The subscription below picks it
 *    up immediately after hydration.
 *  - It only appears once audio is possible. A mute button on a browser that has
 *    no Web Audio, or before the first gesture unlocks the context, is a control
 *    that does nothing — worse than no control.
 */
export function AudioToggle({ className }: { className?: string }) {
  const engine = audio();
  const [hydrated, setHydrated] = useState(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const reveal = window.setTimeout(() => setHydrated(true), 0);
    if (!engine) return () => window.clearTimeout(reveal);
    // The context is created by the first gesture, so poll briefly for it rather
    // than showing a control the browser has not allowed to work yet.
    const check = window.setInterval(() => setLive(engine.unlock()), 400);
    return () => {
      window.clearTimeout(reveal);
      window.clearInterval(check);
    };
  }, [engine]);

  const muted = useSyncExternalStore(
    engine ? engine.subscribe : () => () => {},
    engine ? () => engine.isMuted() : () => false,
    () => false,
  );

  if (!hydrated || !live || !engine) return null;

  return (
    <button
      type="button"
      className={[styles.toggle, className].filter(Boolean).join(" ")}
      onClick={() => engine.toggleMuted()}
      aria-pressed={muted}
      title={muted ? "Unmute mission audio" : "Mute mission audio"}
    >
      <span className={styles.bars} data-muted={muted} aria-hidden="true">
        <span className={styles.bar} />
        <span className={styles.bar} />
        <span className={styles.bar} />
      </span>
      <span className={styles.label}>{muted ? "Audio off" : "Audio on"}</span>
    </button>
  );
}
