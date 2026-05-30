import { callLlm } from "./llm";
import { sanitizeGeneratedText } from "./sanitizeGeneratedText";
import {
  extractTransferableSkillProfile,
  formatTransferableExtractionForPrompt
} from "./transferableSkillExtraction";

export type InterviewPrepInput = {
  jobDescription: string;
  tailoredResume: string;
  coverLetter: string;
  clarificationAnswers?: unknown;
};

export async function generateInterviewPrep(input: InterviewPrepInput) {
  const extraction = extractTransferableSkillProfile(
    `${input.tailoredResume}\n${input.coverLetter}\n${formatAnswers(input.clarificationAnswers)}`,
    input.jobDescription
  );
  const text = await callLlm({
    tag: "interview-prep",
    maxTokens: 3200,
    temperature: 0.35,
    timeoutMs: 90000,
    system: [
      "You are a recruiter-style interview coach for Career Ladder.",
      "Generate practical interview prep from the available role context and application materials.",
      "Be specific to the role, posting, and any candidate evidence that is available.",
      "Reason like a recruiter preparing a screening conversation: identify what the hiring team is trying to prove, what they may doubt, and what evidence would reduce that concern.",
      "Use the transferable-skill extraction to identify explicit skills, inferred professional functions, likely recruiter concerns, and evidence the candidate should prepare.",
      "Translate adjacent experience into hiring language when it is credible. For example, retail leadership can support customer success, hospitality can support operations, journalism can support marketing, service work can support account management, and trades can support project coordination.",
      "Do not invent experience, metrics, employers, tools, credentials, or dates.",
      "If no resume or cover letter is available, create role-based prep and clearly frame candidate-specific examples as stories to prepare, not proven facts.",
      "If a hard skill or platform is weak or missing, frame it as an honest preparation area.",
      "Use plain professional language. Avoid hype, generic motivation, and AI cliches.",
      "Do not use em dashes."
    ].join("\n"),
    user: `JOB DESCRIPTION
${clip(input.jobDescription, 6000)}

TAILORED RESUME
${clip(input.tailoredResume || "No tailored resume has been provided yet.", 6000)}

COVER LETTER
${clip(input.coverLetter || "No cover letter has been provided yet.", 3500)}

CLARIFICATION ANSWERS
${clip(formatAnswers(input.clarificationAnswers), 2500)}

TRANSFERABLE SKILL EXTRACTION
${clip(formatTransferableExtractionForPrompt(extraction), 3500)}

Create interview prep in this exact markdown structure. Keep it tactical, skimmable, and specific to this candidate and role:

# Recruiter-Style Interview Prep

## Most Likely to Appear
1. Question:
   Why likely:
   What they are evaluating:
   How to position your experience:
   Likely follow-up:

Include 3 to 5 high-probability questions.

## Screening Questions
1. Question:
   What they are evaluating:
   How to position your experience:

Include 3 to 4 questions.

## Behavioural Questions
1. Question:
   Situation:
   Task:
   Action:
   Result:

Include 3 to 4 questions. Each STAR line must be concise and based on real evidence from the resume, cover letter, or clarification answers.

## Role-Specific Questions
1. Question:
   What they are evaluating:
   How to position your experience:

Include 3 to 4 questions tied directly to the posting.

## Technical or Operational Questions
1. Question:
   What they are evaluating:
   How to position your experience:

Include 2 to 3 questions if relevant. If the role has no technical or operational focus, write 2 practical process, tools, reporting, workflow, or collaboration questions.

## Weak-Area Prep
- 3 to 5 honest preparation notes. Name likely gaps, proof risks, terminology gaps, or platform ownership gaps without sounding discouraging.
- Include at least one note about how to position adjacent or transferable experience if the candidate is not a direct match.
- Include at least one note about what a recruiter may hesitate over and what evidence would reduce that hesitation.

## What to Prepare Before the Interview
- 4 to 6 concrete prep actions, such as examples to choose, metrics to review, tools to clarify, or stories to rehearse.

## Strong Closing Points
- 3 concise points the candidate can reinforce at the end of the interview.

Rules:
- Do not include generic advice that could fit any candidate.
- Do not overclaim missing tools, platforms, metrics, credentials, or dates.
- If resume or cover letter context is absent, focus on role expectations, likely evaluation areas, and examples the user should prepare.
- If direct platform ownership is weak, recommend adjacent positioning clearly.
- Prefer precise recruiter language such as account ownership, stakeholder communication, retention, reporting, prioritization, service recovery, workflow handoff, or operational follow-through when supported by the context.
- Avoid repetitive STAR wording. Use STAR only when it helps the user choose a concrete story.
- Keep every answer easy to read on mobile.
- Avoid em dashes.`
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
