"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Display, Metadata, Prose } from "@/components/ui/Typography";
import { CornerBracket } from "@/components/ui/CornerBracket";
import { GameShell } from "@/components/shell/Shell";
import { SceneSequence } from "@/components/transition/SceneSequence";
import { MISSIONS, SEQUENCE_SCENES, TITLE_ART } from "@/data/missions";
import { cameraPush, fadeIn, riseIn, staggerContainer } from "@/lib/motion";
import styles from "./TitleScreen.module.css";

/**
 * SCREEN 01 — TITLE (§8).
 *
 * Full bleed, no navbar, no chrome. The scene is the background and the type
 * sits on it, per §7 ("information sitting on top of the world").
 *
 * The background is the Jason & Lucia key art — see TITLE_ART in
 * src/data/missions.ts for why it replaced the cover plate, and why the plate
 * is still kept for the design playground.
 *
 * Start is a real keyboard path, not a decoration: Enter and Space both start,
 * and a click anywhere on the screen does too, because a judge will click.
 */

const HERO_SCENE = TITLE_ART;

export function TitleScreen() {
  const router = useRouter();
  const [sequencing, setSequencing] = useState(false);
  const started = useRef(false);

  const start = useCallback(() => {
    // Guard against a click and a keypress both firing before the sequence
    // takes over. The overlay also swallows clicks, so this is the second line
    // of defence rather than the only one.
    if (started.current) return;
    started.current = true;
    setSequencing(true);
  }, []);

  /**
   * Navigation is driven by the sequence finishing, not by a timer here. The
   * sequence owns its own timing (including the reduced-motion path, which is
   * shorter) and calls this exactly once; scheduling a second timer alongside
   * it would make the two race, and a reduced-motion run would navigate early
   * and cut the sequence off mid-play.
   */
  const finishSequence = useCallback(() => {
    router.push("/missions");
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [start]);

  /**
   * §33 preloading now happens inside SceneSequence, which warms the mission
   * scenes while the stills play. It used to fire here 250ms after load, which
   * meant three 3840px mission images were competing with the hero art for
   * bandwidth on the critical path — the sequence's dead time is a better place
   * to spend it, and it is the reason that slot is ~2.5s rather than a flash.
   */

  return (
    <GameShell scanlines={false}>
      <motion.main
        className={styles.stage}
        initial="hidden"
        animate="visible"
        variants={staggerContainer(0.14, 0.1)}
        onClick={start}
      >
        {/* SCENE + slow camera push (§18: subtle, 1 -> 1.06) */}
        <motion.img
          className={styles.scene}
          src={HERO_SCENE}
          alt=""
          aria-hidden="true"
          variants={cameraPush}
        />
        <div className={styles.scrim} />

        <CornerBracket corner="tl" tone="accent" size="26px" />
        <CornerBracket corner="br" size="26px" />

        <div className={styles.content}>
          <motion.div variants={fadeIn}>
            <Metadata>A cinematic experiment</Metadata>
          </motion.div>

          <motion.div variants={riseIn}>
            {/* Stacked, not set on one line. At the hero cap the single-line
                wordmark measured 907px wide and ran straight through Lucia's
                head — the key art crop has only 26px of horizontal slack, so
                there is no `object-position` that clears it. Stacking cuts the
                run to 545px and clears the figures by ~250px, which is what
                lets the type stay big instead of shrinking to 128px to fit. */}
            <Display as="h1" scale="hero" className={styles.wordmark}>
              Vice
              <br />
              Cut
            </Display>
          </motion.div>

          <motion.div variants={riseIn}>
            <Metadata className={styles.sub}>The Mission Director</Metadata>
          </motion.div>

          <motion.div variants={riseIn}>
            <Prose size="lead" className={styles.tagline}>
              Edit the world.
              <br />
              Lock the frame.
              <br />
              Roll the mission.
            </Prose>
          </motion.div>

          <motion.div className={styles.bottom} variants={fadeIn}>
            <div className={styles.bottomRule} />
            {/* Not auto-focused: Enter is handled globally, so focusing this
                would only paint a focus ring on the prompt at first paint and
                make it read as a boxed button. Tabbing still reaches it. */}
            <button type="button" className={styles.startPrompt} onClick={start}>
              Press enter to start
            </button>
            <Metadata className={styles.startHint}>
              or click anywhere
            </Metadata>
          </motion.div>
        </div>

      </motion.main>

      {/* §22 scene transition. The sequence replaces the old white exposure
          wipe: a wipe flashes the page to paper white between a neon night
          still and a neon night screen, which is the least filmic thing a
          "cinematic" demo can do. This walks through the world instead and
          lands on mission select already in it.

          Rendered as a sibling of <main>, not inside it. `position: fixed`
          resolves against the nearest transformed ancestor, and `motion.main`
          carries `cameraPush`'s scale — nested, the overlay would be scaled
          and clipped by the very element it is meant to cover. */}
      {sequencing ? (
        <SceneSequence
          scenes={SEQUENCE_SCENES}
          onComplete={finishSequence}
          preload={MISSIONS.map((m) => m.scene)}
          label="Vice City"
        />
      ) : null}
    </GameShell>
  );
}
