// POST /api/generate
//
// Body: GenerateRequest â€” { resumeText, jobPostText, analysis, followUps }
// Returns: GenerateResponse â€” { resume, coverLetter, strategy? }
//
// Runs the resume rewrite and cover-letter rewrite in parallel. Both
// follow the honesty rules in prompts/rewritePrompt.ts and
// prompts/coverLetterPrompt.ts â€” no inventing tools, certs, or metrics.

import { NextResponse } from "next/server";
import { z } from "zod";
import { rewriteResume, rewriteCoverLetter } from "@/lib/rewrite";
import { sanitizeGeneratedText } from "@/lib/sanitizeGeneratedText";
import { inferWritingLocaleFromJob } from "@/lib/writingLocale";
import type {
  AnalysisResult,
  FollowUp,
  GenerateResponse
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

// AnalysisResult is large and structured; we accept it as `unknown` and
// trust the client. The pipeline gracefully handles missing fields.
const Body = z.object({
  resumeText: z.string().min(1),
  jobPostText: z.string().min(1),
  analysis: z.unknown(),
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
    .default([]),
  writingLocale: z.enum(["us_english", "canadian_uk_english"]).optional()
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

  const analysis = parsed.analysis as AnalysisResult;
  const followUps = parsed.followUps as FollowUp[];
  const writingLocale =
    parsed.writingLocale ??
    analysis.writingLocale ??
    inferWritingLocaleFromJob(parsed.jobPostText);

  try {
    const [resumeOut, coverLetter] = await Promise.all([
      rewriteResume({
        resumeText: parsed.resumeText,
        jobPostText: parsed.jobPostText,
        analysis,
        followUps,
        writingLocale
      }),
      rewriteCoverLetter({
        resumeText: parsed.resumeText,
        jobPostText: parsed.jobPostText,
        analysis,
        followUps,
        writingLocale
      })
    ]);

    const body: GenerateResponse = {
      resume: sanitizeGeneratedText(resumeOut.resume),
      coverLetter: sanitizeGeneratedText(coverLetter),
      strategy: resumeOut.strategy
    };
    console.info(
      `[generate] ms=${Date.now() - tStart} resumeLen=${resumeOut.resume.length} coverLen=${coverLetter.length}`
    );
    return NextResponse.json(body);
  } catch (err) {
    console.error("[generate] failed", err);
    return NextResponse.json(
      { error: "Generation failed.", detail: errMsg(err) },
      { status: isTemporaryProviderIssue(err) ? 503 : 500 }
    );
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isTemporaryProviderIssue(err: unknown): boolean {
  const anyErr = err as {
    status?: number;
    error?: { type?: string; message?: string };
    name?: string;
    message?: string;
  };
  const haystack = [
    anyErr?.status,
    anyErr?.error?.type,
    anyErr?.error?.message,
    anyErr?.name,
    anyErr?.message,
    errMsg(err)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /\b529\b|overloaded_error|rate.?limit|timeout|aborterror|temporar(?:y|ily)|unavailable/.test(
    haystack
  );
}

