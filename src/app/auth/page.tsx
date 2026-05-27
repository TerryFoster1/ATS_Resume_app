import AuthPanel from "@/components/AuthPanel";

export default async function AuthPage({
  searchParams
}: {
  searchParams?: Promise<{ next?: string; mode?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const initialMode = resolvedSearchParams?.mode === "sign-up" ? "sign-up" : "sign-in";
  return (
    <main className="space-y-8">
      <AuthPanel next={resolvedSearchParams?.next ?? "/dashboard"} initialMode={initialMode} />
    </main>
  );
}
