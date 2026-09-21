import { NextResponse } from "next/server";
import {
  extractJson,
  parseQuestions,
  parseVerdict,
  questionsMessages,
  sanitiseMission,
  sanitiseReport,
  verdictMessages,
  type DebriefQuestion,
  type DebriefScoreish,
} from "@/lib/debrief";

/**
 * THE AI DEBRIEF — the model call.
 *
 * Sits behind the mission result and writes the player a short debrief about the
 * scene they just directed. Two shapes of request: `questions` to start it, and
 * `verdict` once the player has answered.
 *
 * Three decisions worth stating, because they are the difference between a
 * feature and a liability in a judged demo:
 *
 * 1. NOTHING HERE IS ON THE CRITICAL PATH. The result screen renders, scores and
 *    navigates with no key configured, with the request in flight, and with the
 *    request failed. The client hides the panel on any failure. A demo whose core
 *    loop depends on a network call is a demo that dies on venue wifi.
 *
 * 2. THE KEY NEVER LEAVES THE SERVER. It is read from the environment inside this
 *    handler; the client sends only mission text and numbers. There is
 *    deliberately no `NEXT_PUBLIC_` variant, and the key is never echoed in an
 *    error body.
 *
 * 3. THE MODEL IS TOLD IT CANNOT SEE THE FRAME, and the payload contains no
 *    image. It reasons about the mission and the measurements. That keeps the
 *    prompt small and fast, and it keeps the panel honest — a debrief written
 *    from the numbers is a real thing; one that pretends to have looked at the
 *    picture is a lie the rest of this product does not tell.
 */

/** Model is configurable so the demo can be repointed without a code change. */
const MODEL = process.env.AI_DEBRIEF_MODEL ?? "google/gemini-2.5-flash";
const BASE = (process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");

/** Budget: the panel appears after the result beat, so this is the ceiling on how
 *  long it can still be useful. Past it the client has already hidden itself. */
const TIMEOUT_MS = 20_000;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    // Never cached: the response is specific to one frame's measurements.
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    // 501 rather than 500: this is "not configured", not "something broke". The
    // client treats both as "hide the panel", but the distinction is what makes
    // the server log honest.
    return json({ error: "not_configured" }, 501);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  const kind = body.kind === "verdict" ? "verdict" : body.kind === "questions" ? "questions" : null;
  if (!kind) return json({ error: "bad_request" }, 400);

  const mission = sanitiseMission(body.mission);
  const report = sanitiseReport(body.report);
  const verdict = typeof body.verdict === "string" ? body.verdict.slice(0, 40) : null;
  const score = sanitiseScore(body.score);

  const messages =
    kind === "questions"
      ? questionsMessages(mission, report, verdict, score)
      : verdictMessages(
          mission,
          report,
          verdict,
          score,
          sanitiseQuestions(body.questions),
          sanitiseAnswers(body.answers),
        );

  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        // OpenRouter attributes traffic with these. Both optional, and stated
        // rather than left implicit so it is clear what leaves the server: the
        // project's own name, and nothing else.
        "X-Title": "Vice Cut",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.8,
        max_tokens: 600,
        // Requested, and then not trusted: `extractJson` below still handles a
        // fenced or chatty response, because not every backend honours this.
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      // Status only. The upstream body can echo request details, and this route
      // is public, so it does not get passed through to the client.
      console.error(`[debrief] upstream ${res.status}`);
      return json({ error: "upstream", status: res.status }, 502);
    }

    const payload = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = payload.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(text);

    if (kind === "questions") {
      const questions = parseQuestions(parsed);
      if (!questions) {
        console.error("[debrief] unusable questions payload");
        return json({ error: "unusable" }, 502);
      }
      return json({ questions });
    }

    const result = parseVerdict(parsed);
    if (!result) {
      console.error("[debrief] unusable verdict payload");
      return json({ error: "unusable" }, 502);
    }
    return json({ verdict: result });
  } catch (err) {
    // Covers the abort (timeout), DNS failure and a dropped connection. All of
    // them mean the same thing to the client: no debrief this time.
    const aborted = err instanceof Error && err.name === "TimeoutError";
    console.error(`[debrief] ${aborted ? "timeout" : "request failed"}`);
    return json({ error: aborted ? "timeout" : "unreachable" }, 504);
  }
}

function sanitiseScore(raw: unknown): DebriefScoreish | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const n = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : null;
  const framing = n(s.framing);
  const composition = n(s.composition);
  const control = n(s.control);
  const final = n(s.final);
  if (framing === null || composition === null || control === null || final === null) return null;
  return { framing, composition, control, final };
}

/** Answers and questions come back from the client, so both are re-shaped. */
function sanitiseQuestions(raw: unknown): DebriefQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: DebriefQuestion[] = [];
  for (const item of raw.slice(0, 3)) {
    const q = (item ?? {}) as Record<string, unknown>;
    if (typeof q.question !== "string") continue;
    const options = Array.isArray(q.options)
      ? q.options.filter((o): o is string => typeof o === "string").slice(0, 4)
      : [];
    out.push({
      id: typeof q.id === "string" ? q.id.slice(0, 8) : `q${out.length + 1}`,
      question: q.question.slice(0, 120),
      options: options.map((o) => o.slice(0, 60)),
    });
  }
  return out;
}

function sanitiseAnswers(raw: unknown): { id: string; answer: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 3)
    .map((item) => {
      const a = (item ?? {}) as Record<string, unknown>;
      if (typeof a.id !== "string" || typeof a.answer !== "string") return null;
      return { id: a.id.slice(0, 8), answer: a.answer.slice(0, 60) };
    })
    .filter((a): a is { id: string; answer: string } => a !== null);
}
