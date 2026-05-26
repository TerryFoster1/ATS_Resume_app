import Link from "next/link";
import AccountCreditIndicator from "@/components/AccountCreditIndicator";
import ResumeWizard from "@/components/ResumeWizard";

type Step = "intro" | "resume" | "job" | "analysis" | "generate" | "results";

const VALID_STEPS: Step[] = ["intro", "resume", "job", "analysis", "generate", "results"];

const FLOW = [
  "Upload your resume",
  "Paste the job description",
  "Answer recruiter-style questions",
  "Preview tailored materials"
];

const VALUE_PROPS = [
  {
    title: "Finds the real hiring intent",
    body: "The analysis separates role requirements from company fluff, then looks for meaningful transferable overlap."
  },
  {
    title: "Asks like a recruiter",
    body: "Follow-up questions focus on proof: tools, workflows, client work, reporting, outcomes, and missing hard skills."
  },
  {
    title: "Rewrites with restraint",
    body: "The final materials stay ATS-safe, human, and grounded in experience you actually have."
  }
];

const POSITIONING_EXAMPLES = [
  {
    before: "Social media management",
    after: "Client-facing campaign content, audience engagement, and performance tracking"
  },
  {
    before: "Customer communication",
    after: "Onboarding, check-ins, follow-through, and client momentum"
  },
  {
    before: "Analytics & reporting",
    after: "KPI tracking, campaign performance, and data-backed recommendations"
  }
];

export default function Home({
  searchParams
}: {
  searchParams?: { step?: string };
}) {
  const requestedStep = searchParams?.step as Step | undefined;
  const initialStep = VALID_STEPS.includes(requestedStep as Step)
    ? (requestedStep as Step)
    : undefined;

  if (initialStep && initialStep !== "intro") {
    return <WizardShell initialStep={initialStep} />;
  }

  return <LandingPage />;
}

function WizardShell({ initialStep }: { initialStep: Step }) {
  return (
    <main className="space-y-8">
      <ProductHeader />
      <ResumeWizard initialStep={initialStep} />
    </main>
  );
}

