import Link from "next/link";

type LegalPageProps = {
  label: string;
  title: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
};

export default function LegalPage({ label, title, intro, sections }: LegalPageProps) {
  return (
    <main className="legal-page">
      <Link href="/" className="app-header-pill w-fit">
        Back to Career Ladder
      </Link>
      <section className="legal-document">
        <p className="app-kicker">{label}</p>
        <h1 className="mt-3 text-4xl app-heading">{title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-text-muted)]">
          {intro}
        </p>
        <div className="mt-8 space-y-7">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-black text-[var(--color-text-primary)]">
                {section.heading}
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--color-text-muted)]">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
