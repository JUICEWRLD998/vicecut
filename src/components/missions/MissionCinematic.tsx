"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { CornerBracket } from "@/components/ui/CornerBracket";
import { Display, Metadata, Prose } from "@/components/ui/Typography";
import { CutComparison } from "@/components/missions/CutComparison";
import { MeasuredReadout, ScorePanel, SlateStrip } from "@/components/missions/MissionOutcome";
import { MusicCredit } from "@/components/ui/MusicCredit";
import { Stamp } from "@/components/ui/Stamp";
import { audio } from "@/lib/audio";
import {
  analyseFrame,
  classifyEdit,
  directorScore,
  takeNumber,
  type FrameReport,
} from "@/lib/frame";
import { exposureFlash, fadeIn, riseIn, staggerContainer } from "@/lib/motion";
import { editableFrame, type Mission } from "@/data/missions";
import styles from "./MissionCinematic.module.css";

/**
 * THE MISSION CINEMATIC (§17, §18, §19, §20, §21) — Phase 6.
 *
 * The sequence that runs after LOCK FRAME and carries the mission to its
 * outcome. It is the same machinery as the briefing clip in reverse: that one
 * used stills and timed beats to set an instruction up, this one uses them to
 * pay it off.
 *
 * The §18 beat sheet, applied literally:
 *
 *   0ms      the edited frame takes the screen   (§17 step 5)
 *   120ms    exposure flash — the shutter        (§17 step 4)
 *   500ms    HUD fades in                        (§19 CAM / REC / time / place)
 *   1000ms   slow camera push begins             (§18, subtle — not a Ken Burns)
 *   2500ms   radio dialogue                      (§19 [RADIO] JASON: "...")
 *   4000ms   objective appears                   (§19 OBJECTIVE / REACH THE MARINA)
 *   6000ms   second visual beat                  (§21 original vs director's cut)
 *   8000ms   mission result                      (§20 scores, rep, actions)
 *
 * The second beat is where §21 lives. §21 asks for a split or slider and says
 * the whole point is that a judge immediately understands the player changed the
 * scene. So the sweep is the beat — the original is wiped in beside the cut by
 * the sequence itself, without waiting for anyone to drag anything — and the
 * divider is then left draggable, and keyboard-operable, so a judge can scrub it.
 * An auto-reveal that hands over control covers both: the demo stays hands-off
 * when it needs to be, and interactive when someone wants to poke at it.
 *
 * Everything measured stays measured. The readout is computed from the locked
 * frame's real pixels by src/lib/frame.ts, and the Director Score is a pure
 * function of those measurements — deterministic (§20), and honest about being a
 * game metric rather than an AI judgement, which §20 demands explicitly.
 */

/** §18 beat sheet, in ms. One source of truth for the whole sequence. */
const BEAT = {
  flash: 120,
  hud: 500,
  push: 1000,
  radio: 2500,
  objective: 4000,
  compare: 6000,
  result: 8000,
} as const;

/** Where the comparison divider starts, and where the sweep leaves it. */
const DIVIDER_START = 100;
const DIVIDER_REST = 52;

type Phase = "frame" | "hud" | "radio" | "objective" | "compare" | "result";

/** Beat order, so the phase can be advanced by index rather than by timers. */
const ORDER: Phase[] = ["frame", "hud", "radio", "objective", "compare", "result"];

/**
 * The slate's headline, from the measured classification.
 *
 * `verdict` is the mission's own word — Marked for the scene that says "mark the
 * moment", Redacted for the one that says "obscure the target" — so the report
 * answers the player in the vocabulary their brief used. The other three labels
 * are the same everywhere because they describe the edit itself, not the scene.
 */
function editLabel(report: FrameReport, verdict: string): string {
  switch (classifyEdit(report)) {
    case "reframed":
      return "Reframed";
    case "graded":
      return "Graded";
    case "annotated":
      return verdict;
    case "untouched":
      return "Unmarked";
  }
}

