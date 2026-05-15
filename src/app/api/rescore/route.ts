// POST /api/rescore
//
// Body: RescoreRequest — { resumeText (tailored), jobPostText, baseline,
// followUps }
// Returns: RescoreResponse — { analysis }
//
// Re-runs analyze() on the tailored resume so the Results screen can show
// the before → after match score. Calls the same pipeline as /api/analyze
// — the JD has not changed, so the requirements should come out
// equivalent, but the matches will reflect the tailoring.

import { NextResponse } from "next/server";
import { z } from "zod";
import { analyze } from "@/lib/analysis";
import {
  applyAnsweredContextToAnalysis,
  followUpsToAnswers
} from "@/lib/analysis/applyAnsweredContext";
import { fastRescoreWithExistingRequirements } from "@/lib/analysis/fastRescore";
import { elapsedMs, logDevTiming, nowMs } from "@/lib/utils/perf";
import type { AnalysisResult, FollowUp, RescoreResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({
  resumeText: z.string().min(1),
  jobPostText: z.string().min(1),
  // baseline + followUps are accepted for forward-compatibility but we
  // don't currently feed them into the rescore path — analyze() is fully
  // self-contained. Present so the UI can pass everything it has.
  baseline: z.unknown().optional(),
  followUps: z
    .array(
      z.object({
        id: z.string(),
        requirementId: z.string(),
        question: z.string(),
        answer: z.string().default(""),
        alternativeTools: z.array(z.string()).optional()
      })
    )
    .default([])
});

export async function POST(req: Request) {
  const tStart = nowMs();
  let parsed;
  try {
    const raw = await req.json();
    const safe = Body.safeParse(raw);
    if (!safe.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: safe.error.issues },
        { status: 400 }
      );
    }
    parsed = safe.data;
  } catch (err) {
    return NextResponse.json(
      { error: "Could not read request body.", detail: errMsg(err) },
      { status: 400 }
    );
  }

  try {
    const baseline = parsed.baseline as AnalysisResult | undefined;
    const rawAnalysis = baseline
      ? fastRescoreWithExistingRequirements({
          resumeText: parsed.resumeText,
          baseline
        })
      : await analyze({
          resumeText: parsed.resumeText,
          jobPostText: parsed.jobPostText
        });
    logDevTiming("rescore.analysis", {
      mode: baseline ? "fast-baseline" : "full-analyze",
      ms: elapsedMs(tStart),
      claudeCalls: baseline ? 0 : 1,
      reqs: rawAnalysis.requirements.length,
      score: rawAnalysis.score
    });
    if (rawAnalysis.requirements.length === 0) {
      console.warn(
        `[rescore] analyze returned 0 requirements after ${
          elapsedMs(tStart)
        }ms`
      );
      return NextResponse.json(
        {
          error:
            rawAnalysis.fallbackReason ?? "Rescore produced no requirements."
        },
        { status: 502 }
      );
    }
    const followUps = parsed.followUps as FollowUp[];
    const analysis = baseline
      ? applyAnsweredContextToAnalysis({
          analysis: rawAnalysis,
          previousAnalysis: baseline,
          answers: followUpsToAnswers(followUps)
        })
      : rawAnalysis;
    const body: RescoreResponse = { analysis };
    console.info(
      `[rescore] ms=${elapsedMs(tStart)} score=${analysis.score} reqs=${analysis.requirements.length}`
    );
    return NextResponse.json(body);
  } catch (err) {
    console.error("[rescore] failed", err);
    return NextResponse.json(
      { error: "Rescore failed.", detail: errMsg(err) },
      { status: 502 }
    );
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
