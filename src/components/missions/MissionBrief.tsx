"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { CornerBracket } from "@/components/ui/CornerBracket";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RuleLine } from "@/components/ui/RuleLine";
import { Display, Metadata, Prose } from "@/components/ui/Typography";
import { MissionSelectLink } from "./MissionSelectLink";
import { MISSION_COUNT, type Mission } from "@/data/missions";
import { fadeIn, riseIn, staggerContainer } from "@/lib/motion";
import styles from "./MissionBrief.module.css";

/**
 * SCREEN 03 — MISSION BRIEF (§10-12).
 *
 * The scene is the background but held back, because this screen's job is to
 * set the task. The instruction is the loudest line on the page: everything
 * else is context for it.
 *
 * §15 transition begins here — the action dims the scene before the editor
 * enters, rather than cutting to it.
 */

export function MissionBrief({
  mission,
  directLabel,
  onDirect,
  directing,
}: {
  mission: Mission;
  /** Changes while the exit transition runs, e.g. "Preparing". */
  directLabel: string;
  onDirect: () => void;
  /** True once the editor is entering; dims the scene per §15. */
  directing: boolean;
}) {
  return (
    <motion.main
      className={styles.stage}
      initial="hidden"
      animate="visible"
      variants={staggerContainer(0.1, 0.05)}
      data-directing={directing}
    >
      {/* Deliberately NOT using mission.sceneFocus here. That focus exists for
          the mission tile, which is near-portrait and keeps only about a third
          of the frame's width. The brief is near the source's own 16:9, so
          `cover` discards roughly a tenth and centre is the honest crop —
          applying the tile's focus would drag the subject under the type
          column, which sits on the left. */}
      <motion.img
        className={styles.scene}
        src={mission.scene}
        alt=""
        aria-hidden="true"
        variants={{ hidden: { scale: 1.04 }, visible: { scale: 1 } }}
      />
      <div className={styles.scrim} />
      {/* §15: the scene darkens as the editor enters. */}
      <div className={styles.dim} />

      <CornerBracket corner="tl" tone="accent" size="26px" />
      <CornerBracket corner="br" size="26px" />

      <div className={styles.inner}>
        <motion.header className={styles.top} variants={fadeIn}>
          <Metadata>
            Scene {mission.code} / {String(MISSION_COUNT).padStart(2, "0")}
          </Metadata>
          <ProgressBar total={MISSION_COUNT} current={mission.index} />
        </motion.header>

        <div className={styles.body}>
          <motion.div variants={riseIn}>
            <Display as="h1" scale="display" className={styles.name}>
              {mission.name}
            </Display>
          </motion.div>

          <motion.div variants={riseIn}>
            <Metadata className={styles.metaLine}>
              {mission.time} — {mission.location}
            </Metadata>
          </motion.div>

          <motion.div variants={riseIn} className={styles.ruleWrap}>
            <RuleLine />
          </motion.div>

          <motion.div variants={riseIn}>
            <Prose size="lead" className={styles.synopsis}>
              {mission.synopsis}
            </Prose>
          </motion.div>

          <motion.div variants={riseIn} className={styles.instructionBlock}>
            <Metadata className={styles.instructionLabel}>Direct the scene</Metadata>
            <Prose size="lead" tone="muted">
              {mission.instruction}
            </Prose>
          </motion.div>
        </div>

        <motion.footer className={styles.foot} variants={fadeIn}>
          <div className={styles.footLeft}>
            <Metadata>{mission.mood}</Metadata>
            <Metadata>Original scene preserved</Metadata>
          </div>
          <div className={styles.footRight}>
            <MissionSelectLink />
            <Button variant="solid" hint="Open editor" onClick={onDirect}>
              {directLabel}
            </Button>
          </div>
        </motion.footer>
      </div>
    </motion.main>
  );
}
