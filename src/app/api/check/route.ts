// POST /api/check
//
// Body: CheckRequest — { resume, coverLetter, jobPostText }
// Returns: CheckResponse — { report, passed }
//
// Runs the deterministic ATS rules. We re-derive jdKeywords from a quick
// analyze() pass if jobPostText is provided so the keyword-coverage rule
// has structured input rather than asking the user to maintain it
// separately. If jobPostText is empty we run with empty keywords (the
// other 8 rules still produce meaningful output).

import { NextResponse } from "next/server";
import { z } from "zod";
import { allPassed, runAtsChecks } from "@/lib/atsChecker";
import { analyze } from "@/lib/analysis";
import { deriveJdKeywords } from "@/lib/jdKeywords";
import type { AnalysisResult, CheckResponse, JdKeywords } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({
  resume: z.string().min(1),
  coverLetter: z.string().min(1),
  jobPostText: z.string().optional(),
  analysis: z.unknown().optional()
});

export async function POST(req: Request) {
  const tStart = Date.now();
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

  let jdKeywords: JdKeywords = { required: [], preferred: [] };
  const suppliedAnalysis = parsed.analysis as AnalysisResult | undefined;
  if (suppliedAnalysis?.requirements?.length) {
    jdKeywords = deriveJdKeywords(suppliedAnalysis.requirements);
  } else if (parsed.jobPostText && parsed.jobPostText.trim().length > 0) {
    try {
      const analysis = await analyze({
        resumeText: parsed.resume,
        jobPostText: parsed.jobPostText
      });
      jdKeywords = deriveJdKeywords(analysis.requirements);
    } catch (err) {
      // Non-fatal — proceed with empty keywords; other rules still run.
      console.warn(
        "[check] derive keywords step failed; running with empty keywords.",
        errMsg(err)
      );
    }
  }

  try {
    const report = runAtsChecks({
      resume: parsed.resume,
      coverLetter: parsed.coverLetter,
      jdKeywords
    });
    const body: CheckResponse = { report, passed: allPassed(report) };
    console.info(
      `[check] ms=${Date.now() - tStart} passed=${body.passed} rules=${report.length}`
    );
    return NextResponse.json(body);
  } catch (err) {
    console.error("[check] runAtsChecks failed", err);
    return NextResponse.json(
      { error: "ATS check failed.", detail: errMsg(err) },
      { status: 500 }
    );
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
