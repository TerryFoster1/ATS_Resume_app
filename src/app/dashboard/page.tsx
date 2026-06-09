import Link from "next/link";
import { redirect } from "next/navigation";
import AnalyticsEvent from "@/components/AnalyticsEvent";
import DashboardApplications, { type DashboardApplication } from "@/components/DashboardApplications";
import PromoCodeRedeemer from "@/components/PromoCodeRedeemer";
import { getCreditBalance } from "@/lib/accountStorage";
import { resolveApplicationPipelineMeta } from "@/lib/applicationMeta";
import { readMockInterview } from "@/lib/mockInterview";
import { readOpportunityTracking } from "@/lib/opportunityTracking";
import { readPathwaySnapshot } from "@/lib/pathway";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<{ checkout?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = createServerSupabaseClient();
  if (!supabase) return <DashboardSetupMissing />;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/dashboard");

  const admin = createAdminSupabaseClient();
  const credits = await getCreditBalance(user.id);
  const { data } = admin
    ? await admin
        .from("generated_outputs")
        .select("id, job_title, company_name, created_at, resume_unlocked, cover_letter_unlocked, interview_prep_status, source_job_description, analysis_snapshot")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const applications: DashboardApplication[] = (data ?? []).map((item) => {
    const mockInterview = readMockInterview(item.analysis_snapshot);
    const pathway = readPathwaySnapshot(item.analysis_snapshot);
    const tracking = readOpportunityTracking(item.analysis_snapshot);
    const pipelineMeta = resolveApplicationPipelineMeta({
      title: item.job_title,
      companyName: item.company_name,
      sourceJobDescription: item.source_job_description,
      analysisSnapshot: item.analysis_snapshot
    });
    return {
      id: item.id,
      jobTitle: pipelineMeta.jobTitle,
      companyName: pipelineMeta.companyName,
      displayTitle: pipelineMeta.displayTitle,
      applicationStatus: tracking.status,
      createdAt: item.created_at,
      followUpDate: tracking.followUpDate,
      hasOffer: Object.values(tracking.offer).some(
        (value) => typeof value === "string" && value.trim()
      ),
      resumeUnlocked: Boolean(item.resume_unlocked),
      coverLetterUnlocked: Boolean(item.cover_letter_unlocked),
      interviewPrepReady: item.interview_prep_status === "completed",
      mockInterviewStatus: mockInterview?.status ?? "not_started",
      pathwayReady: Boolean(pathway?.full),
      pathwayPreview: Boolean(pathway && !pathway.full)
    };
  });
  const unlockedExports = applications.reduce(
    (total, item) => total + Number(item.resumeUnlocked) + Number(item.coverLetterUnlocked),
    0
  );
  const interviewPrepReady = applications.filter((item) => item.interviewPrepReady).length;
  const recentWork = applications.slice(0, 3);
  const profileSignals = [
    { label: "Profile", ready: applications.length > 0 || unlockedExports > 0 },
    { label: "Resume import", ready: applications.some((item) => item.resumeUnlocked) },
    { label: "Career goals", ready: applications.some((item) => item.pathwayReady || item.pathwayPreview) }
  ];
  const profileCompleteness = Math.round(
    (profileSignals.filter((item) => item.ready).length / profileSignals.length) * 100
  );
  const planCount = applications.filter((item) => item.pathwayReady || item.pathwayPreview).length;
  const winCount = applications.length;

  return (
    <main className="dashboard-workspace space-y-8">
      <AnalyticsEvent name="dashboard_reopen" />
      {resolvedSearchParams?.checkout === "success" && (
        <section className="rounded-[22px] border border-[#bfe3d8] bg-[#effbf7] px-5 py-4 text-sm leading-6 text-[#12604f] shadow-[0_12px_28px_rgba(17,35,63,0.06)]">
          <strong>Payment successful.</strong> Your credits are now attached to this account. You can reopen a saved application or start a new one when you are ready.
        </section>
      )}
      <section className="dashboard-journey-grid dashboard-journey-grid-primary" aria-label="Career Ladder journeys">
        <JourneyCard
          step="01"
          title="Build My Career Profile"
          body="Complete your profile with the experience Career Ladder should remember."
          href="/profile"
          cta="Continue Profile"
          progressLabel={profileCompleteness + "% complete"}
          progress={profileCompleteness}
          details={["Add experience", "Education", "Skills", "Tools", "Languages", "Projects", "Volunteer work"]}
        />
        <JourneyCard
          step="02"
          title="Plan My Career"
          body="Explore career paths, get pathway recommendations, and understand your transferable skills."
          href="/career-coach"
          cta="Plan My Career"
          progressLabel={planCount + " pathway" + (planCount === 1 ? "" : "s")}
          progress={Math.min(100, planCount * 34)}
          details={["Career paths", "Pathway recommendations", "Transferable skills"]}
        />
        <JourneyCard
          step="03"
          title="Win Opportunities"
          body="Tailor resumes, prepare cover letters, and practice interviews for roles you actually want."
          href="/?step=intake"
          cta="Start Applying"
          progressLabel={winCount + " workspace" + (winCount === 1 ? "" : "s")}
          progress={Math.min(100, winCount * 20)}
          details={["Resume tailoring", "Cover letters", "Interview practice"]}
        />
      </section>

      <header className="dashboard-hero dashboard-hero-secondary">
        <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_360px] xl:items-center">
          <div className="max-w-3xl">
            <p className="dashboard-eyebrow">Career workspace</p>
            <h1 className="mt-3 text-3xl app-heading sm:text-4xl">
              Welcome back. Keep your next moves connected.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-text-primary)]/72 sm:text-base">
              Keep tailored materials, recruiter prep, pathway notes, and hiring-stage
              details organized around the roles you are actively pursuing.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/?step=intake" className="app-button-primary dashboard-primary-cta">
                Add a new opportunity
              </Link>
              <Link href="/profile" className="dashboard-secondary-cta">
                Update career profile
              </Link>
              <Link href="/pricing?pack=5&checkout=1" className="dashboard-secondary-cta">
                Buy credits
              </Link>
              <form action="/auth/signout" method="post" className="sm:ml-1">
                <button type="submit" className="dashboard-signout">
                  Sign out
                </button>
              </form>
            </div>
          </div>

          <div className="dashboard-credit-card">
            <p className="dashboard-eyebrow">Available credits</p>
            <div className="mt-4 flex items-end gap-3">
              <span className="text-5xl font-black leading-none text-[#11233f]">
                {credits}
              </span>
              <span className="pb-1 text-sm font-bold text-[#5d6f85]">
                credits
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#5d6f85]">
              Use credits to unlock exports, cover letters, and future interview prep.
            </p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#e6edf4]">
              <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-[#2f80ed] to-[#40b3a2]" />
            </div>
          </div>
        </div>
      </header>

      {recentWork.length > 0 && (
        <section className="dashboard-recent-work">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="dashboard-eyebrow">Recent work</p>
              <h2 className="mt-2 text-2xl app-heading">Pick up where you left off</h2>
            </div>
            <Link href="/?step=intake" className="dashboard-secondary-cta">Add another role</Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {recentWork.map((item) => <RecentWorkCard key={item.id} item={item} />)}
          </div>
        </section>
      )}

      <PromoCodeRedeemer />

      {applications.length > 0 ? (
        <DashboardApplications applications={applications} />
      ) : (
        <section className="dashboard-empty-state">
          <div className="mx-auto max-w-3xl text-center">
            <p className="dashboard-eyebrow">No saved applications yet</p>
            <h2 className="mt-3 text-3xl app-heading sm:text-4xl">
              Your first career workspace starts here.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#5d6f85] sm:text-base">
              Start with a target role, then choose whether to tailor materials,
              prepare for interviews, compare pathways, or track the hiring process.
            </p>
            <Link href="/?step=intake" className="app-button-primary dashboard-primary-cta mt-7">
              Add a new opportunity
            </Link>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-3">
            <article className="dashboard-benefit-card">
              <span className="dashboard-benefit-mark">01</span>
              <h3 className="mt-4 text-base font-black text-[#11233f]">
                Tailored resume
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#5d6f85]">
                Convert real experience into ATS-safe, recruiter-readable positioning.
              </p>
            </article>
            <article className="dashboard-benefit-card">
              <span className="dashboard-benefit-mark">02</span>
              <h3 className="mt-4 text-base font-black text-[#11233f]">
                Cover letter preview
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#5d6f85]">
                See a matching narrative that connects your background to the role.
              </p>
            </article>
            <article className="dashboard-benefit-card">
              <span className="dashboard-benefit-mark">03</span>
              <h3 className="mt-4 text-base font-black text-[#11233f]">
                Interview prep
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#5d6f85]">
                Prepare for likely recruiter questions using the same job-fit analysis.
              </p>
            </article>
          </div>
        </section>
      )}
    </main>
  );
}

