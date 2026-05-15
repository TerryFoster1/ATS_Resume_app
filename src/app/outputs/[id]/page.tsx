import Link from "next/link";
import { redirect } from "next/navigation";
import AccountCreditIndicator from "@/components/AccountCreditIndicator";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SavedOutputPage({
  params
}: {
  params: { id: string };
}) {
  const supabase = createServerSupabaseClient();
  if (!supabase) return <SetupMissing />;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=/outputs/${params.id}`);

  const admin = createAdminSupabaseClient();
  const { data } = admin
    ? await admin
        .from("generated_outputs")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single()
    : { data: null };

  if (!data) {
    return (
      <main className="app-screen-card space-y-4">
        <p className="app-kicker">Saved output</p>
        <h1 className="text-3xl app-heading">We could not find that saved application.</h1>
        <Link href="/dashboard" className="app-button-primary">
          Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="space-y-8">
      <header className="app-product-header px-5 py-5 sm:px-7">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="app-kicker">{new Date(data.created_at).toLocaleDateString()}</p>
            <h1 className="mt-2 text-3xl app-heading">{data.job_title}</h1>
            <p className="mt-2 text-sm font-semibold text-[var(--color-text-muted)]">
              {data.company_name ?? "Company not detected"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AccountCreditIndicator />
            <Link href="/dashboard" className="app-button-ghost">
              Back to dashboard
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-2">
        <SavedDocument title="Resume" text={data.resume_text} unlocked={Boolean(data.resume_unlocked)} />
        <SavedDocument title="Cover Letter" text={data.cover_letter_text} unlocked={Boolean(data.cover_letter_unlocked)} />
      </section>
    </main>
  );
}

function SavedDocument({
  title,
  text,
  unlocked
}: {
  title: string;
  text: string;
  unlocked: boolean;
}) {
  return (
    <div className="app-document-panel space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h2>
        <span className="app-header-pill">{unlocked ? "Unlocked" : "Preview"}</span>
      </div>
      <textarea
        readOnly={!unlocked}
        value={text}
        className="app-textarea-mono min-h-[420px] resize-y read-only:bg-[#f9f4ee]"
      />
    </div>
  );
}

function SetupMissing() {
  return (
    <main className="app-screen-card space-y-4">
      <p className="app-kicker">Setup needed</p>
      <h1 className="text-3xl app-heading">Supabase is not configured yet.</h1>
    </main>
  );
}
