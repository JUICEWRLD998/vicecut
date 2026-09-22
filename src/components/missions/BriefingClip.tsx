"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { CornerBracket } from "@/components/ui/CornerBracket";
import { Display, Metadata, Prose } from "@/components/ui/Typography";
import type { Briefing } from "@/data/missions";
import { audio } from "@/lib/audio";
import { fadeIn, riseIn, staggerContainer } from "@/lib/motion";
import styles from "./BriefingClip.module.css";

/**
 * THE BRIEFING CLIP (§10-12, §18)
 *
 * Plays a short cut of stills before the editor opens, then FREEZES on the last
 * one — and that frozen frame is what the player marks.
 *
 * Why this exists. Mission 01's instruction is "mark the moment the plan goes
 * wrong", and until now the player had never seen the plan, or seen it go wrong.
 * The instruction was unearned: the editor is a good tool, but "decorate this
 * photograph" is a weaker product than "annotate the moment this specific thing
 * failed". Five seconds of footage is what buys that, and it costs nothing but a
 * timeline — the editor and the whole capture path are untouched.
 *
 * It is also the cinematic engine in miniature (§18), which is deliberate: this
 * is the same machinery Phase 6 needs for the mission outcome — stills, timed
 * beats, HUD, an objective — so building it here means Phase 6 has a working
 * reference rather than a blank file.
 *
 * Built from stills, not trailer footage. See the note on `Briefing` in
 * src/data/missions.ts for the measurements behind that call.
 *
 * The beats (§18's timing table, applied):
 *   0ms            first still, world
 *   holdMs         cut
 *   holdMs * 2     cut
 *   holdMs * 3     FREEZE — camera push stops, HUD becomes the objective
 *   holdMs * 3.6   the mark prompt appears
 */

type Phase = "playing" | "frozen";

