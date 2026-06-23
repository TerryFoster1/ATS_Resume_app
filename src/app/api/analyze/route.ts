// POST /api/analyze
//
// Body: { resumeText, jobPostText }
// Returns: AnalyzeResponse — the full AnalysisResult (requirements,
// evidence, matches, buckets, follow-ups, score).

import { NextResponse } from "next/server";
import { z } from "zod";
import { analyze } from "@/lib/analysis";
import { buildCareerGenerationContext } from "@/lib/careerGenerationContextStorage";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { elapsedMs, logDevTiming, nowMs } from "@/lib/utils/perf";
import type { AnalyzeResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({
  resumeText: z.string().min(1, "resumeText is required"),
  jobPostText: z.string().min(1, "jobPostText is required")
});

export async function POST(req: Request) {
  const started = nowMs();
  let parsed;
  try {
    const parseStarted = nowMs();
    const raw = await req.json();
    const safe = Body.safeParse(raw);
    if (!safe.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: safe.error.issues },
        { status: 400 }
      );
    }
    parsed = safe.data;
    logDevTiming("route.analyze.parse", {
      ms: elapsedMs(parseStarted),
      resumeChars: parsed.resumeText.length,
      jobChars: parsed.jobPostText.length
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Could not read request body.", detail: errMsg(err) },
      { status: 400 }
    );
  }

  try {
    const context = await buildCareerGenerationContext({
      userId: await currentUserId(),
      workflowType: "resume",
      uploadedResumeFallback: parsed.resumeText,
      jobDescription: parsed.jobPostText
    });
    const analysis = await analyze({
      resumeText: context.candidateContextText || parsed.resumeText,
      jobPostText: parsed.jobPostText
    });
    const body: AnalyzeResponse = { analysis };
    logDevTiming("route.analyze.total", {
      ms: elapsedMs(started),
      score: analysis.score,
      reqs: analysis.requirements.length,
      followUps: analysis.followUps.length,
      usedProfile: context.usedMasterProfile
    });
    return NextResponse.json(body);
  } catch (err) {
    console.error("[analyze] request failed", err);
    return NextResponse.json(
      { error: "Analysis failed.", detail: errMsg(err) },
      { status: 500 }
    );
  }
}

async function currentUserId(): Promise<string | null> {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user }
    } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    return user && user.is_anonymous !== true && user.email ? user.id : null;
  } catch {
    return null;
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
