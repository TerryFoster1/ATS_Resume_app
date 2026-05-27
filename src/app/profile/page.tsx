import { redirect } from "next/navigation";
import MasterCareerProfileClient from "@/components/MasterCareerProfileClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = createServerSupabaseClient();
  if (!supabase) return <ProfileSetupMissing />;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/profile");

  return (
    <main className="space-y-8">
      <MasterCareerProfileClient />
    </main>
  );
}

function ProfileSetupMissing() {
  return (
    <main className="app-screen-card space-y-4">
      <p className="app-kicker">Setup needed</p>
      <h1 className="text-3xl app-heading">Supabase is not configured yet.</h1>
      <p className="text-sm leading-6 text-[var(--color-text-muted)]">
        Add the Supabase environment variables and run the schema before using the Master Career Profile.
      </p>
    </main>
  );
}
