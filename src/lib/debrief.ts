/**
 * The AI debrief's prompt construction and response validation.
 *
 * Kept out of the route handler so it can be reasoned about and tested without a
 * server: everything here is pure. The route's only jobs are reading the key,
 * calling the model, and mapping failures to status codes.
 *
 * Two calls make up a debrief:
 *   1. `questions` — the model writes a few questions about THIS mission and the
 *      player's result.
 *   2. `verdict`   — once answered, it reacts.
 *
 * Both return strict JSON, and both are validated here. A model that returns
 * prose, a truncated object, or an option list of the wrong shape is treated as a
 * failure and the feature hides itself — which matters more than it sounds: this
 * panel sits inside the mission result, and a half-rendered AI panel makes the
 * whole result look broken. Degrading to nothing is the safe direction.
 */

export type DebriefMission = {
  name: string;
  location: string;
  instruction: string;
  objective: string;
  radio: { who: string; line: string };
};

/** The measured facts about what the player actually did. */
export type DebriefReport = {
  coverage: number;
  spread: number;
  onTarget: boolean;
  onTargetShare: number;
  edited: boolean;
  format: string;
};

export type DebriefScoreish = {
  framing: number;
  composition: number;
  control: number;
  final: number;
};

export type DebriefQuestion = {
  id: string;
  question: string;
  options: string[];
};

export type DebriefVerdict = {
  rank: string;
  line: string;
  note: string;
};

/** Hard caps. The route is public, so nothing the client sends is trusted whole. */
const LIMITS = {
  name: 60,
  location: 60,
  instruction: 90,
  objective: 90,
  line: 140,
  who: 30,
} as const;

const cut = (s: unknown, n: number, fallback = ""): string =>
  typeof s === "string" ? s.slice(0, n).trim() : fallback;

/**
 * Coerce whatever the client sent into a known shape.
 *
 * The client is our own component, but this is still a network boundary: the
 * values end up inside a prompt, so an unbounded string here is both a cost and
 * an injection surface. Whitelisting the fields and truncating each one means a
 * hostile payload can add words to a prompt but cannot reshape it.
 */
export function sanitiseMission(raw: unknown): DebriefMission {
  const m = (raw ?? {}) as Record<string, unknown>;
  const radio = (m.radio ?? {}) as Record<string, unknown>;
  return {
    name: cut(m.name, LIMITS.name, "Untitled operation"),
    location: cut(m.location, LIMITS.location, "Unknown"),
    instruction: cut(m.instruction, LIMITS.instruction),
    objective: cut(m.objective, LIMITS.objective),
    radio: {
      who: cut(radio.who, LIMITS.who, "Dispatch"),
      line: cut(radio.line, LIMITS.line),
    },
  };
}

export function sanitiseReport(raw: unknown): DebriefReport | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, max: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : 0;
  return {
    coverage: num(r.coverage, 100),
    spread: num(r.spread, 100),
    onTarget: r.onTarget === true,
    onTargetShare: num(r.onTargetShare, 100),
    edited: r.edited === true,
    format: cut(r.format, 8, "JPEG"),
  };
}

/**
 * What the model is told about the player's result.
 *
 * Only measurements and authored mission text — no image, and the prompt says so
 * explicitly. This is the honest version of the feature: it reasons about the
 * mission and the numbers, and it must not imply it looked at the frame. It also
 * gets the verdict and the score, so its questions can refer to what actually
 * happened rather than being generic.
 */
function resultBlock(
  mission: DebriefMission,
  report: DebriefReport | null,
  verdict: string | null,
  score: DebriefScoreish | null,
): string {
  const lines = [
    `MISSION: ${mission.name}`,
    `LOCATION: ${mission.location}`,
    `INSTRUCTION GIVEN: ${mission.instruction}`,
    `OBJECTIVE: ${mission.objective}`,
    `RADIO: ${mission.radio.who} — "${mission.radio.line}"`,
  ];

  if (report) {
    lines.push(
      `PLAYER'S EDIT — verdict: ${verdict ?? "unknown"}`,
      `  altered ${report.coverage}% of the frame area`,
      `  edit reached ${report.spread}% of the frame (a high figure means a global grade such as a filter; a low figure means a local annotation such as a drawn mark)`,
      report.edited
        ? "  the editor recorded an edit"
        : "  the editor recorded NO edit — the frame was passed through untouched",
      `  ${
        report.onTarget
          ? `the mark landed on target, ${report.onTargetShare}% of it inside the intended moment`
          : `the mark missed the intended moment, only ${report.onTargetShare}% of it inside it`
      }`,
      `  exported as ${report.format}`,
    );
  } else {
    lines.push("PLAYER'S EDIT: the frame could not be measured.");
  }

  if (score) {
    lines.push(
      `GAME METRICS (deterministic, not your judgement): framing ${score.framing}, composition ${score.composition}, control ${score.control}, final ${score.final}`,
    );
  }

  return lines.join("\n");
}

