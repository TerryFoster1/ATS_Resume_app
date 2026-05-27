import Link from "next/link";
import type { MarketingPage } from "@/lib/marketingPages";

export default function MarketingLandingPage({ page }: { page: MarketingPage }) {
  return (
    <main className="marketing-page space-y-8">
      <section className="marketing-hero">
        <div className="marketing-nav">
          <Link href="/" className="marketing-brand">
            <span>CL</span>
            <strong>Career Ladder</strong>
          </Link>
          <nav>
            <Link href="/career-pathways">Pathways</Link>
            <Link href="/interview-prep">Interview Prep</Link>
            <Link href="/resume-builder">Resume</Link>
            <Link href="/?step=intake">Start</Link>
          </nav>
        </div>

        <div className="marketing-hero-grid">
          <div>
            <p className="app-section-label">{page.eyebrow}</p>
            <h1>{page.headline}</h1>
            <p>{page.intro}</p>
            <div className="marketing-cta-row">
              <Link href={page.primaryCta.href} className="app-button-primary">
                {page.primaryCta.label}
              </Link>
              {page.secondaryCta ? (
                <Link href={page.secondaryCta.href} className="app-button-ghost">
                  {page.secondaryCta.label}
                </Link>
              ) : null}
            </div>
          </div>

          <div className="marketing-proof-visual" aria-label={`${page.title} preview`}>
            <div className="marketing-proof-card is-main">
              <span>{page.proof[0]?.label}</span>
              <strong>{page.proof[0]?.title}</strong>
              <p>{page.proof[0]?.body}</p>
            </div>
            <div className="marketing-proof-card">
              <span>{page.proof[1]?.label}</span>
              <strong>{page.proof[1]?.title}</strong>
              <p>{page.proof[1]?.body}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-story-grid">
        {page.story.map((item) => (
          <article key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </article>
        ))}
      </section>

      <section className="marketing-related">
        <div>
          <p className="app-section-label">Continue exploring</p>
          <h2>Career Ladder is built as a connected career workspace.</h2>
        </div>
        <div>
          {page.related.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
