"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { CornerBracket } from "@/components/ui/CornerBracket";
import { Display, Metadata, Prose } from "@/components/ui/Typography";
import { analyseFrame, classifyEdit, takeNumber, type FrameReport } from "@/lib/frame";
import { T_SCENE, exposureFlash, fadeIn, riseIn, staggerContainer } from "@/lib/motion";
import { editableFrame, type Mission } from "@/data/missions";
import styles from "./DirectorCut.module.css";

/**
 * THE LOCK FRAME MOMENT (§17) and the Director's Cut slate (§20).
 *
 * This is the screen that answers "what did saving actually do?". Phase 5's
 * checkpoint ended at "edit -> lock -> edited image visible", which is a
 * technically complete demo and a creatively empty one: the player presses a
 * button and the app goes quiet. The brief's own §17 lists seven things that
 * must happen on LOCK FRAME, and six of them are staging — freeze the editor,
 * drop the chrome, flash, go full-screen, add metadata, start the push. Only the
 * seventh is a payoff, and it was missing.
 *
 * So the payoff is the slate. The edit is developed the way a film is: the frame
 * is held, the picture is *measured*, and the readout tells the player something
 * about their own work that they could not have counted themselves. That is what
 * makes the editor's eight tools feel like they did something — a bar drawn over
 * a face moves the coverage number, a crop changes the output dimensions, a
 * filter lifts the mean shift. The numbers respond to the tools.
 *
 * Nothing here is a fabricated score. §20 is explicit that these must not
 * pretend to be measured AI judgements, and they are not: `coverage`, `shift`,
 * the dimensions and the format are all computed from the actual pixels of the
 * locked frame in `src/lib/frame.ts`. Only the film-language naming (framing,
 * genre, process) is authored per mission, and it is presented as a slate line
 * rather than as a rating.
 *
 * The staged beats below are the §17 order, timed as one develop:
 *   0ms    frame holds, dead
 *   120ms  exposure flash (the shutter)
 *   260ms  slate rises, rows stagger in
 *   900ms  the measured readout lands last, so it reads as the result
 */

/** §17 beat sheet, in ms. One source of truth for the sequence. */
const BEAT = {
  flash: 120,
  slate: 260,
  readout: 900,
} as const;

