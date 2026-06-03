import Link from "next/link";
import AccountCreditIndicator from "@/components/AccountCreditIndicator";
import ResumeWizard from "@/components/ResumeWizard";

type Step = "intro" | "intake" | "intent" | "resume" | "job" | "analysis" | "generate" | "results";

const VALID_STEPS: Step[] = ["intro", "intake", "intent", "resume", "job", "analysis", "generate", "results"];

const HELP_ITEMS = [
  {
    title: "Find resume gaps",
    body: "See what may be making your experience easy to miss."
  },
  {
    title: "Translate experience",
    body: "Turn real work into recruiter-readable evidence."
  },
  {
    title: "Tailor applications",
    body: "Position your resume and cover letter for the role."
  },
  {
    title: "Prepare for interviews",
    body: "Understand likely questions and hiring concerns."
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
          <h2>
            Not getting interviews?
            <span>Let's fix what's holding you back.</span>
          </h2>
          <p>
            Career Ladder reviews your resume, identifies gaps, translates your experience
            into recruiter-ready language, and helps you prepare for the jobs you actually want.
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
            Not sure what direction to take? Try Career Coach -&gt;
          </Link>
          <div className="cl-v2-trust-row">
            <span>Free to get started</span>
            <span>No credit card required</span>
            <span>Save your career profile</span>
          </div>
        </div>
        <ExperienceTranslationVisual />
      </section>

      <section className="cl-v2-help-strip" id="resources">
        <h2>Career Ladder helps you move forward without guessing.</h2>
        <div className="cl-v2-help-grid">
          {HELP_ITEMS.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
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

function ExperienceTranslationVisual() {
  const responsibilities = [
    "Managed staff",
    "Handled customer complaints",
    "Tracked store performance",
    "Trained new employees"
  ];
  const skills = [
    "Customer Retention",
    "Escalation Management",
    "Performance Coaching",
    "Team Leadership",
    "Relationship Building",
    "Process Improvement"
  ];
  const paths = [
    "Customer Success",
    "Account Management",
    "Client Success",
    "Customer Experience",
    "Customer Onboarding"
  ];

  return (
    <div className="cl-v2-translation-visual" aria-label="Experience translation example">
      <article className="cl-v2-translation-card is-source">
        <span className="cl-v2-translation-label">Your experience</span>
        <h3>Retail Manager</h3>
        <p>Current responsibilities</p>
        <ul>
          {responsibilities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>

      <div className="cl-v2-translation-flow" aria-hidden>
        <span>to</span>
      </div>

      <article className="cl-v2-translation-card is-skills">
        <span className="cl-v2-translation-label">Career Ladder Translation</span>
        <h3>What employers actually see</h3>
        <ul>
          {skills.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>
          The skills you use every day often have more value than their job title suggests.
        </p>
      </article>

      <div className="cl-v2-translation-flow is-secondary" aria-hidden>
        <span>to</span>
      </div>

      <article className="cl-v2-translation-card is-paths">
        <span className="cl-v2-translation-label">Relevant opportunities</span>
        <h3>Roles where that experience can matter</h3>
        <ul>
          {paths.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>

      <p className="cl-v2-translation-insight">
        Your experience may already qualify you for more opportunities than you realize.
      </p>
    </div>
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