/** Shared framing for both calls. Short on purpose — a debrief is not an essay. */
const VOICE = [
  "You are the debrief voice inside VICE CUT, a small interactive demo where the player is a film director cutting a GTA VI-style crime scene with a photo editor.",
  "",
  "How to write:",
  "- Terse, dry, cinematic. Short sentences. A little swagger, never a caricature.",
  "- This is fiction set in the GTA universe. Treat the crime-story framing as real in-world.",
  "- Never use emoji, headings, bullet points or markdown. Plain sentences only.",
  "- No exclamation marks.",
  "",
  "Hard rules — these matter more than style:",
  "- You have NOT seen any image. You only have the mission text and the measured numbers. Never say or imply you looked at the frame. If you mention the picture, phrase it as what the numbers describe.",
  "- Never claim a real user's skill, mental state, or intent.",
  "- Do not break character to discuss being an AI.",
].join("\n");

export function questionsMessages(
  mission: DebriefMission,
  report: DebriefReport | null,
  verdict: string | null,
  score: DebriefScoreish | null,
) {
  return [
    { role: "system" as const, content: VOICE },
    {
      role: "user" as const,
      content: [
        resultBlock(mission, report, verdict, score),
        "",
        "Write exactly 3 short questions to ask the player about this scene. They are a debrief: they should be fun to answer.",
        "Rules for the questions:",
        "- Each question is under 90 characters.",
        "- Each has exactly 3 options, each under 40 characters, all genuinely plausible — no obviously wrong joke answer.",
        "- Mix the fiction (what happened in the scene, what the character was thinking, what the player's cut implies) with the craft (what their edit communicates).",
        "- Vary the axes: do not ask three versions of the same question.",
        "- One of them should engage with the measured numbers above, in plain language.",
        "",
        'Return ONLY JSON of this exact shape, no other text: {"questions":[{"id":"q1","question":"...","options":["...","...","..."]},{"id":"q2",...},{"id":"q3",...}]}',
      ].join("\n"),
    },
  ];
}

export function verdictMessages(
  mission: DebriefMission,
  report: DebriefReport | null,
  verdict: string | null,
  score: DebriefScoreish | null,
  questions: DebriefQuestion[],
  answers: { id: string; answer: string }[],
) {
  const pairs = answers
    .map((a) => {
      const q = questions.find((x) => x.id === a.id);
      return q ? `Q: ${q.question}\nA: ${a.answer}` : null;
    })
    .filter(Boolean)
    .join("\n\n");

  return [
    { role: "system" as const, content: VOICE },
    {
      role: "user" as const,
      content: [
        resultBlock(mission, report, verdict, score),
        "",
        "The player just answered a short debrief. Their answers:",
        pairs || "(no answers recorded)",
        "",
        "Reply as the debrief voice. One rank word, one reaction to their edit, one reaction to their answers.",
        "- `rank` is a single uppercase word, 4-12 characters, that names how they directed this scene. Invent something in the register of a film crew credit. Not a score, not a grade.",
        "- `line` is at most 130 characters: a reaction to what their measured edit actually was.",
        "- `note` is at most 130 characters: a reaction to their answers, addressing what they said, not a summary of it.",
        "",
        'Return ONLY JSON of this exact shape, no other text: {"rank":"AUTEUR","line":"...","note":"..."}',
      ].join("\n"),
    },
  ];
}

/** Read a string field, or null if it is missing or not a string. */
function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

/**
 * Validate the questions payload.
 *
 * Rejects rather than repairs. A question with two options, or three questions
 * when four were asked for, is a model drift — and silently repairing it would
 * mean the panel sometimes shows a question with a missing answer, which reads as
 * a bug in the app rather than in the model.
 */
export function parseQuestions(raw: unknown): DebriefQuestion[] | null {
  const root = (raw ?? {}) as Record<string, unknown>;
  const list = root.questions;
  if (!Array.isArray(list) || list.length < 2) return null;

  const out: DebriefQuestion[] = [];
  for (const [i, item] of list.entries()) {
    const q = (item ?? {}) as Record<string, unknown>;
    const text = str(q.question, 120);
    if (!text) return null;
    if (!Array.isArray(q.options)) return null;

    const options = q.options
      .map((o) => str(o, 60))
      .filter((o): o is string => o !== null);
    if (options.length < 2 || options.length > 4) return null;

    out.push({ id: `q${i + 1}`, question: text, options });
  }
  return out.slice(0, 3);
}

export function parseVerdict(raw: unknown): DebriefVerdict | null {
  const root = (raw ?? {}) as Record<string, unknown>;
  const rank = str(root.rank, 16);
  const line = str(root.line, 160);
  const note = str(root.note, 160);
  if (!rank || !line || !note) return null;

  // Uppercased here rather than in CSS so the screen-reader text and the string
  // the model produced agree with what is displayed.
  return { rank: rank.toUpperCase(), line, note };
}

/**
 * Pull a JSON object out of a model response.
 *
 * Necessary rather than defensive: even with a JSON response format requested, a
 * model will sometimes wrap the object in a fenced code block. Extracting the
 * outermost braces handles that without loosening validation — whatever comes out
 * still has to pass the parsers above.
 */
export function extractJson(text: string): unknown | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}
