import Link from "next/link";
import { redirect } from "next/navigation";
import AccountCreditIndicator from "@/components/AccountCreditIndicator";
import SavedOutputDocuments from "@/components/SavedOutputDocuments";
import { normalizeSavedApplicationTitle } from "@/lib/applicationMeta";
import { readOpportunityTracking } from "@/lib/opportunityTracking";
import { readPathwaySnapshot } from "@/lib/pathway";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SavedOutputPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  if (!supabase) return <SetupMissing />;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=/outputs/${id}`);

  const admin = createAdminSupabaseClient();
  const { data } = admin
    ? await admin
        .from("generated_outputs")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single()
    : { data: null };

  if (!data) {
    return (
      <main className="app-screen-card space-y-4">
        <p className="app-kicker">Saved workspace</p>
        <h1 className="text-3xl app-heading">We could not find that saved application.</h1>
        <Link href="/dashboard" className="app-button-primary">
          Back to workspace
        </Link>
      </main>
    );
  }
  const displayTitle = normalizeSavedApplicationTitle({
    title: data.job_title,
    companyName: data.company_name,
    sourceJobDescription: data.source_job_description
  });
  const hasResume = Boolean(data.resume_text?.trim());
  const hasCoverLetter = Boolean(data.cover_letter_text?.trim());
  const tracking = readOpportunityTracking(data.analysis_snapshot);

  return (
    <main className="space-y-8">
      <header className="app-product-header px-5 py-5 sm:px-7">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="app-kicker">{new Date(data.created_at).toLocaleDateString()}</p>
            <h1 className="mt-2 text-3xl app-heading">{displayTitle}</h1>
            <p className="mt-2 text-sm font-semibold text-[var(--color-text-muted)]">
              {data.company_name ?? "Company not detected"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="dashboard-badge is-pending">
                {tracking.status}
              </span>
              <span className={data.resume_unlocked ? "dashboard-badge is-ready" : "dashboard-badge"}>
                Resume {hasResume ? (data.resume_unlocked ? "unlocked" : "locked") : "not generated"}
              </span>
              <span className={data.cover_letter_unlocked ? "dashboard-badge is-ready" : "dashboard-badge"}>
                Cover letter {hasCoverLetter ? (data.cover_letter_unlocked ? "unlocked" : "locked") : "not generated"}
              </span>
              <span className={data.interview_prep_status === "completed" ? "dashboard-badge is-ready" : "dashboard-badge is-pending"}>
                Interview prep {data.interview_prep_status === "completed" ? "ready" : "pending"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AccountCreditIndicator />
            <Link href="/dashboard" className="app-button-ghost">
              Back to workspace
            </Link>
          </div>
        </div>
      </header>

      <SavedOutputDocuments
        outputId={data.id}
        title={displayTitle}
        companyName={data.company_name}
        opportunityStatus={tracking.status}
        tracking={tracking}
        resumeText={data.resume_text ?? ""}
        coverLetterText={data.cover_letter_text ?? ""}
        sourceResumeText={data.resume_text ?? null}
        resumeUnlocked={Boolean(data.resume_unlocked)}
        coverLetterUnlocked={Boolean(data.cover_letter_unlocked)}
        interviewPrepStatus={data.interview_prep_status ?? "pending"}
        interviewPrepText={readInterviewPrep(data.analysis_snapshot)}
        pathway={readPathwaySnapshot(data.analysis_snapshot)}
      />
    </main>
  );
}

function readInterviewPrep(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return "";
  const value = (snapshot as { interviewPrep?: unknown }).interviewPrep;
  return typeof value === "string" ? value : "";
}

function SetupMissing() {
  return (
    <main className="app-screen-card space-y-4">
      <p className="app-kicker">Setup needed</p>
      <h1 className="text-3xl app-heading">Supabase is not configured yet.</h1>
    </main>
  );
}
