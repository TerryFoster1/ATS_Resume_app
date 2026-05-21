import { callLlm } from "./llm";
import { sanitizeGeneratedText } from "./sanitizeGeneratedText";

export type InterviewPrepInput = {
  jobDescription: string;
  tailoredResume: string;
  coverLetter: string;
  clarificationAnswers?: unknown;
};

export async function generateInterviewPrep(input: InterviewPrepInput) {
  const text = await callLlm({
    tag: "interview-prep",
    maxTokens: 2200,
    temperature: 0.35,
    timeoutMs: 90000,
    system: [
      "You are a recruiter-style interview coach for Career Ladder.",
      "Generate practical interview prep from the candidate's tailored application materials.",
      "Be specific to the role and candidate evidence.",
      "Do not invent experience, metrics, employers, tools, credentials, or dates.",
      "If a hard skill or platform is weak or missing, frame it as an honest preparation area.",
      "Use plain professional language. Avoid hype, generic motivation, and AI cliches.",
      "Do not use em dashes."
    ].join("\n"),
    user: `JOB DESCRIPTION
${clip(input.jobDescription, 6000)}

TAILORED RESUME
${clip(input.tailoredResume, 6000)}

COVER LETTER
${clip(input.coverLetter, 3500)}

CLARIFICATION ANSWERS
${clip(formatAnswers(input.clarificationAnswers), 2500)}

Create interview prep in this exact markdown structure:

# Recruiter-Style Interview Prep

## What to Prepare
- 4 to 6 concise bullets about the strongest areas to prepare, including any honest gaps.

## Likely Screening Questions
1. Question
   Guidance: 1 to 2 sentences on how to answer using the candidate's actual background.

Include 4 questions.

## Behavioural Questions
1. Question
   STAR guidance: Situation, Task, Action, Result guidance in 2 to 3 concise sentences.

Include 4 questions.

## Role-Specific Questions
1. Question
   Guidance: 1 to 2 sentences tied to the job posting.

Include 4 questions.

## Questions About Gaps or Risk Areas
1. Question
   Guidance: explain how to answer honestly without overclaiming.

Include 3 questions.

## Strong Closing Points
- 3 concise points the candidate can reinforce at the end of the interview.`
  });

  return sanitizeGeneratedText(text);
}

function formatAnswers(value: unknown) {
  if (!value) return "No clarification answers were provided.";
  if (Array.isArray(value)) {
    const items = value
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const question = "question" in item && typeof item.question === "string" ? item.question : "";
        const answer = "answer" in item && typeof item.answer === "string" ? item.answer : "";
        return answer ? `Q: ${question}\nA: ${answer}` : "";
      })
      .filter(Boolean);
    return items.length ? items.join("\n\n") : "No clarification answers were provided.";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function clip(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n[Truncated for interview prep generation]`;
}
