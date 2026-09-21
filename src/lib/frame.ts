/**
 * Frame analysis for the Director's Cut slate (§20).
 *
 * The problem this solves: `onSave` hands back a flattened image and nothing
 * else. It does not say what was drawn on, cropped, graded or framed — so a
 * results screen has nothing true to report and ends up inventing a score.
 * §20 is explicit that we must not pretend those numbers are measured.
 *
 * So we measure them. The source scene and the locked frame are both drawn into
 * a small offscreen canvas and compared pixel by pixel. Everything the slate
 * reports about the edit is derived from that comparison, which means the
 * numbers on screen are a real property of what the player just did.
 *
 * Deliberately sampled at 320x180 rather than full resolution: the question is
 * "how much of the frame did they change", and that is a coverage statistic, not
 * a fidelity one. Full-res would mean ~8M pixel reads on the main thread during
 * the one transition that has to stay smooth, to answer a question the downscale
 * answers just as well.
 */

/** Sample grid. 16:9, small enough to diff synchronously without a hitch. */
const SAMPLE_W = 320;
const SAMPLE_H = 180;

/**
 * Per-channel distance at which a pixel counts as CHANGED.
 *
 * Not 0: JPEG re-encoding and the canvas round-trip both shift pixels by a few
 * values on their own, so a zero threshold reports "every pixel changed" even
 * for an untouched frame. 24 is above that noise floor and below a real edit.
 */
const CHANGE_THRESHOLD = 24;

/**
 * Per-channel distance at which a pixel counts as TOUCHED AT ALL.
 *
 * The two thresholds exist because one cannot separate the two kinds of edit a
 * filter and a drawing implement produce. Measured against the real scene with
 * the maths below (ground truth in the calibration run):
 *
 *   drawn stroke      spread   0-4%    coverage   0-1%
 *   grayscale         spread    58%    coverage    18%
 *   sepia             spread    91%    coverage    29%
 *   brightness +20%   spread    71%    coverage    10%
 *
 * Note grayscale's coverage (18%) is HIGHER than brightness's (10%) while its
 * shift is lower — a single threshold ranks them inconsistently, which is what
 * broke the first version of this classifier: grayscale came out "annotated" and
 * sepia came out "mixed", both wrong, because a filter is a GLOBAL change of
 * moderate size and a stroke is a LOCAL change of large size.
 *
 * At 6 the separation is large and stable: annotations sit at 0-4%, grades at
 * 41-91%. Only a very soft edit escapes it — a blur of 3 measures 2% and reads
 * as untouched, which is a miss this metric accepts rather than a false claim it
 * would otherwise have to make.
 */
const TOUCH_THRESHOLD = 6;

/**
 * Spread at which a frame counts as graded rather than annotated.
 *
 * 30 sits in the empty middle of that 4%-to-41% gap, so neither kind of edit is
 * anywhere near the boundary and a small change in scene brightness cannot flip
 * the verdict.
 */
const GRADE_SPREAD = 30;

/**
 * Minimum share of the frame the edit must reach before it counts as touching
 * anything at all.
 *
 * This is a NOISE FLOOR, not a judgement about whether an edit happened — the
 * editor answers that question itself via `hasChanges()` (see `edited`). It
 * exists only to stop a handful of JPEG-shifted pixels being reported as
 * coverage.
 *
 * 0.05% is about 30 pixels of the 57,600 sampled: comfortably above the
 * handful the encode round-trip moves, and well below the thinnest real stroke.
 */
const TOUCH_FLOOR = 0.05;

