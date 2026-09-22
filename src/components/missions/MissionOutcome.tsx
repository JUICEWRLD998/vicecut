"use client";

import { motion } from "motion/react";
import { Figure, MeterRow } from "@/components/ui/Meter";
import { Metadata } from "@/components/ui/Typography";
import { riseIn } from "@/lib/motion";
import { useCountUp } from "@/lib/countup";
import type { Mission } from "@/data/missions";
import {
  CONTROL_MARK,
  REP_BANDS,
  bandCaption,
  directorRep,
  type DirectorScore,
  type FrameReport,
} from "@/lib/frame";
import styles from "./MissionOutcome.module.css";

/**
 * THE OUTCOME PANELS (§20) — the measured readout and the Director Score.
 *
 * These were two bare collections of numbers and they were the weakest thing on
 * the result screen. `FRAMING 58 / COMPOSITION 58 / CONTROL 0 / FINAL CUT 39`
 * tells a reader nothing: 39 against what scale, and is 0 on CONTROL the floor or
 * a total failure? A figure nobody can evaluate is decoration, and the whole
 * result read as a scoreboard rather than as a report.
 *
 * Three things changed, and each one answers a question the old version left
 * open:
 *
 *   THE SCALE IS DRAWN. Every score is a gauge whose line is ruled onto the
 *     track (`REP_BANDS`), so "39" arrives with the 55-band visibly ahead of it.
 *
 *   THE FIGURES ARRIVE. They count up, so the eye is caught by the number
 *     landing rather than skimming past four static digits.
 *
 *   THE MEASUREMENTS ARE SEPARATED FROM THE SCORES. ALTERED and SPREAD are
 *     facts about the frame; FRAMING and COMPOSITION are the game's reading of
 *     those facts. Filing them in one block is what made the whole screen look
 *     like invented scoring — §20 forbids pretending the metrics are measured
 *     judgements, and the honest way to say that is to put the measurements
 *     somewhere else, labelled as measurements.
 *
 * The split between the two panels is that boundary, not a compositional choice.
 */

/**
 * The measured facts about the locked frame.
 *
 * A `Figure` rather than a gauge, deliberately: ALTERED 0.3% has no threshold to
 * land on, so a meter would be inventing a scale to fill. What it does need is
 * the unit, which the old readout printed as a separate line of metadata under
 * the number and which reads far better attached to it.
 */
export function MeasuredReadout({ report }: { report: FrameReport }) {
  // One decimal, because a single drawn stroke covers a few tenths of a percent
  // of a 4K frame and rounding to whole numbers printed "ALTERED 0%" beside the
  // verdict "MARKED" — two lines of the same document contradicting each other.
  const altered = useCountUp(report.coverage, { decimals: 1, durationMs: 700 });
  const spread = useCountUp(report.spread, { decimals: 1, durationMs: 780 });

  return (
    <motion.section className={styles.panel} variants={riseIn}>
      <header className={styles.panelHead}>
        <Metadata tone="accent">What you changed</Metadata>
        <Metadata className={styles.panelNote}>Measured from this frame</Metadata>
      </header>

      <div className={styles.figures}>
        <Figure label="Altered" value={`${altered}%`} unit="of the frame" />
        <Figure label="Reached" value={`${spread}%`} unit="globally" />
        <Figure label="Print" value={report.format} unit={`${report.width}×${report.height}`} />
      </div>
    </motion.section>
  );
}

/**
 * THE SLATE (§11/§20) — the shot record, per mission.
 *
 * Phase 7 asks for three scenes that are distinct in more than their artwork:
 * "distinct art, distinct instruction, distinct editing behavior, distinct
 * cinematic treatment". Art, instruction and tools were already per mission, but
 * the CINEMATIC was not — all three results rendered identical chrome, so the
 * third scene answered with the same words as the first.
 *
 * The data for the difference was already authored and then never rendered:
 * `mission.slate` carries `framing`, `genre` and `process` for every mission —
 * "Tight two / Neon noir / Annotated print" for the night shift, "Raked push-in /
 * Sunset pursuit / Framed print" for Southbound — and nothing read the first
 * three fields. `verdict` was the only one in use.
 *
 * So this is not decoration bolted on to satisfy a checklist: it is the missing
 * half of work already done, and it is what makes the three outcomes read as
 * three different operations rather than one screen reskinned.
 *
 * The form is a clapperboard's, because that is what the object is. Three fields
 * on a rule, mono labels above display values — the same grammar the rest of the
 * product uses for machine data.
 */
