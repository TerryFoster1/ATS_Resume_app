import { redirect } from "next/navigation";
import AdminPromoCodesClient from "@/components/AdminPromoCodesClient";
import { isAdminEmail } from "@/lib/adminAccess";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPromoCodesPage() {
  const supabase = createServerSupabaseClient();
  if (!supabase) return <SetupMissing />;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/admin/promo-codes");
  if (!user.email || !isAdminEmail(user.email)) {
    return (
      <main className="app-screen-card space-y-4">
        <p className="app-kicker">Admin</p>
        <h1 className="text-3xl app-heading">Admin access required.</h1>
        <p className="text-sm leading-6 text-[var(--color-text-muted)]">
          Add your email to `ADMIN_EMAILS` or `CAREER_LADDER_ADMIN_EMAILS` to manage beta promo codes.
        </p>
      </main>
    );
  }
  return (
    <main className="space-y-8">
      <AdminPromoCodesClient />
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
