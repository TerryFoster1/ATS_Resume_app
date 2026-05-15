import AuthPanel from "@/components/AuthPanel";

export default function AuthPage({
  searchParams
}: {
  searchParams?: { next?: string; mode?: string };
}) {
  const initialMode = searchParams?.mode === "sign-up" ? "sign-up" : "sign-in";
  return (
    <main className="space-y-8">
      <AuthPanel next={searchParams?.next ?? "/dashboard"} initialMode={initialMode} />
    </main>
  );
}
