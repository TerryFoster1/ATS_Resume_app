import Link from "next/link";
import InterviewPrepPreviewFunnel from "@/components/InterviewPrepPreviewFunnel";
import type { SeoPage } from "@/lib/seoContent";

export default function SeoLandingPage({ page }: { page: SeoPage }) {
  return (
    <main className="space-y-8">
      <section className="app-screen-card overflow-hidden">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-start">
          <div>
            <p className="app-kicker">{page.eyebrow}</p>
            <h1 className="mt-4 max-w-4xl text-4xl app-heading sm:text-5xl">
              {page.headline}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--color-text-muted)] sm:text-lg">
              {page.intro}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={page.cta.href} className="app-button-primary">
                {page.cta.label}
              </Link>
              <span className="text-sm font-semibold text-[var(--color-text-muted)]">
                {page.cta.helper}
              </span>
            </div>
          </div>
          {page.hub === "interview-prep" ? (
            <InterviewPrepPreviewFunnel />
          ) : (
            <aside className="app-mini-card">
              <p className="app-kicker">Career Ladder</p>
              <h2 className="mt-3 text-xl app-heading">Prepare with the actual role in mind.</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                Enter a target role or posting, then choose whether you need resume help,
                a cover letter, interview prep, mock interview practice, or pathway guidance.
              </p>
            </aside>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.72fr]">
        <div className="space-y-4">
          {page.sections.map((section) => (
            <article key={section.heading} className="app-mini-card">
              <h2 className="text-2xl app-heading">{section.heading}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">
                {section.body}
              </p>
              {section.bullets && (
                <ul className="mt-4 grid gap-2">
                  {section.bullets.map((item) => (
                    <li key={item} className="text-sm font-semibold leading-6 text-[var(--color-text-primary)]">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>

        <aside className="app-card-soft h-fit">
          <p className="app-kicker">Related guides</p>
          <div className="mt-4 grid gap-3">
            {page.related.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[18px] border border-[var(--color-border-light)] bg-white px-4 py-3 text-sm font-bold text-[var(--color-text-primary)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(17,35,63,0.08)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </aside>
      </section>

      {page.questions && (
        <section className="app-screen-card">
          <p className="app-kicker">Sample recruiter-style questions</p>
          <h2 className="mt-3 text-3xl app-heading">Questions worth preparing before the screen</h2>
          <div className="mt-6 grid gap-4">
            {page.questions.map((item) => (
              <article key={item.question} className="app-mini-card">
                <h3 className="text-xl app-heading">{item.question}</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                    <strong className="text-[var(--color-text-primary)]">Why it is likely: </strong>
                    {item.whyLikely}
                  </p>
                  <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                    <strong className="text-[var(--color-text-primary)]">What they are testing: </strong>
                    {item.recruiterTesting}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="app-card-soft">
        <p className="app-kicker">Next step</p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl app-heading">Make the prep specific to your posting.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
              Generic lists help you warm up. Career Ladder helps you prepare against the actual role,
              company, and evidence a recruiter is likely to look for.
            </p>
          </div>
          <Link href={page.cta.href} className="app-button-primary shrink-0">
            {page.cta.label}
          </Link>
        </div>
      </section>
    </main>
  );
}

export function SeoJsonLd({ page }: { page: SeoPage }) {
  const siteUrl = "https://www.careerladder.ca";
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.description,
    url: `${siteUrl}${page.canonicalPath}`,
    publisher: {
      "@type": "Organization",
      name: "Career Ladder"
    }
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Career Ladder", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: page.eyebrow,
        item: `${siteUrl}/${page.hub}`
      },
      {
        "@type": "ListItem",
        position: 3,
        name: page.title,
        item: `${siteUrl}${page.canonicalPath}`
      }
    ]
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
