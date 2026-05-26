import { NextResponse } from "next/server";
import { consumeCredits, getCreditBalance } from "@/lib/accountStorage";
import {
  evaluateMockInterview,
  generateMockInterviewQuestions,
  readMockInterview,
  type MockInterviewAnswer,
  type MockInterviewState
} from "@/lib/mockInterview";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const access = await getOutputForUser(params.id);
  if ("response" in access) return access.response;
  return NextResponse.json({
    mockInterview: readMockInterview(access.output.analysis_snapshot)
  });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const access = await getOutputForUser(params.id);
  if ("response" in access) return access.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = isRecord(body) && typeof body.action === "string" ? body.action : "";
  if (action === "start") return startInterview(access);
  if (action === "answer") return saveAnswer(access, body);
  if (action === "finish") return finishInterview(access);

  return NextResponse.json({ error: "Unknown interview action." }, { status: 400 });
}

async function startInterview(access: OutputAccess) {
  const existing = readMockInterview(access.output.analysis_snapshot);
  if (existing?.questions.length) {
    return NextResponse.json({ mockInterview: existing, alreadyStarted: true });
  }

  const credits = await getCreditBalance(access.userId);
  if (credits < 1) {
    return NextResponse.json(
      { error: "Not enough credits to start a mock interview." },
      { status: 402 }
    );
  }

  try {
    const snapshot = toRecord(access.output.analysis_snapshot);
    const jobContext = isRecord(snapshot.jobContext) ? snapshot.jobContext : {};
    const resumeContext =
      typeof jobContext.resumeText === "string"
        ? jobContext.resumeText
        : access.output.resume_text ?? "";
    const questions = await generateMockInterviewQuestions({
      jobDescription: access.output.source_job_description ?? "",
      tailoredResume: resumeContext,
      coverLetter: access.output.cover_letter_text ?? "",
      clarificationAnswers: access.output.clarification_answers,
      interviewPrep: typeof snapshot.interviewPrep === "string" ? snapshot.interviewPrep : null
    });

    const latest = await access.admin
      .from("generated_outputs")
      .select("analysis_snapshot")
      .eq("id", access.output.id)
      .eq("user_id", access.userId)
      .single();
    const latestInterview = readMockInterview(latest.data?.analysis_snapshot);
    if (latestInterview?.questions.length) {
      return NextResponse.json({ mockInterview: latestInterview, alreadyStarted: true });
    }

    const creditResult = await consumeCredits(access.userId, 1, "generate_mock_interview");
    if (creditResult.status === "insufficient_credits") {
      return NextResponse.json(
        { error: "Not enough credits to start a mock interview." },
        { status: 402 }
      );
    }

    const mockInterview: MockInterviewState = {
      status: "in_progress",
      questions,
      answers: [],
      startedAt: new Date().toISOString()
    };
    await updateMockInterview(access, mockInterview);
    return NextResponse.json({ mockInterview });
  } catch (error) {
    console.error("[mock-interview] Could not start interview", {
      outputId: access.output.id,
      userId: access.userId,
      error
    });
    return NextResponse.json(
      { error: "Could not build your mock interview. Please try again." },
      { status: 500 }
    );
  }
}

async function saveAnswer(access: OutputAccess, body: unknown) {
  const current = readMockInterview(access.output.analysis_snapshot);
  if (!current?.questions.length) {
    return NextResponse.json({ error: "Mock interview has not started." }, { status: 400 });
  }
  if (current.status === "completed") {
    return NextResponse.json({ mockInterview: current, alreadyCompleted: true });
  }
  const questionId = isRecord(body) && typeof body.questionId === "string" ? body.questionId : "";
  const answer = isRecord(body) && typeof body.answer === "string" ? body.answer.trim() : "";
  if (!current.questions.some((question) => question.id === questionId)) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }
  if (!answer) {
    return NextResponse.json({ error: "Answer cannot be empty." }, { status: 400 });
  }
  const nextAnswer: MockInterviewAnswer = {
    questionId,
    answer,
    createdAt: new Date().toISOString()
  };
  const answers = [
    ...current.answers.filter((item) => item.questionId !== questionId),
    nextAnswer
  ];
  const next: MockInterviewState = {
    ...current,
    status: "in_progress",
    answers
  };
  await updateMockInterview(access, next);
  return NextResponse.json({ mockInterview: next });
}

async function finishInterview(access: OutputAccess) {
  const current = readMockInterview(access.output.analysis_snapshot);
  if (!current?.questions.length) {
    return NextResponse.json({ error: "Mock interview has not started." }, { status: 400 });
  }
  if (current.status === "completed" && current.feedback) {
    return NextResponse.json({ mockInterview: current, alreadyCompleted: true });
  }

  try {
    const snapshot = toRecord(access.output.analysis_snapshot);
    const jobContext = isRecord(snapshot.jobContext) ? snapshot.jobContext : {};
    const resumeContext =
      typeof jobContext.resumeText === "string"
        ? jobContext.resumeText
        : access.output.resume_text ?? "";
    const feedback = await evaluateMockInterview({
      context: {
        jobDescription: access.output.source_job_description ?? "",
        tailoredResume: resumeContext,
        coverLetter: access.output.cover_letter_text ?? "",
        clarificationAnswers: access.output.clarification_answers,
        interviewPrep: typeof snapshot.interviewPrep === "string" ? snapshot.interviewPrep : null
      },
      questions: current.questions,
      answers: current.answers
    });
    const next: MockInterviewState = {
      ...current,
      status: "completed",
      feedback,
      completedAt: new Date().toISOString()
    };
    await updateMockInterview(access, next);
    return NextResponse.json({ mockInterview: next });
  } catch (error) {
    console.error("[mock-interview] Could not finish interview", {
      outputId: access.output.id,
      userId: access.userId,
      error
    });
    return NextResponse.json(
      { error: "Could not generate mock interview feedback. Please try again." },
      { status: 500 }
    );
  }
}

async function updateMockInterview(access: OutputAccess, mockInterview: MockInterviewState) {
  const nextSnapshot = {
    ...toRecord(access.output.analysis_snapshot),
    mockInterview
  };
  const { error } = await access.admin
    .from("generated_outputs")
    .update({ analysis_snapshot: nextSnapshot })
    .eq("id", access.output.id)
    .eq("user_id", access.userId);
  if (error) throw error;
  access.output.analysis_snapshot = nextSnapshot;
}

type OutputAccess = {
  userId: string;
  admin: NonNullable<ReturnType<typeof createAdminSupabaseClient>>;
  output: Record<string, any>;
};

async function getOutputForUser(outputId: string): Promise<OutputAccess | { response: NextResponse }> {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return { response: NextResponse.json({ error: "Auth is not configured." }, { status: 503 }) };
  }
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous === true || !user.email) {
    return { response: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return {
      response: NextResponse.json({ error: "Account storage is not configured." }, { status: 503 })
    };
  }

  const { data: output, error } = await admin
    .from("generated_outputs")
    .select("*")
    .eq("id", outputId)
    .eq("user_id", user.id)
    .single();
  if (error || !output) {
    return { response: NextResponse.json({ error: "Saved output not found." }, { status: 404 }) };
  }
  return { userId: user.id, admin, output };
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? { ...value } : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