export type FrameReport = {
  /** Output dimensions of the locked frame, in real pixels. */
  width: number;
  height: number;
  /** Original scene dimensions, for detecting a crop or resize. */
  originalWidth: number;
  originalHeight: number;
  /** "JPEG" / "PNG" — which encoder the capture path used. */
  format: string;
  /**
   * Whether the editor reports unsaved changes — i.e. whether the player
   * actually edited anything.
   *
   * This is the authoritative answer to "did they edit", and it is NOT derived
   * from the pixels. An earlier version inferred it from coverage alone, and
   * that was wrong in a way the demo would have hit: a single thin drawn stroke
   * covers ~0.03% of a 4K frame, and once the frame is downscaled to the sample
   * grid for comparison, the stroke is averaged away below the change threshold
   * entirely. The slate then told a player who had visibly drawn on the scene
   * that the frame was "Unmarked". The editor knows the answer directly, so we
   * ask it and use the pixels only to characterise the result.
   */
  edited: boolean;
  /** Share of sampled pixels the edit altered, 0-100. */
  coverage: number;
  /**
   * Share of sampled pixels the edit touched AT ALL, 0-100.
   *
   * This is the signal that distinguishes a grade from an annotation: a filter
   * is global so it spreads across the frame, a stroke is local so it does not.
   * `coverage` cannot make that distinction on its own — see TOUCH_THRESHOLD.
   */
  spread: number;
  /** Mean per-channel distance across the frame, 0-255. */
  shift: number;
  /**
   * Centre of mass of the changed pixels, as fractions of the frame, or null
   * when nothing changed. This is where the player's mark actually landed.
   */
  markCentre: { x: number; y: number } | null;
  /**
   * Share of the changed pixels that landed inside the mission's target region,
   * 0-100. Not the same question as "is the centroid inside it": a mark drawn
   * right across the frame has a centroid near the middle of the frame, which
   * may sit inside the region while most of the ink is somewhere else.
   */
  onTargetShare: number;
  /** True when the mark's centre of mass falls within the target region. */
  onTarget: boolean;
  /** True when the frame was captured from the live canvas, not an editor save. */
  fromCanvas: boolean;
};

/**
 * What kind of edit the measurements describe.
 *
 * This exists because a raw coverage percentage actively misreports the two
 * missions that matter most. Drawing an X across a frame alters ~1% of its
 * AREA — a thin brush stroke is a small number of pixels — so a slate that leads
 * with "ALTERED 1%" tells a player who just did something dramatic that almost
 * nothing happened. Coverage is the right statistic and the wrong headline.
 *
 * So the headline is the kind of edit, inferred from which measurement moved,
 * and the raw numbers sit underneath as the evidence. Every branch below reads a
 * real property of the locked frame; none of them is a score.
 *
 * There is deliberately no "mixed" category. It was in an earlier draft and it
 * was wrong: grayscale on its own measures 18% coverage, because a grade's local
 * hotspots count as changed pixels, so "graded + annotated" would have fired on
 * a plain filter. Separating the two would need a baseline of what the grade
 * alone did, which the editor does not expose. Rather than claim a distinction
 * this cannot measure, the classification reports the grade and lets the numbers
 * show how much else moved.
 */
export type EditKind = "untouched" | "annotated" | "graded" | "reframed";

export function classifyEdit(report: FrameReport): EditKind {
  const reframed =
    report.width !== report.originalWidth ||
    report.height !== report.originalHeight;

  // Reframing wins outright: changing the output dimensions is the largest
  // possible statement about a frame, and it is still visible in the result
  // whatever else was also done.
  if (reframed) return "reframed";

  // Grade first. A global change is a grade whatever else is true of it — a
  // filter's local hotspots also register as changed pixels, so testing coverage
  // first would label every filter an annotation. See TOUCH_THRESHOLD.
  if (report.spread >= GRADE_SPREAD) return "graded";

  // Past this point the edit is local, so it is an annotation — provided there
  // was an edit at all. `edited` comes from the editor, not from these pixels:
  // a thin stroke is averaged below the sampling floor and would otherwise be
  // reported as no edit.
  if (report.edited || report.coverage >= TOUCH_FLOOR) return "annotated";

  return "untouched";
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    // Same-origin for both paths (a public/ scene and a data URL), so the
    // canvas is never tainted and getImageData stays legal.
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("frame could not be read"));
    img.src = src;
  });

const draw = (img: HTMLImageElement) => {
  const c = document.createElement("canvas");
  c.width = SAMPLE_W;
  c.height = SAMPLE_H;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, SAMPLE_W, SAMPLE_H);
  return ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
};

/**
 * Compare the original scene against the locked frame.
 *
 * Returns `null` rather than throwing when the comparison is impossible — a
 * failed decode, or a cross-origin source. The slate treats a null report as
 * "not measured" and omits the derived rows, which is the honest outcome; it
 * never falls back to a fabricated number.
 */
