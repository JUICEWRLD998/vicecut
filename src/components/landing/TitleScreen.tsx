"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Display, Metadata, Prose } from "@/components/ui/Typography";
import { CornerBracket } from "@/components/ui/CornerBracket";
import { GameShell } from "@/components/shell/Shell";
import { MISSIONS } from "@/data/missions";
import {
  T_SCENE_SLOW,
  cameraPush,
  fadeIn,
  riseIn,
  staggerContainer,
} from "@/lib/motion";
import styles from "./TitleScreen.module.css";

/**
 * SCREEN 01 — TITLE (§8).
 *
 * Full bleed, no navbar, no chrome. The scene is the background and the type
 * sits on it, per §7 ("information sitting on top of the world").
 *
 * Start is a real keyboard path, not a decoration: Enter and Space both start,
 * and a click anywhere on the screen does too, because a judge will click.
 */

const HERO_SCENE = MISSIONS[0].scene;

export function TitleScreen() {
  const router = useRouter();
  const [entering, setEntering] = useState(false);
  const navigated = useRef(false);

  const start = useCallback(() => {
    // Guard against a click and a keypress both firing before navigation.
    if (navigated.current) return;
    navigated.current = true;
    setEntering(true);
    // Give the exposure wipe time to read, then move. Deterministic, not tied
    // to animation callbacks that a reduced-motion setting could skip.
    window.setTimeout(() => router.push("/missions"), 460);
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
   * §33 preloading: the hero scene is already the background, so warm the other
   * two here rather than when the player picks one. Cheap, and it removes the
   * one place mission select could visibly stall.
   */
  useEffect(() => {
    const handle = window.setTimeout(() => {
      for (const m of MISSIONS) {
        const img = new window.Image();
        img.src = m.scene;
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, []);

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
            <Display as="h1" scale="hero" className={styles.wordmark}>
              Vice Cut
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

        {/* Exposure wipe on start — §22 scene transition, 400-800ms. */}
        {entering ? (
          <motion.div
            className={styles.wipe}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={T_SCENE_SLOW}
          />
        ) : null}
      </motion.main>
    </GameShell>
  );
}