export function SlateStrip({ mission }: { mission: Mission }) {
  return (
    <motion.section className={styles.slate} variants={riseIn} aria-label="Slate">
      <header className={styles.slateHead}>
        <Metadata tone="accent">Slate</Metadata>
        <Metadata className={styles.panelNote}>
          {`Scene ${mission.code} · ${mission.location}`}
        </Metadata>
      </header>

      <div className={styles.slateFields}>
        {(
          [
            ["Shot", mission.slate.framing],
            ["Genre", mission.slate.genre],
            ["Process", mission.slate.process],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className={styles.slateField}>
            <span className={styles.slateLabel}>{label}</span>
            <span className={styles.slateValue}>{value}</span>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

/**
 * The Director Score (§20).
 *
 * Unchanged in substance: each figure is still a pure function of the frame
 * measurements, so the same edit always produces the same score, and the label
 * still says on screen that these are game metrics rather than a judgement.
 *
 * What is new is that they are now legible as a group. CONTROL is scored against
 * the share of the mark that landed inside the moment, so `CONTROL_MARK` is drawn
 * on its track and the caption names the gap. FRAMING, COMPOSITION and FINAL CUT
 * are scored against the rep bands, so those are drawn instead.
 *
 * The captions are the actionable half. "39" is a verdict the player cannot argue
 * with; "16 below the 55 band" is a reason to roll again, which is the behaviour
 * a judged demo wants to provoke.
 */
export function ScorePanel({
  score,
  report,
}: {
  score: DirectorScore;
  report: FrameReport;
}) {
  const framing = useCountUp(score.framing, { durationMs: 820 });
  const composition = useCountUp(score.composition, { durationMs: 900 });
  const control = useCountUp(score.control, { durationMs: 980 });
  const final = useCountUp(score.final, { durationMs: 1200 });
  const rep = directorRep(score);

  return (
    <motion.section className={styles.panel} variants={riseIn}>
      <header className={styles.panelHead}>
        <Metadata tone="accent">Director score</Metadata>
        <Metadata className={styles.panelNote}>Game metrics, not a judgement</Metadata>
      </header>

      <div className={styles.meters}>
        <MeterRow
          label="Framing"
          value={framing}
          marks={REP_BANDS}
          caption={bandCaption(score.framing, REP_BANDS)}
        />
        <MeterRow
          label="Composition"
          value={composition}
          marks={REP_BANDS}
          caption={bandCaption(score.composition, REP_BANDS)}
        />
        {/* CONTROL carries its own line, not the rep bands: it is scored against
            the mark landing inside the moment, so the rep bands would be a
            threshold it does not actually turn on. */}
        <MeterRow
          label="Control"
          value={control}
          marks={[CONTROL_MARK]}
          caption={
            report.onTarget
              ? `${report.onTargetShare}% of the mark inside the moment`
              : `${CONTROL_MARK - report.onTargetShare > 0 ? CONTROL_MARK - report.onTargetShare : 0} short of half the mark inside`
          }
        />
      </div>

      {/* FINAL CUT, ruled off above and set larger — it is the one figure the
          screen is actually answering with. */}
      <div className={styles.final}>
        <MeterRow
          label="Final cut"
          value={final}
          tone="accent"
          marks={REP_BANDS}
          caption={bandCaption(score.final, REP_BANDS)}
        />
      </div>

      <Metadata className={styles.panelNote}>{`Director rep +${rep}`}</Metadata>
    </motion.section>
  );
}