export async function analyseFrame(
  originalSrc: string,
  editedDataUrl: string,
  fromCanvas: boolean,
  /** Whether the editor reported an edit. See FrameReport.edited. */
  edited: boolean,
  /**
   * The mission's target region, as fractions of the frame. Optional: a mission
   * without a briefing has nothing to check against, and the report says so
   * rather than defaulting to a pass or a fail.
   */
  target?: { x: number; y: number; w: number; h: number },
): Promise<FrameReport | null> {
  try {
    // Named `locked`, not `edited`: the parameter above already holds the
    // editor's dirty flag, and shadowing it here silently turned that boolean
    // into an HTMLImageElement (caught by tsc, but only because the types differ).
    const [original, locked] = await Promise.all([
      loadImage(originalSrc),
      loadImage(editedDataUrl),
    ]);

    const a = draw(original);
    const b = draw(locked);
    if (!a || !b) return null;

    let changed = 0;
    let touched = 0;
    let totalDistance = 0;
    /** Sum of changed-pixel coordinates, for the centre of mass. */
    let sumX = 0;
    let sumY = 0;
    /** Changed pixels landing inside the target region. */
    let insideTarget = 0;

    for (let i = 0; i < a.length; i += 4) {
      const dr = Math.abs(a[i] - b[i]);
      const dg = Math.abs(a[i + 1] - b[i + 1]);
      const db = Math.abs(a[i + 2] - b[i + 2]);

      totalDistance += (dr + dg + db) / 3;

      // Peak channel, not the mean: a thin red annotation line is a large change
      // on one channel and a rounding error on the average, so a mean-based test
      // would score a drawn frame as untouched.
      const peak = Math.max(dr, dg, db);
      if (peak > CHANGE_THRESHOLD) {
        changed++;
        // Sample-grid coordinate of this pixel, as a fraction of the frame.
        const px = (i / 4) % SAMPLE_W;
        const py = Math.floor(i / 4 / SAMPLE_W);
        const fx = (px + 0.5) / SAMPLE_W;
        const fy = (py + 0.5) / SAMPLE_H;
        sumX += fx;
        sumY += fy;
        if (
          target &&
          fx >= target.x &&
          fx <= target.x + target.w &&
          fy >= target.y &&
          fy <= target.y + target.h
        ) {
          insideTarget++;
        }
      }
      if (peak > TOUCH_THRESHOLD) touched++;
    }

    const pixels = a.length / 4;
    const markCentre =
      changed > 0 ? { x: sumX / changed, y: sumY / changed } : null;

    // "On target" is the mark's centre of mass being inside the region. The
    // share is reported alongside it because the two can disagree: a mark drawn
    // right across the frame centres near the middle, which may sit inside the
    // region while most of the ink is elsewhere. Neither number alone is the
    // whole answer, so both are shown.
    const onTarget =
      !!target &&
      !!markCentre &&
      markCentre.x >= target.x &&
      markCentre.x <= target.x + target.w &&
      markCentre.y >= target.y &&
      markCentre.y <= target.y + target.h;

    // One decimal, not a whole number. A single drawn stroke covers a few tenths
    // of a percent of a 4K frame, so rounding to integers reported "ALTERED 0%"
    // directly beside the verdict "MARKED" — two lines of the same slate
    // contradicting each other. The decimal keeps the readout consistent with
    // the verdict without overstating the precision of the metric.
    const pct = (n: number) => Math.round((n / pixels) * 1000) / 10;

    return {
      // Real output dimensions, not the sample grid — the player is being told
      // what they exported, so this reads the decoded image itself.
      width: locked.naturalWidth,
      height: locked.naturalHeight,
      originalWidth: original.naturalWidth,
      originalHeight: original.naturalHeight,
      format: editedDataUrl.startsWith("data:image/png") ? "PNG" : "JPEG",
      edited,
      coverage: pct(changed),
      spread: pct(touched),
      shift: Math.round(totalDistance / pixels),
      markCentre,
      // Share OF THE MARK, not of the frame. Dividing by `pixels` here was a bug
      // the target probe caught: a stroke covering 500 of the 57,600 sampled
      // pixels is 0.9% of the frame but 100% of the mark, so the frame-based
      // figure printed "0% of the mark inside" on a pass where the whole mark was
      // inside the region. The label and the number have to describe the same
      // denominator or the readout contradicts itself.
      onTargetShare: changed > 0 ? Math.round((insideTarget / changed) * 100) : 0,
      onTarget,
      fromCanvas,
    };
  } catch {
    return null;
  }
}