function LandingPage() {
  return (
    <main className="space-y-8 sm:space-y-10">
      <ProductHeader />

      <section className="app-screen-card overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="p-6 sm:p-10 lg:p-12">
            <div className="flex flex-wrap gap-2">
              <span className="app-chip">Recruiter-style positioning</span>
              <span className="app-chip">Transferable skill translation</span>
              <span className="app-chip">ATS-safe output</span>
            </div>

            <h2 className="mt-7 max-w-3xl text-4xl font-black leading-tight text-[var(--color-text-primary)] sm:text-6xl">
              Position your experience for the roles you actually want.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--color-text-primary)]/74 sm:text-lg">
              You may already have the right experience. Your resume may just
              not be communicating it clearly. Upload your resume, paste the job
              description, answer recruiter-style follow-up questions, and
              generate tailored materials built around your real work.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/?step=resume" className="app-button-primary text-base">
                Tailor my resume
              </Link>
              <Link href="#example-transformation" className="app-button-ghost text-base">
                See example transformation
              </Link>
            </div>

            <ol className="mt-9 hidden gap-3 sm:grid sm:grid-cols-2">
              {FLOW.map((item, index) => (
                <li key={item} className="app-soft-band flex items-center gap-3 px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-purple)] text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <span className="text-sm font-bold text-[var(--color-text-primary)]">
                    {item}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="hero-visual-zone p-5 sm:p-8 lg:p-10">
            <ProductPreview />
          </div>
        </div>
      </section>

      <section id="example-transformation" className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <TransformationVisual />
        <div className="grid gap-3">
          {POSITIONING_EXAMPLES.map((item) => (
            <article key={item.before} className="rounded-[22px] border border-[var(--color-border-light)] bg-white p-5 shadow-[0_14px_34px_rgba(17,35,63,0.07)]">
              <div className="grid gap-3 sm:grid-cols-[0.85fr_1.15fr] sm:items-center">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    Resume says
                  </p>
                  <p className="mt-2 text-sm font-bold text-[var(--color-text-primary)]">
                    {item.before}
                  </p>
                </div>
                <div className="rounded-[18px] bg-[#eef6ff] p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#245f9f]">
                    Positioned as
                  </p>
                  <p className="mt-2 text-sm font-bold leading-6 text-[#143456]">
                    {item.after}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {VALUE_PROPS.map((item) => (
          <article key={item.title} className="app-mini-card">
            <h3 className="text-lg font-black text-[var(--color-text-primary)]">
              {item.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
              {item.body}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="hero-intelligence mx-auto max-w-xl">
      <div className="hero-insight-card">
        <div>
          <p className="hero-label">Recruiter insight</p>
          <h3>Transferable alignment found</h3>
        </div>
        <span>Close fit</span>
      </div>

      <div className="hero-doc-stack" aria-label="Resume transformation preview">
        <article className="hero-document hero-document-before">
          <div className="hero-doc-topline">
            <span>Before</span>
            <span>Generic resume language</span>
          </div>
          <h4>Communications & Digital Media</h4>
          <p>
            Social media management, customer communication, content creation,
            website updates, analytics.
          </p>
          <div className="hero-section-title">Experience signal</div>
          <ul>
            <li>Managed social content across platforms</li>
            <li>Worked with clients on messaging and updates</li>
            <li>Tracked engagement and content performance</li>
          </ul>
        </article>

        <div className="hero-transform-rail" aria-hidden>
          <span>translated into hiring language</span>
        </div>

        <article className="hero-document hero-document-after">
          <div className="hero-doc-topline">
            <span>Tailored</span>
            <span>Recruiter-readable positioning</span>
          </div>
          <h4>Client Success & Marketing Operations</h4>
          <p>
            Client-facing communicator with hands-on marketing execution,
            workflow follow-through, and campaign performance reporting.
          </p>
          <div className="hero-section-title">Positioned evidence</div>
          <ul>
            <li>Guides clients through content, reporting, and next steps</li>
            <li>Connects social media execution to business goals</li>
            <li>Uses KPI signals to strengthen client recommendations</li>
          </ul>
        </article>
      </div>

      <div className="hero-signal-grid">
        <article>
          <p>Smart question</p>
          <strong>Meta Ads or CRM proof?</strong>
          <span>Clarify gaps before the final application.</span>
        </article>
        <article>
          <p>Interview prep</p>
          <strong>Likely screen topics</strong>
          <span>Prepare for platform, reporting, and client follow-through.</span>
        </article>
      </div>
    </div>
  );
}

function TransformationVisual() {
  return (
    <article className="transformation-visual-card">
      <div className="transformation-photo" aria-label="Recruiter reviewing resume during an interview">
        <img
          src="/career-ladder-recruiter-interview.jpg"
          alt="Recruiter holding a resume during an interview conversation"
        />
        <div className="transformation-photo-scrim" aria-hidden />
        <div className="transformation-photo-note">
          <p>Recruiter lens</p>
          <strong>Translate real experience into evidence a hiring team can recognize.</strong>
        </div>
      </div>
      <div className="transformation-visual-copy">
        <p className="app-section-label">Example transformation</p>
        <h3 className="mt-3 text-2xl app-heading">
          From generic experience to recruiter-readable evidence.
        </h3>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          The app does not stuff keywords into your resume. It helps translate
          what you have done into the language a hiring team can recognize.
        </p>
      </div>
    </article>
  );
}

function ProductHeader() {
  return (
    <header className="app-product-header px-5 py-5 sm:px-7">
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="app-brand-mark" aria-hidden>
            CL
          </div>
          <div>
            <p className="app-kicker">Resume positioning engine</p>
            <h1 className="mt-1 text-2xl font-black text-[var(--color-text-primary)] sm:text-3xl">
              Career Ladder
            </h1>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <Link href="/dashboard" className="app-header-pill">
            Dashboard
          </Link>
          <Link href="/pricing" className="app-header-pill">
            Credits
          </Link>
          <Link href="/?step=resume" className="app-header-pill">
            Start
          </Link>
          <AccountCreditIndicator />
        </nav>
      </div>
    </header>
  );
}
