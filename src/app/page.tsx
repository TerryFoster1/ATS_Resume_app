import Link from "next/link";
import AccountCreditIndicator from "@/components/AccountCreditIndicator";
import ResumeWizard from "@/components/ResumeWizard";

type Step = "intro" | "intake" | "intent" | "resume" | "job" | "analysis" | "generate" | "results";

const VALID_STEPS: Step[] = ["intro", "intake", "intent", "resume", "job", "analysis", "generate", "results"];

const SOCIAL_PROOF_ITEMS = [
  { value: "2,300+", label: "Career Profiles Created", note: "Demo metric for launch layout." },
  { value: "7,800+", label: "Resumes Tailored", note: "Demo metric for launch layout." },
  { value: "12,000+", label: "Interview Questions Generated", note: "Demo metric for launch layout." },
  { value: "150+", label: "Career Paths Explored", note: "Demo metric for launch layout." }
];

const OUTCOME_CARDS = [
  {
    icon: "01",
    title: "Understand what's holding you back",
    body: "Identify resume gaps, positioning problems, and missing opportunities."
  },
  {
    icon: "02",
    title: "Find career paths that fit you",
    body: "Discover realistic options based on your experience and goals."
  },
  {
    icon: "03",
    title: "Create resumes that get seen",
    body: "Tailor your experience to the role and the people reviewing it."
  },
  {
    icon: "04",
    title: "Prepare for interviews with confidence",
    body: "Practice recruiter questions and learn what employers actually care about."
  }
];

const HOW_IT_WORKS = [
  {
    title: "Add your resume",
    body: "Upload an existing resume or create one from scratch."
  },
  {
    title: "Get your personalized plan",
    body: "We will identify opportunities, gaps, strengths, and next steps."
  },
  {
    title: "Take action with confidence",
    body: "Apply with stronger materials and prepare for the interview process."
  }
];

