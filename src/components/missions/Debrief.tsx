"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Metadata, Prose } from "@/components/ui/Typography";
import type { DebriefQuestion, DebriefVerdict } from "@/lib/debrief";
import styles from "./Debrief.module.css";

/**
 * THE AI DEBRIEF — the panel.
 *
 * Shown on the mission result, after the scores. It asks a few questions about
 * the scene the player just directed and then reacts to their answers.
 *
 * The rule that shapes every line of this component: IT MUST NEVER BREAK THE
 * RESULT. The mission result renders, measures, scores and navigates whether
 * this panel works, is slow, or is not configured at all. So it renders NOTHING
 * on any failure rather than an error state — an error box inside the mission
 * result makes the whole screen look broken, and the demo's core loop must never
 * look broken. Silent absence reads as "not part of this build"; a red box reads
 * as "this is falling over".
 *
 * The same reasoning drives the loading state: it is a single quiet line, and it
 * appears only after a delay, so a fast response does not flash a placeholder on
 * and off. A panel that flickers in under the score reads as jank.
 */

type Stage = "starting" | "asking" | "judging" | "done" | "absent";

/** How long to wait before admitting the panel is loading. */
const LOADING_VISIBLE_AFTER = 700;

export function Debrief({
  mission,
  report,
  verdict,
  score,
}: {
  mission: {
    name: string;
    location: string;
    instruction: string;
    objective: string;
    radio: { who: string; line: string };
  };
  report: {
    coverage: number;
    spread: number;
    onTarget: boolean;
    onTargetShare: number;
    edited: boolean;
    format: string;
  } | null;
  verdict: string | null;
  score: { framing: number; composition: number; control: number; final: number } | null;
}) {
  const [stage, setStage] = useState<Stage>("starting");
  const [questions, setQuestions] = useState<DebriefQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<DebriefVerdict | null>(null);
  const [showLoading, setShowLoading] = useState(false);

  /** Aborts the in-flight request when the component goes away or the mission
   *  changes, so a roll-again cannot land the previous debrief on a new frame. */
  const inFlight = useRef<AbortController | null>(null);

  const post = useCallback(async (body: Record<string, unknown>) => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    try {
      const res = await fetch("/api/debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) return null;
      return (await res.json()) as unknown;
    } catch {
      // Network failure, or the abort above. Both mean the same thing here.
      return null;
    }
  }, []);

  /**
   * Fetch the questions on mount.
   *
   * The component is remounted per mission — its parent passes
   * `key={mission.name}` — so this effect only ever runs once per scene and does
   * not need to reset state on the way in. That is deliberate: resetting state
   * synchronously in an effect body causes a cascading render, and doing it here
   * would mean the panel re-rendered twice before its first fetch even left.
   * Remounting is how React is meant to handle "start over for a new subject".
   */
  useEffect(() => {
    let cancelled = false;
    const reveal = window.setTimeout(() => setShowLoading(true), LOADING_VISIBLE_AFTER);

    void (async () => {
      const data = await post({
        kind: "questions",
        mission,
        report,
        verdict,
        score,
      });
      if (cancelled) return;

      const qs = (data as { questions?: DebriefQuestion[] } | null)?.questions;
      if (!Array.isArray(qs) || qs.length === 0) {
        // No key configured, model unreachable, or an unusable payload. Hide.
        setStage("absent");
        return;
      }
      setQuestions(qs);
      setStage("asking");
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(reveal);
      inFlight.current?.abort();
    };
    // Mount-only. `mission.name` is the identity of the scene, and the parent's
    // key already guarantees a fresh mount when it changes; the rest is captured
    // per mount so re-running on a measurement tick would refetch mid-answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);

  const submit = useCallback(async () => {
    if (!allAnswered) return;
    setStage("judging");
    setShowLoading(false);

    const data = await post({
      kind: "verdict",
      mission,
      report,
      verdict,
      score,
      questions,
      answers: questions.map((q) => ({ id: q.id, answer: answers[q.id] })),
    });

    const v = (data as { verdict?: DebriefVerdict } | null)?.verdict;
    if (!v) {
      setStage("absent");
      return;
    }
    setResult(v);
    setStage("done");
  }, [allAnswered, answers, mission, post, questions, report, score, verdict]);

  if (stage === "absent") return null;

  /**
   * Nothing but an invisible spacer until the questions exist.
   *
   * The whole panel is revealed at once, header included. An earlier version
   * rendered the header immediately and hid it again on failure, which meant that
   * with no model configured — the default state — every player saw "Debrief /
   * Written by a model" flash on and off inside the mission result. A panel that
   * appears and vanishes reads as a glitch; a panel that never appears reads as
   * a build without that feature. Only one of those is acceptable in a demo.
   *
   * The spacer keeps the layout from jumping when the panel does land, and it is
   * aria-hidden because announcing a heading for a section with no content yet is
   * worse than silence.
   */
  if (stage === "starting") {
    return (
      <div className={styles.pendingSlot} aria-hidden="true">
        {showLoading ? <Metadata className={styles.pending}>Reading the scene…</Metadata> : null}
      </div>
    );
  }

  return (
    <section className={styles.debrief} aria-labelledby="debrief-heading">
      <header className={styles.head}>
        {/* The id sits on a wrapper: the type primitives take a fixed prop list
            and deliberately do not spread arbitrary attributes, so they cannot
            carry an id themselves. */}
        <span id="debrief-heading">
          <Metadata className={styles.label}>Debrief</Metadata>
        </span>
        {/* Said plainly, on screen. §20 is explicit that the scores are not AI
            judgements, and the same honesty applies the other way round: this
            panel IS a model, and it is labelled as one. */}
        <Metadata className={styles.byline}>Written by a model · not a score</Metadata>
      </header>

      {stage === "asking" || stage === "judging" ? (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {questions.map((q, i) => (
            <fieldset key={q.id} className={styles.question} disabled={stage === "judging"}>
              <legend className={styles.legend}>
                <span className={styles.legendIndex}>{String(i + 1).padStart(2, "0")}</span>
                {q.question}
              </legend>
              <div className={styles.options}>
                {q.options.map((option) => (
                  <label
                    key={option}
                    className={styles.option}
                    data-selected={answers[q.id] === option}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={option}
                      checked={answers[q.id] === option}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: option }))}
                      className={styles.radio}
                    />
                    <span className={styles.optionText}>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <div className={styles.submit}>
            <Button variant="ghost" type="submit" disabled={!allAnswered || stage === "judging"}>
              {stage === "judging" ? "Filing" : "File the debrief"}
            </Button>
            {!allAnswered && stage !== "judging" ? (
              <Metadata className={styles.hint}>Answer all three to continue</Metadata>
            ) : null}
          </div>
        </form>
      ) : null}

      {stage === "done" && result ? (
        <div className={styles.verdict}>
          <p className={styles.rank}>{result.rank}</p>
          <Prose size="lead" tone="paper" className={styles.line}>
            {result.line}
          </Prose>
          <Prose size="small" className={styles.note}>
            {result.note}
          </Prose>
        </div>
      ) : null}
    </section>
  );
}