function DashboardSetupMissing() {
  return (
    <main className="app-screen-card space-y-4">
      <p className="app-kicker">Setup needed</p>
      <h1 className="text-3xl app-heading">Supabase is not configured yet.</h1>
      <p className="text-sm leading-6 text-[var(--color-text-muted)]">
        Add the Supabase environment variables and run the schema before using
        the authenticated dashboard.
      </p>
    </main>
  );
}

function JourneyCard({
  step,
  title,
  body,
  href,
  cta,
  progressLabel,
  progress,
  details
}: {
  step: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  progressLabel: string;
  progress: number;
  details: string[];
}) {
  return (
    <article className="dashboard-journey-card">
      <div className="flex items-start justify-between gap-3">
        <span className="dashboard-benefit-mark">{step}</span>
        <span className="dashboard-date-pill">{progressLabel}</span>
      </div>
      <h2 className="mt-4 text-xl app-heading">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[#5d6f85]">{body}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e6edf4]">
        <div className="h-full rounded-full bg-gradient-to-r from-[#2f80ed] to-[#626be6]" style={{ width: `${Math.max(8, progress)}%` }} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {details.map((detail) => <span key={detail} className="dashboard-badge">{detail}</span>)}
      </div>
      <Link href={href} className="dashboard-journey-action">{cta}</Link>
    </article>
  );
}

function RecentWorkCard({ item }: { item: DashboardApplication }) {
  return (
    <Link href={`/outputs/${item.id}`} className="dashboard-recent-card">
      <span className={`dashboard-status-pill ${resolveRecentStatusClass(item.applicationStatus)}`}>{item.applicationStatus}</span>
      <strong className="mt-3 block text-base app-heading">{item.jobTitle}</strong>
      <span className="mt-1 block text-sm font-bold text-[#65748a]">{item.companyName ?? "Company not detected"}</span>
      <span className="mt-3 block text-xs font-black uppercase tracking-[0.12em] text-[#245f9f]">Open workspace</span>
    </Link>
  );
}

function resolveRecentStatusClass(status: DashboardApplication["applicationStatus"]) {
  if (status === "Applied") return "is-applied";
  if (status === "Offer" || status === "Accepted") return "is-offer";
  if (status === "Rejected" || status === "Archived") return "is-archived";
  if (status === "Screening" || status === "Interviewing" || status === "Final Interview") return "is-interviewing";
  return "is-draft";
}