export function MissionCinematic({
  mission,
  frame,
  onRollAgain,
  onNextMission,
  nextMissionName,
}: {
  mission: Mission;
  /** The locked frame, already captured. */
  frame: {
    dataUrl: string;
    source: "onSave" | "getImage()";
    degraded: boolean;
    edited: boolean;
  };
  onRollAgain: () => void;
  /** Absent on the final mission, which offers only ROLL AGAIN. */
  onNextMission?: () => void;
  nextMissionName?: string;
}) {
  const reduceMotion = useReducedMotion();
  const reduced = reduceMotion === true;
  /** The audio engine, or null on the server / with no Web Audio (§34). */
  const sound = audio();

  const [phase, setPhase] = useState<Phase>("frame");
  const [report, setReport] = useState<FrameReport | null>(null);
  const [measured, setMeasured] = useState(false);
  const [divider, setDivider] = useState(DIVIDER_START);
  const [dragging, setDragging] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  /**
   * Has the sequence reached this beat yet?
   *
   * Memoised on `phase` so it is a stable reference within a beat. Inline, it was
   * a fresh function every render, which made every useCallback that closed over
   * it (the divider drag) invalidate on every render.
   */
  const reached = useCallback(
    (p: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(p),
    [phase],
  );

  /**
   * Measure the locked frame against the original it came from.
   *
   * Baseline is `editableFrame`, NOT `mission.scene` — the editor opened on the
   * briefing's freeze frame, and for mission 01 that is a different picture
   * (burning car vs night-city aerial). Measuring against the wrong one would
   * report almost the whole frame as changed on a frame nobody touched.
   *
   * Runs on mount so it resolves well before the result beat at 8s; the readout
   * is gated on `measured` anyway, so a slow decode delays the numbers rather
   * than showing placeholders.
   */
  useEffect(() => {
    let cancelled = false;

    analyseFrame(
      editableFrame(mission),
      frame.dataUrl,
      frame.degraded,
      frame.edited,
      mission.briefing?.target,
    ).then((r) => {
      if (cancelled) return;
      setReport(r);
      setMeasured(true);
    });

    return () => {
      cancelled = true;
    };
  }, [frame.dataUrl, frame.degraded, frame.edited, mission]);

  /**
   * Advance the beat sheet.
   *
   * A zero-delay chain rather than a direct setState: setState in an effect body
   * causes a cascading render, and reduced motion is the path that would hit it
   * on every mount. Reduced motion lands on `result` immediately, because the
   * comparison and the scores are CONTENT — the player still needs them. What is
   * dropped is the build-up, which is what the preference is about.
   */
  useEffect(() => {
    if (reduced) {
      const settle = window.setTimeout(() => {
        setPhase("result");
        setDivider(DIVIDER_REST);
      }, 0);
      return () => window.clearTimeout(settle);
    }

    const timers = (
      [
        ["hud", BEAT.hud],
        ["radio", BEAT.radio],
        ["objective", BEAT.objective],
        ["compare", BEAT.compare],
        ["result", BEAT.result],
      ] as const
    ).map(([p, at]) => window.setTimeout(() => setPhase(p), at));

    return () => timers.forEach(window.clearTimeout);
  }, [reduced]);

  /**
   * Sweep the comparison divider once the comparison beat arrives.
   *
   * Deliberately a separate effect from the beat chain: the sweep is a visual
   * transition with its own duration, and folding it into the phase timer would
   * tie the two together so a change to one silently retimed the other.
   */
  useEffect(() => {
    if (reduced || phase !== "compare") return;
    const start = window.setTimeout(() => setDivider(DIVIDER_REST), 120);
    return () => window.clearTimeout(start);
  }, [phase, reduced]);

  /**
   * Divider scrubbing (§21).
   *
   * Pointer AND keyboard, because a judge on a laptop should be able to nudge it
   * without a mouse, and a drag target that is not focusable is invisible to
   * assistive tech. Bound to the stage rather than the handle: the handle is a
   * 2px line, and making someone hit a 2px line to see their own edit is a
   * worse interaction than letting them scrub anywhere over the picture.
   */
  const setFromClientX = useCallback((clientX: number) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    setDivider(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Gated on the result too: the scrub layer unmounts at that beat, but the
      // stage-level handlers below would otherwise still answer a pointer that
      // reached them, moving a divider nobody can see.
      if (!reached("compare") || reached("result")) return;
      setDragging(true);
      setFromClientX(e.clientX);
    },
    [reached, setFromClientX],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      setFromClientX(e.clientX);
    },
    [dragging, setFromClientX],
  );

  const endDrag = useCallback(() => setDragging(false), []);

  const onDividerKey = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setDivider((d) => Math.max(0, d - step));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setDivider((d) => Math.min(100, d + step));
    } else if (e.key === "Home") {
      e.preventDefault();
      setDivider(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setDivider(100);
    }
  }, []);

  /**
   * The theme, and the cues that mark each beat (§34).
   *
   * One effect keyed on `phase` rather than a cue per beat timer: the phase IS
   * the beat, so a cue can never fire out of step with the thing it marks. The
   * music is not restarted here — it has been running since the title screen —
   * this only asks for it in case a deep link skipped that screen.
   */
  useEffect(() => {
    if (!sound) return;
    sound.unlock();
    sound.startMusic();
    // The mix opens with the sequence: the result is the loudest point the
    // soundtrack reaches, and it gets there by widening the filter rather than
    // by adding a second track.
    sound.setTension(0.75);
  }, [sound]);

  useEffect(() => {
    if (!sound) return;
    // A squelch when the radio beat lands, so the transmission is heard as a
    // transmission rather than only read as a line of text.
    if (phase === "radio") sound.cue("radioIn");
    // The completion sound, on the result (§34's "mission completion"), and the
    // mix opening the rest of the way under it.
    if (phase === "result") {
      sound.cue("confirm");
      sound.setTension(1);
    }
  }, [phase, sound]);

  const take = takeNumber(report);
  const score = report ? directorScore(report) : null;
  return (
    <div
      ref={stageRef}
      className={styles.stage}
      data-phase={phase}
      data-dragging={dragging}
      data-reduced={reduced}
    >
      {/* The edit, pushed slowly across the whole run (§18) — a continuous camera
          move, not a one-shot settle, because §18 asks for a push and a still
          that eases once and then stops does not read as a camera. Subtle by
          design: a big push on a still reads as a slideshow, which is the one
          thing a "cinematic" treatment must not look like. Paused under reduced
          motion, and never animated while the comparison is open, so the split
          stays legible. */}
      <div className={styles.frames}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.frame} src={frame.dataUrl} alt={`Locked frame for ${mission.name}`} />
        {/* §21 — the original, wiped in beside the cut.
            RETIRES AT THE RESULT. It used to stay mounted underneath the result
            panel, which has no background of its own, so at the result beat the
            divider drew a hard accent line straight down the middle of the page
            and split the locked frame — and the labels that explain it were
            already hidden. On an untouched frame the two halves are identical,
            so it read as a rendering fault rather than as a comparison. The
            comparison is a beat, not a background: it plays, and then the result
            REPLACES it, carrying its own framed comparison in the document. */}
        {reached("compare") && !reached("result") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.original}
            src={editableFrame(mission)}
            alt={`Original frame for ${mission.name}`}
            style={{ clipPath: `inset(0 ${100 - divider}% 0 0)` }}
          />
        ) : null}
      </div>

      <div className={styles.scrim} />

      {/* §17 step 4: the exposure flash. Once, never looped. */}
      {reached("hud") ? null : (
        <motion.div
          className={styles.flash}
          variants={exposureFlash}
          initial="hidden"
          animate="visible"
          aria-hidden="true"
        />
      )}

      <CornerBracket corner="tl" tone="accent" size="26px" />
      <CornerBracket corner="br" size="26px" />

      {/* --- §19 HUD -------------------------------------------------------
          In-world chrome: which camera, that it is recording, the time and the
          place. All of it comes from mission data so the three missions read as
          three different operations rather than one reskinned screen.

          It retires at the result beat. The HUD is camera chrome — it belongs to
          the footage — and the result is no longer footage, it is the paperwork.
          Leaving it up also collided with the panel's own header: both sit on the
          top edge, and the screen rendered "REC CAM 01 01:42 AM" straight through
          "DIRECTOR'S CUT · SCENE 01 / 03". */}
      {reached("hud") && !reached("result") ? (
        <motion.div
          className={styles.hud}
          variants={fadeIn}
          initial="hidden"
          animate="visible"
        >
          <span className={styles.rec} aria-hidden="true" />
          <Metadata tone="paper">REC</Metadata>
          <Metadata>CAM {mission.code}</Metadata>
          <Metadata>{mission.time}</Metadata>
          <Metadata className={styles.hudPlace}>{mission.location}</Metadata>
        </motion.div>
      ) : null}

      {/* Nothing about the frame's provenance is hidden: a canvas capture is not
          a saved export, and the screen says so rather than presenting it as one. */}
      {frame.degraded ? (
        <motion.div
          className={styles.notice}
          variants={fadeIn}
          initial="hidden"
          animate="visible"
        >
          <Metadata tone="accent">Canvas capture — no editor save was recorded</Metadata>
        </motion.div>
      ) : null}

      {/* --- radio + objective (§19) -------------------------------------- */}
      {reached("radio") && !reached("result") ? (
        <motion.div
          className={styles.beats}
          variants={staggerContainer(0.1)}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={riseIn} className={styles.radio}>
            <Metadata className={styles.radioLabel}>[ Radio ]</Metadata>
            <Prose size="lead" tone="paper">
              <span className={styles.radioWho}>{mission.radio.who}:</span>{" "}
              &ldquo;{mission.radio.line}&rdquo;
            </Prose>
          </motion.div>

          {reached("objective") ? (
            <motion.div variants={riseIn} className={styles.objective}>
              <Metadata className={styles.objectiveLabel}>Objective</Metadata>
              <Prose size="lead" tone="paper">
                {mission.objective}
              </Prose>
            </motion.div>
          ) : null}
        </motion.div>
      ) : null}

      {/* --- §21 labels, shown only while the comparison owns the screen ---- */}
      {reached("compare") && !reached("result") ? (
        <motion.div
          className={styles.compareLabels}
          variants={fadeIn}
          initial="hidden"
          animate="visible"
        >
          <Metadata tone="paper">Original</Metadata>
          <Metadata tone="accent">Director&rsquo;s cut</Metadata>
        </motion.div>
      ) : null}

      {/* --- the scrub layer (§21) ------------------------------------------
          A dedicated layer for dragging, rather than handlers on the stage. The
          result panel is scrollable, and a stage-level pointer handler would
          start a divider drag on every touch-scroll of the scores — the two
          gestures are the same gesture as far as the browser is concerned. This
          layer sits above the picture and below the result, so the comparison is
          draggable anywhere over it while the panel keeps its own scroll. */}
      {reached("compare") && !reached("result") ? (
        <div
          className={styles.scrub}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          aria-hidden="true"
        />
      ) : null}

      {/* The divider. Keyboard-focusable so it is reachable by Tab and operable
          with arrows, per the same rule the rest of the product follows: a
          control a judge cannot reach is not a control. pointer-events are off,
          so a drag passes through to the scrub layer beneath it.

          Retires with the comparison. Its own drag and key handlers are also
          gated on the result, so this is the visual half of that rule rather
          than the only half — a divider left mounted here would sit over the
          result document with nothing left to scrub. */}
      {reached("compare") && !reached("result") ? (
        <div
          className={styles.divider}
          style={{ left: `${divider}%` }}
          role="slider"
          tabIndex={0}
          aria-label="Compare original and director's cut"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(divider)}
          aria-valuetext={`${Math.round(divider)}% original`}
          onKeyDown={onDividerKey}
        >
          <span className={styles.dividerGrip} aria-hidden="true" />
        </div>
      ) : null}

      {/* --- §20 the result ------------------------------------------------- */}
      {reached("result") ? (
        <motion.div
          className={styles.result}
          variants={staggerContainer(0.08)}
          initial="hidden"
          animate="visible"
        >
          {/* The masthead spans the full document width and sits directly in the
              grid, above the plate. It used to be nested inside the left column,
              which only works while nothing else needs the width — the comparison
              does, so the masthead became its own row rather than the plate being
              demoted to fit beneath it. */}
          <div className={styles.masthead}>
          <motion.div className={styles.resultHead} variants={fadeIn}>
            <Metadata tone="accent">Director&rsquo;s cut</Metadata>
            <Metadata>
              Scene {mission.code} / 03 · Take {take}
            </Metadata>
          </motion.div>

          <motion.div variants={riseIn}>
            <Display as="h1" scale="display" className={styles.name}>
              {mission.name}
            </Display>
          </motion.div>

          {/* §17's three stamps, which §20 lists as the result. */}
          <motion.div className={styles.stamps} variants={fadeIn}>
            <Metadata tone="paper">Frame locked</Metadata>
            <Metadata tone="paper">Scene directed</Metadata>
            <Metadata tone="paper">Mission rolled</Metadata>
          </motion.div>
          </div>

          {/* --- the slate (§11/§20) -------------------------------------------
              The shot record, and the thing that makes the three missions read as
              three different operations rather than one screen reskinned. Phase 7
              asks for a distinct CINEMATIC treatment per scene, and this is where
              that lands: the data was already authored per mission (`slate.framing`,
              `slate.genre`, `slate.process`) and nothing rendered the first three
              fields, so every result answered with identical words.

              After the masthead in the DOM as well as below it on the grid. The
              two have to agree: a block placed visually beneath the title but
              earlier in the markup is read out of order by a screen reader, and
              the document would describe the shot before naming the scene.
              Wrapped so it can be placed on this grid — the component's own styles
              come from its own module and cannot carry these class names. */}
          <div className={styles.slateRow}>
            <SlateStrip mission={mission} />
          </div>

          {/* --- the verdict -------------------------------------------------
              Its own row, directly above the plate it describes, and the loudest
              thing on the screen. The headline is the KIND of edit rather than
              the coverage percentage, because coverage as a headline misreports
              the annotation missions: an X drawn across a frame alters ~0.4% of
              its area, so leading with "0.4%" tells a player who just did
              something dramatic that nothing happened.

              Struck rather than set as type — see Stamp. The word comes from the
              mission's own brief, so the verdict answers in the vocabulary the
              player was given: MARKED for the scene that says "mark the moment",
              REDACTED for the one that says "obscure the target".

              The unmarked case gets the muted tone and zero rotation. A frame
              with no direction in it is a miss, not an error, and a red stamp
              would make a legitimate play read as a failure of the demo. */}
          {measured && report ? (
            <motion.div variants={riseIn} className={styles.verdict}>
              <Stamp
                tone={report.edited ? "accent" : "muted"}
                rotate={report.edited ? -4 : 0}
                delayMs={220}
              >
                {editLabel(report, mission.slate.verdict)}
              </Stamp>
            </motion.div>
          ) : null}

          {/* --- §21 the comparison ------------------------------------------
              Full document width, and that is a functional choice rather than a
              compositional one.

              It was inside the left column, where it rendered about 480px wide —
              roughly a quarter of the frame the player had just been working on
              at 4K. The thing this whole product is built around is the player
              seeing their edit take effect, so the evidence for that has to be
              the largest object on the screen, not a thumbnail beside the scores.

              It also carries the answer key: the moment is boxed on the original
              side, so "on target" stops being a verdict measured against a region
              the player was never shown. */}
          {measured && report ? (
            <motion.div variants={riseIn} className={styles.plate}>
              <CutComparison
                originalSrc={editableFrame(mission)}
                cutSrc={frame.dataUrl}
                target={mission.briefing?.target}
                targetLabel={mission.briefing?.targetLabel}
                onTarget={report.onTarget}
                onTargetShare={report.onTargetShare}
                edited={report.edited}
                missionName={mission.name}
              />
            </motion.div>
          ) : null}

          {/* --- §20 the outcome ----------------------------------------------
              The measured facts and the Director Score, in their own panels.
              Both live in MissionOutcome — see the note at the top of that file
              for why the measurements and the scores are two blocks rather than
              one: the first is a fact about the frame, the second is the game's
              reading of it, and §20 forbids blurring the two. */}
          <div className={styles.main}>
            {measured && report ? <MeasuredReadout report={report} /> : null}

            {measured && report && score ? (
              <ScorePanel score={score} report={report} />
            ) : measured ? (
              /* No score, and it says why. `directorScore` returns null when the
                 frame was locked without any direction, and printing three
                 confident-looking numbers derived from nothing would be exactly
                 the invented score §20 forbids. The plate above already carries
                 the substantive message ("submitted the frame unmarked"); this
                 states the consequence for the readout, so the missing panel
                 reads as a decision rather than as a rendering failure. */
              <motion.section className={styles.scoreEmpty} variants={riseIn}>
                <Metadata tone="accent">Director score</Metadata>
                <Metadata className={styles.scoreNote}>
                  Not scored — the frame was locked as shot. Direct it and lock
                  again to be graded.
                </Metadata>
              </motion.section>
            ) : null}
          </div>

          <motion.footer className={styles.foot} variants={fadeIn}>
            <div className={styles.actions}>
              <Button variant="ghost" onClick={onRollAgain}>
                Roll again
              </Button>
              {onNextMission ? (
                <Button variant="solid" hint={nextMissionName} onClick={onNextMission}>
                  Next operation
                </Button>
              ) : null}
            </div>
            {/* The CC BY 4.0 obligation for the soundtrack, discharged on screen
                rather than in the README — see MusicCredit. It renders nothing
                when the bed needs no credit, so this line is not a permanent
                fixture of the layout. */}
            <MusicCredit />
          </motion.footer>
        </motion.div>
      ) : null}

      {/* Read the sequence out for assistive tech as whole sentences, rather than
          letting a screen reader walk the chrome label by label. */}
      <p className={styles.srOnly} role="status" aria-live="polite">
        {reached("result")
          ? `Mission result. ${report ? editLabel(report, mission.slate.verdict) : "Measuring frame"}.${
              score ? ` Director score ${score.final}.` : ""
            }`
          : reached("compare")
            ? "Comparing the original frame with your director's cut. Use left and right arrow keys to scrub."
            : reached("objective")
              ? `Objective: ${mission.objective}.`
              : reached("radio")
                ? `Radio. ${mission.radio.who}: ${mission.radio.line}`
                : "Frame locked."}
      </p>
    </div>
  );
}
