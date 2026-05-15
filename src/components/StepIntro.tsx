"use client";

interface Props {
  onNext: () => void;
}

const STEPS = [
  {
    n: 1,
    title: "Add your resume and job ad",
    body: "Upload your resume file, then add the posting you want to target."
  },
  {
    n: 2,
    title: "We read for hiring intent",
    body: "The app looks for transferable evidence, not just matching words."
  },
  {
    n: 3,
    title: "Answer only useful questions",
    body: "A few short details can close gaps and strengthen the rewrite."
  },
  {
    n: 4,
    title: "Preview tailored materials",
    body: "Review a focused preview, then unlock exports when ready."
  }
];

const CHIPS = ["Recruiter-aware", "ATS-safe", "Human-sounding"];

export default function StepIntro({ onNext }: Props) {
  return (
    <section className="app-screen-card space-y-7">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <div className="app-step-hero p-7 sm:p-9">
          <div className="flex h-full flex-col justify-between gap-8">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {CHIPS.map((chip) => (
                  <span key={chip} className="app-chip">
                    {chip}
                  </span>
                ))}
              </div>
              <div className="space-y-3">
                <h2 className="max-w-2xl text-4xl font-black leading-tight tracking-tight text-[var(--color-text-primary)] sm:text-5xl">
                  Your experience may be stronger than your resume communicates.
                </h2>
                <p className="max-w-xl text-base leading-7 text-[var(--color-text-primary)]/76">
                  A guided resume strategist that translates your real
                  experience into recruiter-readable positioning for a specific
                  role.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/?step=resume"
                onClick={(event) => {
                  event.preventDefault();
                  onNext();
                  window.history.replaceState(null, "", "/?step=resume");
                }}
                className="app-button-secondary text-base"
              >
                Tailor my resume
              </a>
              <p className="text-xs font-semibold text-[var(--color-text-primary)]/62">
                No account needed. Your text stays in this session.
              </p>
            </div>
          </div>
        </div>

        <div className="app-consult-card p-6 sm:p-7">
          <div className="flex h-full flex-col justify-between gap-6">
            <div>
              <p className="app-section-label">How it helps</p>
              <h3 className="mt-3 text-2xl app-heading">
                Positioning, not keyword stuffing.
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                The app identifies useful overlap, asks for missing proof, and
                turns supported experience into clean, editable materials.
              </p>
            </div>
            <div className="rounded-[24px] border border-[var(--color-border-light)] bg-white p-5 shadow-[0_14px_34px_rgba(17,35,63,0.08)]">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                Example question
              </p>
              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-text-primary)]">
                Have you tracked campaign performance, dashboards, KPIs, client
                progress, or reporting metrics?
              </p>
            </div>
          </div>
        </div>
      </div>

      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <li key={s.n} className="app-mini-card">
            <div className="flex h-full flex-col gap-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-[var(--color-accent-orange)] text-sm font-black text-white shadow-[var(--shadow-button)]"
                aria-hidden
              >
                {s.n}
              </span>
              <div>
                <h3 className="text-base font-black text-[var(--color-text-primary)]">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                  {s.body}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p className="app-soft-band px-4 py-3 text-center text-xs text-[var(--color-text-primary)]/62">
        No accounts. No saved history. Not a guarantee of passing every ATS or hiring process.
      </p>
    </section>
  );
}
