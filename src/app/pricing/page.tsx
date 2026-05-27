import Link from "next/link";
import AccountCreditIndicator from "@/components/AccountCreditIndicator";
import AnalyticsEvent from "@/components/AnalyticsEvent";
import CheckoutButton from "@/components/CheckoutButton";

const CREDIT_USES = [
  { label: "Resume PDF export", cost: "1 credit" },
  { label: "Cover letter unlock", cost: "1 credit" },
  { label: "Interview prep", cost: "1 credit" }
];

const PACKS = [
  {
    name: "5 Credit Pack",
    pack: "5" as const,
    credits: "5 credits",
    price: "$19.99",
    note: "Good for a focused application or two."
  },
  {
    name: "10 Credit Pack",
    pack: "10" as const,
    credits: "10 credits",
    price: "$39.99",
    note: "Built for multiple applications and export unlocks."
  }
];

export default async function PricingPage({
  searchParams
}: {
  searchParams?: Promise<{ canceled?: string; pack?: string; checkout?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const canceled = resolvedSearchParams?.canceled === "1";
  const autoCheckoutPack =
    resolvedSearchParams?.checkout === "1" &&
    (resolvedSearchParams.pack === "5" || resolvedSearchParams.pack === "10")
      ? resolvedSearchParams.pack
      : null;

  return (
    <main className="space-y-8">
      <AnalyticsEvent name="pricing_viewed" />
      <header className="app-product-header px-5 py-5 sm:px-7">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="app-kicker">Credits preview</p>
            <h1 className="mt-2 text-3xl app-heading">
              Buy credits to unlock exports.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-primary)]/72">
              Stripe Checkout handles payment securely. Credits are added to
              your signed-in account after successful payment.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AccountCreditIndicator />
            <Link href="/" className="app-button-ghost">
              Back home
            </Link>
          </div>
        </div>
      </header>

      {canceled && (
        <div className="rounded-[18px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-900">
          Checkout was cancelled. You can choose a pack when you&apos;re ready.
        </div>
      )}

      <section className="pricing-trust-strip">
        <div>
          <p className="app-kicker">Preview first</p>
          <strong>No subscription. Unlock only what you need.</strong>
        </div>
        <div>
          <p className="app-kicker">Secure checkout</p>
          <strong>Payments are handled by Stripe.</strong>
        </div>
        <div>
          <p className="app-kicker">Career materials</p>
          <strong>Credits apply to exports, letters, and prep.</strong>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {PACKS.map((pack) => (
          <article key={pack.name} className="pricing-pack-card space-y-5">
            <div>
              <p className="app-section-label">{pack.name}</p>
              <h2 className="mt-3 text-4xl font-black text-[var(--color-text-primary)]">
                {pack.price}
              </h2>
              <p className="mt-2 text-xl font-black text-[var(--color-accent-purple)]">
                {pack.credits}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                {pack.note}
              </p>
            </div>
            <CheckoutButton pack={pack.pack} autoStart={autoCheckoutPack === pack.pack}>
              Buy {pack.credits}
            </CheckoutButton>
          </article>
        ))}
      </section>

      <section className="pricing-usage-panel">
        <p className="app-kicker">Credit usage</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {CREDIT_USES.map((item) => (
            <div key={item.label} className="app-soft-band px-4 py-4">
              <p className="text-sm font-black text-[var(--color-text-primary)]">
                {item.label}
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--color-accent-purple)]">
                {item.cost}
              </p>
            </div>
          ))}
        </div>
      </section>

    </main>
  );
}
