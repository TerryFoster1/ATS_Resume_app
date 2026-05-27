import { callLlmStructured } from "./llm";

export type MockInterviewStatus = "not_started" | "in_progress" | "completed";

export type MockInterviewQuestion = {
  id: string;
  category: string;
  question: string;
  whyAsked: string;
  evaluationFocus: string;
};

export type MockInterviewAnswer = {
  questionId: string;
  answer: string;
  createdAt: string;
};

export type MockInterviewFeedbackItem = {
  questionId: string;
  score: number;
  whatWorked: string;
  whatWasMissing: string;
  howToImprove: string;
  strongerFraming: string;
  suggestedSTARStructure: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
};

export type MockInterviewFeedback = {
  overallScore: number;
  readinessLevel: string;
  strengths: string[];
  risks: string[];
  perQuestionFeedback: MockInterviewFeedbackItem[];
  finalRecommendations: string[];
};

export type MockInterviewState = {
  status: MockInterviewStatus;
  questions: MockInterviewQuestion[];
  answers: MockInterviewAnswer[];
  feedback?: MockInterviewFeedback;
  startedAt?: string;
  completedAt?: string;
};

export type MockInterviewContext = {
  jobDescription: string;
  tailoredResume: string;
  coverLetter: string;
  clarificationAnswers?: unknown;
  interviewPrep?: string | null;
};

export async function generateMockInterviewQuestions(
  context: MockInterviewContext
): Promise<MockInterviewQuestion[]> {
  const result = await callLlmStructured<{ questions: Omit<MockInterviewQuestion, "id">[] }>(
    {
      tag: "mock-interview-questions",
      maxTokens: 2600,
      temperature: 0.35,
      timeoutMs: 90000,
      system: [
        "You are a recruiter and hiring-manager interview coach for Career Ladder.",
        "Create a focused mock interview based only on the saved role context and available application materials.",
        "Questions must be specific, recruiter-realistic, and useful for practice.",
        "Prioritize questions a real recruiter would ask to test fit, proof, risk, communication, motivation, and role-specific judgment.",
        "When the candidate appears to be transitioning fields, ask fair questions that let them translate adjacent experience without pretending it is direct experience.",
        "Do not invent experience, tools, employers, credentials, metrics, or dates.",
        "If no resume or cover letter is available, ask role-based questions and evaluate the user's answers against the posting rather than assumed background.",
        "If a skill gap is likely, ask about it honestly without sounding punitive.",
        "Use clear professional language. Do not use em dashes."
      ].join("\n"),
      user: `Create 8 mock interview questions for this saved application.

Include a mix of:
- recruiter screen
- tell me about yourself
- why this role or company
- walk me through your experience
- behavioural
- role-specific
- technical or operational, if relevant
- gap or risk area
- follow-up pressure test on a weak or missing area
- evidence question about outcomes, tools, handoffs, customers, stakeholders, or metrics

For each question include:
- category
- question
- whyAsked
- evaluationFocus

Rules:
- Make each whyAsked explain the hiring-manager concern behind the question.
- Make each evaluationFocus name the proof the user should provide.
- Avoid generic questions that could fit any job posting.
- If the role involves customer success, account management, operations, marketing, project coordination, or a career transition, test transferable evidence directly.

JOB DESCRIPTION
${clip(context.jobDescription, 6000)}

TAILORED RESUME
${clip(context.tailoredResume || "No tailored resume has been provided yet.", 6000)}

COVER LETTER
${clip(context.coverLetter || "No cover letter has been provided yet.", 3500)}

CLARIFICATION ANSWERS
${clip(formatAnswers(context.clarificationAnswers), 2500)}

EXISTING INTERVIEW PREP
${clip(context.interviewPrep ?? "No interview prep has been generated yet.", 4500)}`
    },
    {
      toolName: "create_mock_interview_questions",
      description: "Create recruiter-style mock interview questions.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["questions"],
        properties: {
          questions: {
            type: "array",
            minItems: 6,
            maxItems: 10,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["category", "question", "whyAsked", "evaluationFocus"],
              properties: {
                category: { type: "string" },
                question: { type: "string" },
                whyAsked: { type: "string" },
                evaluationFocus: { type: "string" }
              }
            }
          }
        }
      }
    }
  );

  return result.questions.slice(0, 10).map((question, index) => ({
    id: `q${index + 1}`,
    category: clean(question.category),
    question: clean(question.question),
    whyAsked: clean(question.whyAsked),
    evaluationFocus: clean(question.evaluationFocus)
  }));
}

