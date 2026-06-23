import { NextResponse } from "next/server";
import { consumeCredits, getCreditBalance } from "@/lib/accountStorage";
import { buildCareerGenerationContext } from "@/lib/careerGenerationContextStorage";
import { generateInterviewPrep } from "@/lib/interviewPrep";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 503 });
  }
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous === true || !user.email) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Account storage is not configured." }, { status: 503 });
  }

  const { data: output, error: outputError } = await admin
    .from("generated_outputs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (outputError || !output) {
    return NextResponse.json({ error: "Saved output not found." }, { status: 404 });
  }

  const existing = readInterviewPrep(output.analysis_snapshot);
  if (existing) {
    return NextResponse.json({ interviewPrep: existing, alreadyGenerated: true });
  }

  const credits = await getCreditBalance(user.id);
  if (credits < 1) {
    return NextResponse.json(
      { error: "Not enough credits to generate interview prep." },
      { status: 402 }
    );
  }

  try {
    const snapshot = isRecord(output.analysis_snapshot) ? output.analysis_snapshot : {};
    const jobContext = isRecord(snapshot.jobContext) ? snapshot.jobContext : {};
    const resumeContext =
      typeof jobContext.resumeText === "string" ? jobContext.resumeText : output.resume_text ?? "";
    const generationContext = await buildCareerGenerationContext({
      userId: user.id,
      workflowType: "interviewPrep",
      uploadedResumeFallback: resumeContext,
      jobTarget: { title: output.job_title, companyName: output.company_name },
      jobDescription: output.source_job_description,
      savedOpportunityContext: {
        outputId: id,
        jobTitle: output.job_title,
        companyName: output.company_name,
        sourceJobDescription: output.source_job_description,
        generatedResumeText: output.resume_text,
        generatedCoverLetterText: output.cover_letter_text,
        analysisSnapshot: output.analysis_snapshot
      }
    });
    const interviewPrep = await generateInterviewPrep({
      jobDescription: output.source_job_description ?? "",
      tailoredResume: generationContext.candidateContextText || resumeContext,
      coverLetter: output.cover_letter_text ?? "",
      clarificationAnswers: output.clarification_answers,
      generationContext
    });
    const nextSnapshot = {
      ...snapshot,
      interviewPrep,
      interviewPrepGeneratedAt: new Date().toISOString(),
      profileWarnings: generationContext.profileWarnings,
      usedMasterCareerProfile: generationContext.usedMasterProfile
    };
    const creditResult = await consumeCredits(user.id, 1, "generate_interview_prep");
    if (creditResult.status === "insufficient_credits") {
      return NextResponse.json(
        { error: "Not enough credits to generate interview prep." },
        { status: 402 }
      );
    }
    const { error: updateError } = await admin
      .from("generated_outputs")
      .update({
        analysis_snapshot: nextSnapshot,
        interview_prep_status: "completed"
      })
      .eq("id", id)
      .eq("user_id", user.id);
    if (updateError) throw updateError;
    return NextResponse.json({ interviewPrep });
  } catch (error) {
    console.error("[interview-prep] Generation failed", {
      outputId: id,
      userId: user.id,
      error
    });
    await admin
      .from("generated_outputs")
      .update({ interview_prep_status: "failed" })
      .eq("id", id)
      .eq("user_id", user.id);
    return NextResponse.json(
      { error: "Interview prep generation failed. Please contact support if a credit was used." },
      { status: 500 }
    );
  }
}

function readInterviewPrep(snapshot: unknown) {
  if (!isRecord(snapshot)) return "";
  return typeof snapshot.interviewPrep === "string" && snapshot.interviewPrep.trim()
    ? snapshot.interviewPrep
    : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
