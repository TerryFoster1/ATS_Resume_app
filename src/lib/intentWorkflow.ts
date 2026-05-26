export type JobIntent =
  | "resume"
  | "resumeCoverLetter"
  | "interviewPrep"
  | "mockInterview"
  | "skillGap";

export type JobContext = {
  targetRole: string;
  companyName?: string;
  jobPosting?: string;
};

export const INTENT_JOB_CONTEXT_KEY = "career-ladder:intent-job-context";

export function composeJobContextText(context: JobContext) {
  const lines = [
    context.targetRole.trim() ? `Job title: ${context.targetRole.trim()}` : "",
    context.companyName?.trim() ? `Company: ${context.companyName.trim()}` : "",
    context.jobPosting?.trim()
      ? ["", "Job posting:", context.jobPosting.trim()].join("\n")
      : ""
  ].filter(Boolean);

  return lines.join("\n");
}

export function readJobContextFromText(value: string): JobContext {
  const lines = value.split(/\r?\n/);
  const targetRole =
    lines
      .map((line) => line.match(/^job\s*title\s*:\s*(.+)$/i)?.[1]?.trim())
      .find(Boolean) ?? "";
  const companyName =
    lines
      .map((line) => line.match(/^company\s*:\s*(.+)$/i)?.[1]?.trim())
      .find(Boolean) ?? "";
  const postingIndex = lines.findIndex((line) => /^job posting\s*:?\s*$/i.test(line.trim()));
  const jobPosting =
    postingIndex >= 0
      ? lines.slice(postingIndex + 1).join("\n").trim()
      : value.trim();

  return {
    targetRole,
    companyName,
    jobPosting: jobPosting && jobPosting !== value.trim() ? jobPosting : undefined
  };
}