export async function evaluateMockInterview(args: {
  context: MockInterviewContext;
  questions: MockInterviewQuestion[];
  answers: MockInterviewAnswer[];
}): Promise<MockInterviewFeedback> {
  return callLlmStructured<MockInterviewFeedback>(
    {
      tag: "mock-interview-feedback",
      maxTokens: 4200,
      temperature: 0.25,
      timeoutMs: 120000,
      system: [
        "You are a constructive recruiter-style mock interview evaluator for Career Ladder.",
        "Evaluate answer quality, clarity, relevance, proof, role connection, and positioning.",
        "Be honest, tactical, and specific. Do not be generic or overly encouraging.",
        "Explain how a recruiter or hiring manager would likely interpret each answer.",
        "Separate credible transferable framing from overclaiming. Reward honest adjacent experience when it is connected to the role clearly.",
        "Do not invent experience, tools, employers, credentials, metrics, or dates.",
        "If an answer is weak or vague, explain exactly what proof or framing is missing.",
        "Use clear professional language. Do not use em dashes."
      ].join("\n"),
      user: `Evaluate this completed mock interview.

Return:
- overallScore from 0 to 100
- readinessLevel in plain English
- strengths
- risks
- per-question feedback
- final recommendations

For every per-question item, include:
- score from 0 to 100
- whatWorked
- whatWasMissing
- howToImprove
- strongerFraming
- suggestedSTARStructure with Situation, Task, Action, Result guidance

Evaluation rules:
- If the answer does not directly answer the question, say so plainly.
- If the answer lacks proof, name the missing proof type, such as metric, customer example, stakeholder context, tool ownership, decision made, tradeoff, or outcome.
- Stronger framing should sound like realistic interview coaching, not a polished script.
- Final recommendations should prioritize the 3 to 5 highest-impact practice moves before the real interview.

JOB DESCRIPTION
${clip(args.context.jobDescription, 6000)}

TAILORED RESUME
${clip(args.context.tailoredResume || "No tailored resume has been provided yet.", 6000)}

COVER LETTER
${clip(args.context.coverLetter || "No cover letter has been provided yet.", 3500)}

QUESTIONS AND ANSWERS
${args.questions
  .map((question) => {
    const answer = args.answers.find((item) => item.questionId === question.id);
    return [
      `ID: ${question.id}`,
      `Category: ${question.category}`,
      `Question: ${question.question}`,
      `Evaluation focus: ${question.evaluationFocus}`,
      `Answer: ${answer?.answer?.trim() || "[No answer provided]"}`
    ].join("\n");
  })
  .join("\n\n")}`
    },
    {
      toolName: "evaluate_mock_interview",
      description: "Evaluate a completed recruiter-style mock interview.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: [
          "overallScore",
          "readinessLevel",
          "strengths",
          "risks",
          "perQuestionFeedback",
          "finalRecommendations"
        ],
        properties: {
          overallScore: { type: "number", minimum: 0, maximum: 100 },
          readinessLevel: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          risks: { type: "array", items: { type: "string" } },
          perQuestionFeedback: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "questionId",
                "score",
                "whatWorked",
                "whatWasMissing",
                "howToImprove",
                "strongerFraming",
                "suggestedSTARStructure"
              ],
              properties: {
                questionId: { type: "string" },
                score: { type: "number", minimum: 0, maximum: 100 },
                whatWorked: { type: "string" },
                whatWasMissing: { type: "string" },
                howToImprove: { type: "string" },
                strongerFraming: { type: "string" },
                suggestedSTARStructure: {
                  type: "object",
                  additionalProperties: false,
                  required: ["situation", "task", "action", "result"],
                  properties: {
                    situation: { type: "string" },
                    task: { type: "string" },
                    action: { type: "string" },
                    result: { type: "string" }
                  }
                }
              }
            }
          },
          finalRecommendations: { type: "array", items: { type: "string" } }
        }
      }
    }
  );
}

export function readMockInterview(snapshot: unknown): MockInterviewState | null {
  if (!isRecord(snapshot) || !isRecord(snapshot.mockInterview)) return null;
  const value = snapshot.mockInterview;
  const questions = Array.isArray(value.questions)
    ? value.questions.filter(isQuestion)
    : [];
  const answers = Array.isArray(value.answers)
    ? value.answers.filter(isAnswer)
    : [];
  const status =
    value.status === "in_progress" || value.status === "completed"
      ? value.status
      : questions.length
        ? "in_progress"
        : "not_started";
  return {
    status,
    questions,
    answers,
    feedback: isFeedback(value.feedback) ? value.feedback : undefined,
    startedAt: typeof value.startedAt === "string" ? value.startedAt : undefined,
    completedAt: typeof value.completedAt === "string" ? value.completedAt : undefined
  };
}

function isQuestion(value: unknown): value is MockInterviewQuestion {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.category === "string" &&
    typeof value.question === "string" &&
    typeof value.whyAsked === "string" &&
    typeof value.evaluationFocus === "string"
  );
}

function isAnswer(value: unknown): value is MockInterviewAnswer {
  return (
    isRecord(value) &&
    typeof value.questionId === "string" &&
    typeof value.answer === "string" &&
    typeof value.createdAt === "string"
  );
}

function isFeedback(value: unknown): value is MockInterviewFeedback {
  return (
    isRecord(value) &&
    typeof value.overallScore === "number" &&
    typeof value.readinessLevel === "string" &&
    Array.isArray(value.strengths) &&
    Array.isArray(value.risks) &&
    Array.isArray(value.perQuestionFeedback) &&
    Array.isArray(value.finalRecommendations)
  );
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
  return `${text.slice(0, max)}\n[Truncated for mock interview]`;
}

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