/**
 * A stable 3-digit take number derived from the frame itself.
 *
 * Deterministic on purpose (§6): the same edit must produce the same take
 * number every rehearsal, or the demo stops being reproducible. Two takes of
 * the same edit always match; a different edit reads as a different take.
 *
 * Every term is rounded to an integer before mixing. `coverage` and `spread`
 * carry a decimal place (0.4%, not 1%), so multiplying them by a prime produced
 * a float and the slate rendered "TAKE 7.600000000000364". Integer maths keeps
 * the output three digits, which is what a slate looks like.
 */
export function takeNumber(report: FrameReport | null): string {
  if (!report) return "000";
  const seed =
    Math.round(report.coverage * 10) * 7919 +
    Math.round(report.spread * 10) * 104729 +
    report.shift * 131 +
    report.width;
  return String(seed % 1000).padStart(3, "0");
}

/** The Director Score block (§20). Three dimensions plus the cut. */
export type DirectorScore = {
  framing: number;
  composition: number;
  control: number;
  /** The mean of the three, presented as FINAL CUT. */
  final: number;
};

/**
 * The Director Score (§20).
 *
 * §20 is explicit on two points, and both are load-bearing here: these must not
 * pretend to be measured AI judgements, and they must be deterministic.
 *
 * They are deterministic — each is a pure function of the frame measurements, so
 * the same edit always produces the same score, every rehearsal. And they are
 * grounded rather than invented: every one moves when the player's edit moves,
 * which is the difference between a score that reads as feedback and one that
 * reads as a lottery. A player who marks the moment scores differently from one
 * who grades the whole frame, and they can see why.
 *
 * They are still a game metric, not a judgement, and the UI labels them as such.
 */
export function directorScore(report: FrameReport): DirectorScore {
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  // CONTROL — did the mark land where the brief pointed? Straight from the
  // measured share of the mark inside the target region. This is the most
  // honest of the three: it is a measurement with a name on it.
  const control = clamp(report.onTargetShare);

  // FRAMING — did the player make a decisive choice about the frame?
  //
  // A reframe (changed output dimensions) is the most decisive statement
  // available about a frame, so it is scored on its own scale and does not need
  // a target hit to score well — cropping to the subject IS the framing
  // judgement, and mission 02's brief asks for exactly that.
  //
  // Without a reframe, framing leans on whether the edit was aimed rather than
  // on where it landed, because `control` already measures placement and scoring
  // the same measurement twice would just double its weight.
  const reframed =
    report.width !== report.originalWidth || report.height !== report.originalHeight;
  const framing = clamp(
    reframed
      ? 62 + Math.min(36, report.coverage * 0.9)
      : 58 + report.onTargetShare * 0.4,
  );

  // COMPOSITION — how much of the frame the edit actually engaged.
  //
  // A grade is global by nature and an annotation is local, so each is scored
  // against its own expected reach. A single scale would rank a filter above a
  // mark for no better reason than covering more pixels, which would tell the
  // player the opposite of what the tools are for.
  const composition = clamp(
    report.spread >= GRADE_SPREAD
      ? 66 + Math.min(32, report.spread * 0.32)
      : 58 + Math.min(38, report.coverage * 9),
  );

  return { framing, composition, control, final: clamp((framing + composition + control) / 3) };
}

/**
 * Director rep, the optional §20 line.
 *
 * Also deterministic, and derived from the same three dimensions so it can never
 * contradict the scores shown beside it. Bands rather than a continuous function
 * because rep reads as a game reward — "the operation landed" — and a smooth
 * curve would just be the score printed again in different units.
 */
export function directorRep(score: DirectorScore): number {
  if (score.final >= 85) return 120;
  if (score.final >= 70) return 80;
  if (score.final >= 55) return 45;
  return 20;
}