const TESTIMONIALS = [
  {
    name: "Sarah M.",
    role: "Marketing Manager",
    quote:
      "I had been applying for months without responses. Career Ladder showed me what was missing and helped me finally get interviews.",
    problem: "No callbacks",
    changed: "Clearer resume positioning",
    result: "Interview momentum"
  },
  {
    name: "James T.",
    role: "Project Coordinator",
    quote:
      "I did not realize my experience could transfer into another industry. The pathway recommendations completely changed my job search.",
    problem: "Stuck in one path",
    changed: "Transferable skills surfaced",
    result: "New direction"
  },
  {
    name: "Lisa R.",
    role: "Operations Specialist",
    quote:
      "The interview preparation helped me walk into the interview feeling ready instead of guessing.",
    problem: "Interview anxiety",
    changed: "Recruiter-style practice",
    result: "More confidence"
  }
];

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<{ step?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const requestedStep = resolvedSearchParams?.step as Step | undefined;
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
    <main className="homepage-redesign space-y-8 sm:space-y-10">
      <LandingHeader />

      <section className="cl-v2-hero">
        <div className="cl-v2-hero-copy">
          <p className="cl-v2-pill">Clarity. Direction. Confidence.</p>
          <h2>
            Not getting interviews?
            <span>Let's figure out why.</span>
          </h2>
          <p>
            Most job seekers never learn how modern hiring actually works. Career Ladder
            helps you identify what's holding you back, uncover opportunities you may be
            overlooking, and prepare for the jobs you actually want.
          </p>
          <div className="cl-v2-actions">
            <Link href="/?step=resume" className="app-button-primary text-base">
              Upload My Resume
            </Link>
            <Link href="/?step=intake&mode=firstResume" className="app-button-ghost text-base">
              Create My First Resume
            </Link>
          </div>
          <Link href="/career-coach" className="cl-v2-text-link">
            Not sure what you want to do? Try Career Coach
          </Link>
          <div className="cl-v2-trust-row">
            <span>Free to get started</span>
            <span>No credit card required</span>
            <span>Save your profile forever</span>
          </div>
        </div>
        <BeforeAfterResumeVisual />
      </section>

      <section className="cl-v2-outcomes" id="resources">
        <div className="cl-v2-section-heading is-centered">
          <h2>Everything you need to move forward.</h2>
        </div>
        <div className="cl-v2-outcome-grid">
          {OUTCOME_CARDS.map((item) => (
            <article key={item.title}>
              <span>{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cl-v2-metrics">
        <h2>Helping job seekers take their next step.</h2>
        <p className="cl-v2-metrics-note">
          Demo activity metrics for launch QA. Replace with live product data before using as verified claims.
        </p>
        <div className="cl-v2-metric-grid">
          {SOCIAL_PROOF_ITEMS.map((item) => (
            <article key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cl-v2-steps" id="how-it-works">
        <div className="cl-v2-section-heading is-centered">
          <h2>Your next opportunity in three simple steps.</h2>
        </div>
        <div className="cl-v2-step-grid">
          {HOW_IT_WORKS.map((step, index) => (
            <article key={step.title}>
              <span>{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cl-v2-stories" id="success-stories">
        <div className="cl-v2-section-heading is-centered">
          <h2>Real stories from real job seekers.</h2>
        </div>
        <SuccessStoriesCarousel />
      </section>

      <section className="cl-v2-final-cta">
        <h2>Your next opportunity starts now.</h2>
        <p>
          Upload your resume or create one from scratch and start building a profile that grows with you.
        </p>
        <div className="cl-v2-actions">
          <Link href="/?step=resume" className="app-button-primary text-base">
            Upload My Resume
          </Link>
          <Link href="/?step=intake&mode=firstResume" className="app-button-ghost text-base">
            Create My First Resume
          </Link>
        </div>
        <small>Free to get started.</small>
      </section>
    </main>
  );
}

function LandingHeader() {
  return (
    <header className="cl-v2-header">
      <Link href="/" className="cl-v2-brand">
        <span aria-hidden>CL</span>
        <strong>Career Ladder</strong>
      </Link>
      <nav aria-label="Homepage navigation">
        <a href="#how-it-works">How It Works</a>
        <a href="#success-stories">Success Stories</a>
        <a href="#resources">Resources</a>
        <Link href="/pricing">Pricing</Link>
      </nav>
      <div className="cl-v2-header-actions">
        <Link href="/auth">Log in</Link>
        <Link href="/?step=resume" className="cl-v2-header-cta">
          Get Started Free
        </Link>
      </div>
    </header>
  );
}

function BeforeAfterResumeVisual() {
  const beforeItems = ["Missing key skills", "Difficult to scan", "Generic positioning", "Easy to overlook"];
  const afterItems = ["Highlights relevant experience", "ATS friendly", "Recruiter readable", "Role specific"];
  return (
    <div className="cl-v2-comparison" aria-label="Before and after resume comparison">
      <ResumePreviewCard
        label="Before"
        title="Average Resume"
        tone="before"
        items={beforeItems}
      />
      <div className="cl-v2-comparison-arrow" aria-hidden>
        <span>to</span>
      </div>
      <ResumePreviewCard
        label="After Career Ladder"
        title="Career Ladder Resume"
        tone="after"
        items={afterItems}
      />
    </div>
  );
}

function ResumePreviewCard({
  label,
  title,
  tone,
  items
}: {
  label: string;
  title: string;
  tone: "before" | "after";
  items: string[];
}) {
  return (
    <article className={`cl-v2-resume-card is-${tone}`}>
      <span className="cl-v2-resume-label">{label}</span>
      <div className="cl-v2-paper">
        <div className="cl-v2-paper-line is-short" />
        <div className="cl-v2-paper-line" />
        <div className="cl-v2-paper-line" />
        <div className="cl-v2-paper-line is-muted" />
        <div className="cl-v2-paper-columns">
          <div>
            <div className="cl-v2-paper-line" />
            <div className="cl-v2-paper-line is-short" />
          </div>
          <div>
            <div className="cl-v2-paper-line" />
            <div className="cl-v2-paper-line is-short" />
          </div>
        </div>
      </div>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

function SuccessStoriesCarousel() {
  return (
    <div className="cl-v2-story-carousel">
      {TESTIMONIALS.map((story) => (
        <article key={story.name}>
          <span className="cl-v2-quote-mark">"</span>
          <p>{story.quote}</p>
          <dl>
            <div>
              <dt>Problem</dt>
              <dd>{story.problem}</dd>
            </div>
            <div>
              <dt>What changed</dt>
              <dd>{story.changed}</dd>
            </div>
            <div>
              <dt>Result</dt>
              <dd>{story.result}</dd>
            </div>
          </dl>
          <footer>
            <span>{story.name.slice(0, 1)}</span>
            <div>
              <strong>{story.name}</strong>
              <small>{story.role}</small>
            </div>
          </footer>
        </article>
      ))}
      <div className="cl-v2-story-dots" aria-hidden>
        <span />
        <span />
        <span />
      </div>
    </div>
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
            <p className="app-kicker">Career intelligence platform</p>
            <h1 className="mt-1 text-2xl font-black text-[var(--color-text-primary)] sm:text-3xl">
              Career Ladder
            </h1>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <Link href="/dashboard" className="app-header-pill">
            Dashboard
          </Link>
          <Link href="/profile" className="app-header-pill">
            Profile
          </Link>
          <Link href="/pricing" className="app-header-pill">
            Credits
          </Link>
          <Link href="/?step=intake" className="app-header-pill">
            Start
          </Link>
          <AccountCreditIndicator />
        </nav>
      </div>
    </header>
  );
}