/**
 * The slate's headline, from the measured classification.
 *
 * `verdict` is the mission's own word — Marked for the scene that says "mark the
 * moment", Redacted for the one that says "obscure the target" — so the report
 * answers the player in the vocabulary their brief used. The other three labels
 * are the same everywhere because they describe the edit itself, not the scene.
 *
 * "Unmarked" is deliberately not a scolding: it reports that the frame was
 * passed through unchanged, which is a legitimate choice, and it is the honest
 * reading of a frame that measures as untouched.
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

export function DirectorCut({
  mission,
  frame,
  onRollAgain,
  onNextMission,
  nextMissionName,
}: {
  mission: Mission;
  /** The locked frame, already captured. */
  frame: { dataUrl: string; source: "onSave" | "getImage()"; degraded: boolean; edited: boolean };
  onRollAgain: () => void;
  /** Absent on the final mission, which offers only ROLL AGAIN. */
  onNextMission?: () => void;
  nextMissionName?: string;
}) {
  const reduceMotion = useReducedMotion();
  const reduced = reduceMotion === true;

  const [report, setReport] = useState<FrameReport | null>(null);
  const [measured, setMeasured] = useState(false);
  const [showSlate, setShowSlate] = useState(false);
  const [flashing, setFlashing] = useState(true);

  /**
   * Measure the frame against the original scene.
   *
   * Runs after paint so the flash is not competing with a synchronous decode,
   * and it is the reason the readout is staged last: the numbers genuinely are
   * not available yet when the slate appears. The beat is honest.
   */
  useEffect(() => {
    let cancelled = false;

    // Baseline is `editableFrame`, NOT `mission.scene`. The editor opened on the
    // briefing's freeze frame, and mission 01's `scene` is a different picture
    // (the night-city aerial vs the burning car). Measuring against the wrong one
    // would report almost the whole frame as changed on a frame nobody touched.
    // Both sides read from the same helper so they cannot drift apart.
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

  useEffect(() => {
    // Reduced motion keeps every beat but collapses the waits, rather than
    // branching to a different code path: the frame, the slate and the readout
    // all land together instead of being withheld.
    //
    // The collapse is a zero delay on the same timers, not a synchronous
    // setState — setState in an effect body triggers a cascading render, and the
    // reduced-motion path is the one place it would happen on every mount.
    const timers = [
      window.setTimeout(() => setFlashing(false), reduced ? 0 : BEAT.flash),
      window.setTimeout(() => setShowSlate(true), reduced ? 0 : BEAT.slate),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [reduced]);

  const take = takeNumber(report);
  return (
    <div className={styles.stage}>
      {/* §17 step 5: the edited frame takes the screen. */}
      <motion.img
        className={styles.frame}
        src={frame.dataUrl}
        alt={`Locked frame for ${mission.name}`}
        initial={reduced ? false : { scale: 1.02, opacity: 0.7 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={T_SCENE}
      />
      <div className={styles.scrim} />

      <CornerBracket corner="tl" tone="accent" size="26px" />
      <CornerBracket corner="br" size="26px" />

      {/* §17 step 4: the exposure flash. Once, never looped. */}
      {flashing ? (
        <motion.div
          className={styles.flash}
          variants={exposureFlash}
          initial="hidden"
          animate="visible"
          aria-hidden="true"
        />
      ) : null}

      {/* Still part of the editor's honesty contract: a frame lifted from the
          live canvas is not the same thing as a saved export, and the screen
          says so rather than quietly presenting it as a render. */}
      {frame.degraded ? (
        <motion.div className={styles.notice} variants={fadeIn} initial="hidden" animate="visible">
          <Metadata tone="accent">Canvas capture — no editor save was recorded</Metadata>
        </motion.div>
      ) : null}

      {showSlate ? (
        <motion.div
          className={styles.slate}
          variants={staggerContainer(0.08, reduced ? 0 : 0.05)}
          initial="hidden"
          animate="visible"
        >
          {/* --- clapper head ------------------------------------------------ */}
          <motion.div className={styles.slateHead} variants={fadeIn}>
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

          {/* --- the slate lines -------------------------------------------
              Film-language naming, authored per mission. Descriptive, not a
              rating: there is no score to argue with because nothing here
              claims to be one. */}
          <motion.dl className={styles.states} variants={fadeIn}>
            <div className={styles.state}>
              <dt>
                <Metadata>Framing</Metadata>
              </dt>
              <dd>
                <Prose size="small">{mission.slate.framing}</Prose>
              </dd>
            </div>
            <div className={styles.state}>
              <dt>
                <Metadata>Genre</Metadata>
              </dt>
              <dd>
                <Prose size="small">{mission.slate.genre}</Prose>
              </dd>
            </div>
            <div className={styles.state}>
              <dt>
                <Metadata>Process</Metadata>
              </dt>
              <dd>
                <Prose size="small">{mission.slate.process}</Prose>
              </dd>
            </div>
          </motion.dl>

          <motion.div variants={riseIn} className={styles.payoff}>
            <Metadata className={styles.payoffLabel}>
              {measured ? "Frame measured" : "Measuring frame"}
            </Metadata>

            {/* The readout.
                The headline is WHAT KIND of edit it was, not the coverage
                percentage. Coverage is measured, but as a headline it misreports
                the two missions built around annotation: an X drawn across the
                frame alters about 1% of its area, so leading with "1%" tells a
                player who just did something dramatic that nothing happened.
                The figure is the classification from `classifyEdit`, which reads
                real properties of the locked frame; the numbers sit underneath
                as the evidence for it. Nothing here is a score. */}
            {measured ? (
              report ? (
                <div className={styles.measured}>
                  <p className={styles.figureHeadline}>
                    {editLabel(report, mission.slate.verdict)}
                  </p>

                  {/* The pass/fail line. Only shown when the mission declares a
                      target region — without one there is nothing to check, and
                      a verdict would be invented. Both numbers are reported: the
                      centre-of-mass verdict can read ON TARGET while most of the
                      ink sits elsewhere (a mark drawn right across the frame
                      centres near the middle), so the share is what says how much
                      of the mark actually landed. */}
                  {mission.briefing ? (
                    <div className={styles.check} data-pass={report.onTarget}>
                      <Metadata className={styles.checkLabel}>
                        {report.onTarget ? "Mark on target" : "Mark off target"}
                      </Metadata>
                      <Metadata className={styles.checkNote}>
                        {`${Math.round(report.onTargetShare)}% of the mark inside the moment`}
                      </Metadata>
                    </div>
                  ) : null}

                  <dl className={styles.readout}>
                    <div className={styles.cell}>
                      <dt>
                        <Metadata>Altered</Metadata>
                      </dt>
                      <dd className={styles.figure}>{`${report.coverage}%`}</dd>
                      <dd>
                        <Metadata className={styles.cellNote}>of the frame</Metadata>
                      </dd>
                    </div>

                    <div className={styles.cell}>
                      <dt>
                        <Metadata>Spread</Metadata>
                      </dt>
                      <dd className={styles.figure}>{`${report.spread}%`}</dd>
                      <dd>
                        <Metadata className={styles.cellNote}>reached globally</Metadata>
                      </dd>
                    </div>

                    <div className={styles.cell}>
                      <dt>
                        <Metadata>Print</Metadata>
                      </dt>
                      <dd className={styles.figure}>{report.format}</dd>
                      <dd>
                        <Metadata className={styles.cellNote}>
                          {`${report.width}×${report.height}`}
                        </Metadata>
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                // Measured, but no comparison was possible. Says so instead of
                // printing a zero that would read as "you changed nothing".
                <Metadata className={styles.cellNote}>
                  The frame could not be compared against the original scene.
                </Metadata>
              )
            ) : (
              <div className={styles.readoutPending} aria-hidden="true" />
            )}
          </motion.div>

          {/* --- §20 outcome + actions ------------------------------------- */}
          <motion.footer className={styles.foot} variants={fadeIn}>
            <div className={styles.stamp}>
              <Prose size="lead">Frame locked.</Prose>
              <Prose size="lead" tone="muted">
                Scene directed.
              </Prose>
            </div>

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
          </motion.footer>
        </motion.div>
      ) : null}
    </div>
  );
}
