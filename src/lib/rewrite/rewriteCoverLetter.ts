// Cover letter rewrite â€” short, evidence-driven, no fabrication.

import { callLlm } from "../llm";
import { sanitizeGeneratedText } from "../sanitizeGeneratedText";
import { candidateNameFromResume } from "../generatedOutputIntegrity";
import {
  validateGeneratedOutput,
  validationRepairInstruction
} from "../validateGeneratedOutput";
import {
  COVER_LETTER_SYSTEM,
  buildCoverLetterUserPrompt
} from "../prompts/coverLetterPrompt";
import type { AnalysisResult, FollowUp } from "../types";
import type { WritingLocale } from "../writingLocale";

export interface RewriteCoverLetterArgs {
  resumeText: string;
  jobPostText: string;
  analysis: AnalysisResult;
  followUps: FollowUp[];
  writingLocale?: WritingLocale;
  generationContext?: string;
  timeoutMs?: number;
}

export async function rewriteCoverLetter(
  args: RewriteCoverLetterArgs
): Promise<string> {
  const validationContext = {
    sourceResumeText: args.resumeText,
    followUps: args.followUps,
    candidateName: candidateNameFromResume(args.resumeText)
  };

  const text = await callLlm({
    system: COVER_LETTER_SYSTEM,
    user: buildCoverLetterUserPrompt({
      resumeText: args.resumeText,
      jobPostText: args.jobPostText,
      analysis: args.analysis,
      followUps: args.followUps,
      writingLocale: args.writingLocale,
      generationContext: args.generationContext
    }),
    maxTokens: 1200,
    temperature: 0.6,
    timeoutMs: args.timeoutMs ?? 60_000,
    tag: "rewrite-cover-letter"
  });

  const validation = validateGeneratedOutput(text, "coverLetter", validationContext);
  if (validation.valid) {
    return validation.text;
  }

  try {
    const repaired = await callLlm({
      system: COVER_LETTER_SYSTEM,
      user: `${validationRepairInstruction("coverLetter", validation.violations)}

CURRENT COVER LETTER
------------
${validation.text}`,
      maxTokens: 1200,
      temperature: 0.2,
      timeoutMs: args.timeoutMs ?? 45_000,
      tag: "rewrite-cover-letter-repair"
    });
    const finalValidation = validateGeneratedOutput(repaired, "coverLetter", validationContext);
    if (!finalValidation.valid) {
      console.warn(
        "[rewrite-cover-letter] Validation issues remain after repair.",
        finalValidation.violations
      );
    }
    return finalValidation.text;
  } catch (err) {
    console.warn(
      "[rewrite-cover-letter] Validation repair failed; returning sanitized cover letter.",
      err instanceof Error ? err.message : err
    );
    return sanitizeGeneratedText(validation.text);
  }
}



