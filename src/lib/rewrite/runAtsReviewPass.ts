// ATS review pass. Two phases:
//
// Current status: this is a standalone/server-side cleanup helper, not the
// normal generation path. The active UI flow calls /api/generate, then /api/check,
// and may regenerate once with deterministic ATS feedback from StepGenerate.
// Keep this helper for future server-side consolidation unless that flow is
// intentionally rewired.
//
//   1. Run the deterministic atsChecker rules. This produces the rule-by-
//      rule report the UI shows.
//   2. Ask the LLM to do a final cleanup of the tailored resume, fixing
//      anything the rule check flagged. Honesty rules apply, so this is
//      purely formatting, structure, and tightening.
//
// Returns BOTH the cleaned resume and the post-cleanup rule report so the
// caller can see the score lift directly.

import { callLlm } from "../llm";
import { runAtsChecks } from "../atsChecker";
import { deriveJdKeywords } from "../jdKeywords";
import { sanitizeGeneratedText } from "../sanitizeGeneratedText";
import {
  validateGeneratedOutput,
  validationRepairInstruction
} from "../validateGeneratedOutput";
import {
  ATS_REVIEW_SYSTEM,
  buildAtsReviewUserPrompt
} from "../prompts/atsReviewPrompt";
import type {
  AnalysisResult,
  AtsRuleResult
} from "../types";

export interface RunAtsReviewArgs {
  tailoredResume: string;
  tailoredCoverLetter: string;
  analysis: AnalysisResult;
  // If true, skip the LLM cleanup pass (used for fast unit-test paths and
  // for the standalone /api/check endpoint that just wants a report).
  skipLlmCleanup?: boolean;
  timeoutMs?: number;
}

export interface RunAtsReviewResult {
  cleanedResume: string;
  cleanedCoverLetter: string;
  report: AtsRuleResult[];
  passed: boolean;
}

export async function runAtsReviewPass(
  args: RunAtsReviewArgs
): Promise<RunAtsReviewResult> {
  const jdKeywords = deriveJdKeywords(args.analysis.requirements);
  const inputResume = sanitizeGeneratedText(args.tailoredResume);
  const inputCoverLetter = sanitizeGeneratedText(args.tailoredCoverLetter);

  const initialReport = runAtsChecks({
    resume: inputResume,
    coverLetter: inputCoverLetter,
    jdKeywords
  });

  if (args.skipLlmCleanup) {
    return {
      cleanedResume: validateGeneratedOutput(inputResume, "resume").text,
      cleanedCoverLetter: validateGeneratedOutput(inputCoverLetter, "coverLetter").text,
      report: initialReport,
      passed: allPassed(initialReport)
    };
  }

  let cleanedResume = inputResume;
  try {
    cleanedResume = (
      await callLlm({
        system: ATS_REVIEW_SYSTEM,
        user: buildAtsReviewUserPrompt({
          tailoredResume: inputResume,
          rulesReport: initialReport
        }),
        maxTokens: 3500,
        temperature: 0.2,
        timeoutMs: args.timeoutMs ?? 60_000,
        tag: "ats-review"
      })
    ).trim();
  } catch (err) {
    console.warn(
      "[ats-review] LLM cleanup failed; returning original resume.",
      err instanceof Error ? err.message : err
    );
    cleanedResume = inputResume;
  }

  let validatedResume = validateGeneratedOutput(cleanedResume, "resume");
  if (!validatedResume.valid) {
    try {
      const repaired = await callLlm({
        system: ATS_REVIEW_SYSTEM,
        user: `${validationRepairInstruction("resume", validatedResume.violations)}

CURRENT RESUME
------------
${validatedResume.text}`,
        maxTokens: 3500,
        temperature: 0.2,
        timeoutMs: args.timeoutMs ?? 60_000,
        tag: "ats-review-validation-repair"
      });
      validatedResume = validateGeneratedOutput(repaired, "resume");
    } catch (err) {
      console.warn(
        "[ats-review] Validation repair failed; using sanitized cleanup.",
        err instanceof Error ? err.message : err
      );
    }
  }

  const validatedCoverLetter = validateGeneratedOutput(inputCoverLetter, "coverLetter");
  const finalReport = runAtsChecks({
    resume: validatedResume.text,
    coverLetter: validatedCoverLetter.text,
    jdKeywords
  });

  return {
    cleanedResume: validatedResume.text,
    cleanedCoverLetter: validatedCoverLetter.text,
    report: finalReport,
    passed: allPassed(finalReport)
  };
}

function allPassed(report: AtsRuleResult[]): boolean {
  return report.length > 0 && report.every((r) => r.passed);
}
