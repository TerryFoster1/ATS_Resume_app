import { NextResponse } from "next/server";
import { normalizeSavedApplicationTitle } from "@/lib/applicationMeta";
import { readPathwaySnapshot } from "@/lib/pathway";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
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
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (user.is_anonymous === true || !user.email) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = admin
    ? await admin
        .from("generated_outputs")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single()
    : { data: null, error: null };

  if (error || !data) {
    return NextResponse.json({ error: "Saved output not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    applicationTitle: normalizeSavedApplicationTitle({
      title: data.job_title,
      companyName: data.company_name,
      sourceJobDescription: data.source_job_description
    }),
    companyName: data.company_name,
    createdAt: data.created_at,
    resumeText: data.resume_text,
    coverLetterText: data.cover_letter_text,
    sourceJobDescription: data.source_job_description,
    analysisSummary: data.analysis_summary,
    clarificationAnswers: data.clarification_answers,
    analysis: data.analysis_snapshot,
    resumeUnlocked: Boolean(data.resume_unlocked),
    coverLetterUnlocked: Boolean(data.cover_letter_unlocked),
    interviewPrepStatus: data.interview_prep_status,
    interviewPrep:
      data.analysis_snapshot &&
      typeof data.analysis_snapshot === "object" &&
      !Array.isArray(data.analysis_snapshot) &&
      typeof data.analysis_snapshot.interviewPrep === "string"
        ? data.analysis_snapshot.interviewPrep
        : null,
    pathway: readPathwaySnapshot(data.analysis_snapshot)
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
