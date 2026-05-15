// Resume rewrite â€” produces an honest, tailored plain-text resume.
//
// The function takes the candidate's resume, the job posting, the
// AnalysisResult, and the candidate's follow-up answers. It builds a
// deterministic ResumeStrategy first (positioning subtitles + surfaced
// skills), then asks the LLM to apply the rewrite. The strategy is
// passed into the prompt so the model has concrete guidance instead of
// inventing positioning from scratch.

import { callLlm } from "../llm";
import { buildResumeStrategy } from "../analysis/buildResumeStrategy";
import { sanitizeGeneratedText } from "../sanitizeGeneratedText";
import { enforceAnsweredEvidenceInResume } from "../analysis/answerTransform";
import {
  consolidateOverlappingSameCompanyRoles,
  removeUnsupportedResumeDates
} from "../generatedOutputIntegrity";
import {
  validateGeneratedOutput,
  validationRepairInstruction
} from "../validateGeneratedOutput";
import {
  REWRITE_SYSTEM,
  buildRewriteUserPrompt
} from "../prompts/rewritePrompt";
import type {
  AnalysisResult,
  FollowUp,
  ResumeStrategy
} from "../types";
import type { WritingLocale } from "../writingLocale";

export interface RewriteResumeArgs {
  resumeText: string;
  jobPostText: string;
  analysis: AnalysisResult;
  followUps: FollowUp[];
  writingLocale?: WritingLocale;
  timeoutMs?: number;
}

export interface RewriteResumeResult {
  resume: string;
  strategy: ResumeStrategy;
}

export async function rewriteResume(
  args: RewriteResumeArgs
): Promise<RewriteResumeResult> {
  const strategy = buildResumeStrategy({
    requirements: args.analysis.requirements,
    evidence: args.analysis.evidence,
    matches: args.analysis.matches
  });

  const resume = await callLlm({
    system: REWRITE_SYSTEM,
    user: buildRewriteUserPrompt({
      resumeText: args.resumeText,
      jobPostText: args.jobPostText,
      analysis: args.analysis,
      followUps: args.followUps,
      strategy,
      writingLocale: args.writingLocale
    }),
    maxTokens: 3500,
    temperature: 0.5,
    timeoutMs: args.timeoutMs ?? 90_000,
    tag: "rewrite-resume"
  });

  const validationContext = {
    sourceResumeText: args.resumeText,
    followUps: args.followUps
  };

  const enforced = enforceAnsweredEvidenceInResume({
    resumeText: prepareResumeOutput(resume, validationContext),
    analysis: args.analysis,
    followUps: args.followUps
  });

  let finalResume = validateGeneratedOutput(enforced.resumeText, "resume", validationContext).text;
  const validation = validateGeneratedOutput(finalResume, "resume", validationContext);

  if (!validation.valid) {
    try {
      const repaired = await callLlm({
        system: REWRITE_SYSTEM,
        user: `${validationRepairInstruction("resume", validation.violations)}

CURRENT RESUME
------------
${validation.text}`,
        maxTokens: 3500,
        temperature: 0.2,
        timeoutMs: args.timeoutMs ?? 60_000,
        tag: "rewrite-resume-repair"
      });

      const repairedEnforced = enforceAnsweredEvidenceInResume({
        resumeText: prepareResumeOutput(repaired, validationContext),
        analysis: args.analysis,
        followUps: args.followUps
      });
      finalResume = validateGeneratedOutput(repairedEnforced.resumeText, "resume", validationContext).text;
      const finalValidation = validateGeneratedOutput(finalResume, "resume", validationContext);
      if (!finalValidation.valid) {
        console.warn(
          "[rewrite-resume] Validation issues remain after repair.",
          finalValidation.violations
        );
        finalResume = finalValidation.text;
      }
    } catch (err) {
      console.warn(
        "[rewrite-resume] Validation repair failed; returning sanitized resume.",
        err instanceof Error ? err.message : err
      );
    }
  }

  return { resume: finalResume, strategy };
}

function prepareResumeOutput(
  resumeText: string,
  context: { sourceResumeText: string; followUps: FollowUp[] }
): string {
  return consolidateOverlappingSameCompanyRoles(
    removeUnsupportedResumeDates(sanitizeGeneratedText(resumeText), context)
  );
}