export function BriefingClip({
  briefing,
  missionName,
  missionCode,
  instruction,
  targetLabel,
  onMark,
  onSkip,
}: {
  briefing: Briefing;
  missionName: string;
  missionCode: string;
  /**
   * The mission's own instruction, verbatim ("Mark the moment the plan goes
   * wrong", "Frame the escape", "Obscure the target").
   *
   * Passed in rather than written here, and that is a Phase 7 correctness fix
   * rather than tidiness. The freeze panel used to hardcode "Mark the frame
   * where it goes wrong", which is mission 01's wording — so Southbound told the
   * player to mark a moment its brief never mentioned, and No Signal asked them
   * to mark when they had been told to obscure. Two of three scenes were
   * answering the first mission's instruction.
   */
  instruction: string;
  /** What this mission calls its target region. See `targetLabel` in missions.ts. */
  targetLabel: string;
  /** The player is ready to mark the frozen frame — open the editor. */
  onMark: () => void;
  /** Skip straight to the editor. Escape hatch for a replayed demo. */
  onSkip: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const reduced = reduceMotion === true;
  /** The audio engine, or null on the server / when Web Audio is unavailable. */
  const sound = audio();

  const frames = briefing.frames;
  const sceneCount = frames.length;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [promptReady, setPromptReady] = useState(false);

  const finished = useRef(false);
  const timers = useRef<number[]>([]);

  /** The beat for the frame currently on screen: its slate label and radio. */
  const activeBeat = briefing.beats?.[index];

  /**
   * Audio (§34).
   *
   * The context can only be created inside a user gesture. The gesture that got
   * us here is the click on DIRECT SCENE, so unlocking on mount is sufficient in
   * practice; the engine is idempotent, so calling it again is free.
   *
   * The theme is ALREADY playing by this point — the title screen armed it on
   * mount and it started on the player's first click — so this does not start
   * music, it only makes sure the engine is unlocked and the mix is open enough
   * for a briefing. Starting a second track here is the bug this signature
   * deliberately cannot express.
   *
   * Everything below is fire-and-forget. If the browser has no Web Audio, or
   * blocks it, or the player has muted, `sound` is simply silent and no part of
   * the clip depends on it — §34 requires the app to stay fully functional with
   * audio off, and that is easier to guarantee by never reading audio state than
   * by checking it everywhere.
   */
  useEffect(() => {
    if (!sound) return;
    sound.unlock();
    sound.setTension(0.35);
  }, [sound]);

  /**
   * A splice on every cut, and a squelch when the beat carries a transmission.
   *
   * The squelch is offset just behind the cut so the two read as one event —
   * picture first, then the radio opening — instead of as a doubled click. The
   * first frame is skipped: there is no cut INTO the clip.
   */
  useEffect(() => {
    if (!sound || index === 0) return;
    sound.cue("cut");
    if (!activeBeat?.radio) return;
    const squelch = window.setTimeout(() => sound.cue("radioIn"), 90);
    return () => window.clearTimeout(squelch);
  }, [activeBeat, index, sound]);

  /** The shutter, at the freeze. This is the moment the frame is taken. */
  useEffect(() => {
    if (phase === "frozen") sound?.cue("lock");
  }, [phase, sound]);

  /**
   * Reduced motion: no cut sequence. It holds the first still briefly and goes
   * straight to the freeze — the player loses the build-up, which is the point
   * of respecting the preference, but still gets the frame to mark. The prompt is
   * available immediately, because on this path there is nothing to wait for.
   */
  useEffect(() => {
    if (reduced) {
      // One timer, not a synchronous setState: setState in an effect body causes
      // a cascading render, and this is the path that would hit it on every
      // mount. Reduced motion keeps the freeze — the frame still has to be
      // marked — it only drops the build-up.
      const skipAhead = window.setTimeout(() => {
        setIndex(sceneCount - 1);
        setPhase("frozen");
        setPromptReady(true);
      }, 400);
      timers.current.push(skipAhead);
      return () => window.clearTimeout(skipAhead);
    }

    if (sceneCount <= 1) {
      // A single-still briefing is already at its freeze frame. Zero delay for
      // the same reason as above.
      const immediate = window.setTimeout(() => {
        setPhase("frozen");
        setPromptReady(true);
      }, 0);
      timers.current.push(immediate);
      return () => window.clearTimeout(immediate);
    }

    for (let i = 1; i < sceneCount; i++) {
      timers.current.push(
        window.setTimeout(() => setIndex(i), i * briefing.holdMs),
      );
    }
    // Freeze, then offer the mark. Split into two beats rather than one, so the
    // objective has room to register before the button competes with it.
    timers.current.push(
      window.setTimeout(() => setPhase("frozen"), sceneCount * briefing.holdMs),
    );
    timers.current.push(
      window.setTimeout(
        () => setPromptReady(true),
        sceneCount * briefing.holdMs + 600,
      ),
    );

    const pending = timers.current;
    return () => pending.forEach(window.clearTimeout);
  }, [briefing.holdMs, reduced, sceneCount]);

  /**
   * Skip the clip. Escape or a click on the prompt area, but NOT on the whole
   * screen: a click anywhere would fire on the same gesture that starts the
   * mission, cutting the clip short the instant it begins.
   */
  const skip = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onSkip();
  }, [onSkip]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
      // Enter only once the freeze has landed, otherwise a held key from the
      // previous screen would blow through the clip.
      if ((e.key === "Enter" || e.key === " ") && phase === "frozen" && promptReady) {
        e.preventDefault();
        if (finished.current) return;
        finished.current = true;
        onMark();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onMark, phase, promptReady, skip]);

  const mark = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onMark();
  }, [onMark]);

  const pad = (n: number) => String(n).padStart(2, "0");
  const total = sceneCount;
  const frozen = phase === "frozen";

  return (
    <div className={styles.stage} data-frozen={frozen}>
      {/* Every still mounts at once so a cut never lands on a decoding frame.
          Keyed by INDEX, not by src: mission 03's clip deliberately bookends on
          the same image, and keying on the path would collapse those two frames
          into one — the clip would silently lose a beat. */}
      <div className={styles.frames}>
        {frames.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${i}-${src}`}
            className={styles.frame}
            src={src}
            alt=""
            aria-hidden="true"
            data-active={i === index}
          />
        ))}
      </div>
      <div className={styles.scrim} />

      {/* Film grain over the clip only. Paired with the shell's grain this would
          double up, so the shell runs without it on this screen. */}
      <div className={styles.grain} aria-hidden="true" />

      <CornerBracket corner="tl" tone="accent" size="26px" />
      <CornerBracket corner="br" size="26px" />

      {/* --- camera HUD (§19) ------------------------------------------------
          The in-world chrome that says "this is footage". It retires at the
          freeze: the moment is no longer being recorded, it is being examined. */}
      <motion.div className={styles.camera} variants={fadeIn} initial="hidden" animate="visible">
        <span className={styles.rec} aria-hidden="true" />
        <Metadata tone="paper">REC</Metadata>
        <Metadata>
          SCENE {missionCode} / 03 · FRAME {pad(Math.min(index + 1, total))} / {pad(total)}
        </Metadata>
      </motion.div>

      <div className={styles.body}>
        {/* --- playback: the world, then the cut ------------------------
            Each frame carries a slate label, and the beats that have a
            transmission show it as radio dialogue (§19). The dialogue changes
            WITH its picture, not over the clip as a whole, so the last line
            lands on the freeze — the player hears it go wrong at the same instant
            they see it. */}
        {!frozen ? (
          <>
            <motion.div
              key={`slate-${index}`}
              className={styles.slate}
              variants={fadeIn}
              initial="hidden"
              animate="visible"
            >
              <Metadata className={styles.slateLabel} tone="paper">
                {activeBeat?.label ?? missionName}
              </Metadata>
            </motion.div>

            {activeBeat?.radio ? (
              // Keyed on the frame so React re-runs the entrance on each cut
              // rather than swapping the text in place, which reads as a caption
              // changing rather than as someone speaking.
              <motion.div
                key={`radio-${index}`}
                className={styles.radio}
                variants={riseIn}
                initial="hidden"
                animate="visible"
              >
                <Metadata className={styles.radioLabel}>[ Radio ]</Metadata>
                <Prose size="lead" tone="paper">
                  <span className={styles.radioWho}>{activeBeat.radio.who}:</span>{" "}
                  &ldquo;{activeBeat.radio.line}&rdquo;
                </Prose>
              </motion.div>
            ) : null}
          </>
        ) : null}

        {/* --- freeze: the objective and the mark prompt ---------------- */}
        {frozen ? (
          <motion.div
            className={styles.freeze}
            variants={staggerContainer(0.08)}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeIn}>
              <Metadata tone="accent">Frame held</Metadata>
            </motion.div>

            <motion.div variants={riseIn}>
              <Display as="p" scale="section" className={styles.beat}>
                {briefing.beat}
              </Display>
            </motion.div>

            <motion.div variants={riseIn} className={styles.objective}>
              <Metadata className={styles.objectiveLabel}>Your task</Metadata>
              <Prose size="lead" tone="paper">
                {instruction}
              </Prose>
              {/* The answer key, given BEFORE the editor rather than graded
                  against afterwards. The target region is a hidden rect in the
                  mission data and the result measures the mark against it, so a
                  player who was never told where it is could only fail it by
                  accident. This is the same words the editor footer repeats, said
                  once here so the instruction is complete the moment it is given. */}
              <Metadata className={styles.moment}>
                {`${targetLabel}: ${briefing.momentHint}`}
              </Metadata>
            </motion.div>

            {promptReady ? (
              <motion.div
                className={styles.prompt}
                variants={fadeIn}
                initial="hidden"
                animate="visible"
              >
                <Button variant="solid" hint="Open editor" onClick={mark}>
                  Mark the frame
                </Button>
                <Metadata className={styles.promptHint}>
                  The frozen frame opens in the editor
                </Metadata>
              </motion.div>
            ) : null}
          </motion.div>
        ) : null}
      </div>

      {/* The progress rule runs only while the clip plays; at the freeze it is
          replaced by the prompt, so the screen has one focus at a time. */}
      {!frozen ? (
        <div className={styles.ruleWrap} aria-hidden="true">
          <div className={styles.rule}>
            <motion.span
              className={styles.ruleFill}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: (sceneCount * briefing.holdMs) / 1000, ease: "linear" }}
            />
          </div>
          <Metadata className={styles.ruleCaption}>
            {missionName}
          </Metadata>
        </div>
      ) : null}

      {/* Read out the clip for assistive tech as one sentence, not as chrome.
          The radio line is included because the beats change on a timer: without
          it, the transmission is only in the DOM, never announced. */}
      <p className={styles.srOnly} role="status" aria-live="polite">
        {frozen
          ? `Frame held. ${briefing.beat} ${instruction}`
          : `Briefing clip, frame ${Math.min(index + 1, total)} of ${total}${
              activeBeat?.label ? `: ${activeBeat.label}` : ""
            }.${activeBeat?.radio ? ` Radio. ${activeBeat.radio.who}: ${activeBeat.radio.line}` : ""}`}
      </p>
    </div>
  );
}
