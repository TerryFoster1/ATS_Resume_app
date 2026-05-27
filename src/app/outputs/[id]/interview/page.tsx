import Link from "next/link";
import { redirect } from "next/navigation";
import MockInterviewClient from "@/components/MockInterviewClient";
import { normalizeSavedApplicationTitle } from "@/lib/applicationMeta";
import { readMockInterview } from "@/lib/mockInterview";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MockInterviewPage({
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
  if (!user) redirect(`/auth?next=/outputs/${id}/interview`);

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
        <p className="app-kicker">Mock interview</p>
        <h1 className="text-3xl app-heading">We could not find that saved application.</h1>
        <Link href="/dashboard" className="app-button-primary">
          Back to dashboard
        </Link>
      </main>
    );
  }

  const displayTitle = normalizeSavedApplicationTitle({
    title: data.job_title,
    companyName: data.company_name,
    sourceJobDescription: data.source_job_description
  });

  return (
    <main className="space-y-8">
      <MockInterviewClient
        outputId={data.id}
        title={displayTitle}
        companyName={data.company_name}
        initialMockInterview={readMockInterview(data.analysis_snapshot)}
      />
    </main>
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
