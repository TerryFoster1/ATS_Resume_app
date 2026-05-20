import Link from "next/link";
import { redirect } from "next/navigation";
import AnalyticsEvent from "@/components/AnalyticsEvent";
import DashboardApplications, { type DashboardApplication } from "@/components/DashboardApplications";
import { getCreditBalance } from "@/lib/accountStorage";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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
        .select("id, job_title, company_name, created_at, resume_unlocked, cover_letter_unlocked")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const applications: DashboardApplication[] = (data ?? []).map((item) => ({
    id: item.id,
    jobTitle: item.job_title,
    companyName: item.company_name,
    createdAt: item.created_at,
    resumeUnlocked: Boolean(item.resume_unlocked),
    coverLetterUnlocked: Boolean(item.cover_letter_unlocked)
  }));

  return (
    <main className="dashboard-workspace space-y-8">
      <AnalyticsEvent name="dashboard_reopen" />
      <header className="dashboard-hero">
        <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_360px] xl:items-center">
          <div className="max-w-3xl">
            <p className="dashboard-eyebrow">Career workspace</p>
            <h1 className="mt-3 text-3xl app-heading sm:text-4xl">
              Welcome back. Build the next application with clarity.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-text-primary)]/72 sm:text-base">
              Keep tailored resumes, cover letters, and future interview prep
              organized around each role you are pursuing.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/?step=resume" className="app-button-primary dashboard-primary-cta">
                Start a new application
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

      {applications.length > 0 ? (
        <DashboardApplications applications={applications} />
      ) : (
        <section className="dashboard-empty-state">
          <div className="mx-auto max-w-3xl text-center">
            <p className="dashboard-eyebrow">No saved applications yet</p>
            <h2 className="mt-3 text-3xl app-heading sm:text-4xl">
              Your first tailored application starts here.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#5d6f85] sm:text-base">
              Generate a resume and cover letter for a specific job posting.
              Saved applications will appear here so you can reopen, export,
              and improve them later.
            </p>
            <Link href="/?step=resume" className="app-button-primary dashboard-primary-cta mt-7">
              Start a new application
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
                Interview prep coming soon
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
