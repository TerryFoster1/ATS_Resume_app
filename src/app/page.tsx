import Link from "next/link";
import AccountCreditIndicator from "@/components/AccountCreditIndicator";
import ResumeWizard from "@/components/ResumeWizard";

type Step = "intro" | "intake" | "intent" | "resume" | "job" | "analysis" | "generate" | "results";

const VALID_STEPS: Step[] = ["intro", "intake", "intent", "resume", "job", "analysis", "generate", "results"];

const FLOW = [
  "Choose the career service you need",
  "Add the role or opportunity context",
  "Translate your experience into hiring language",
  "Build a reusable career workspace"
];

const LADDER_STAGES = [
  {
    title: "Discover Your Direction",
    body: "Explore roles, strengths, preferences, and realistic pathways when you are not sure what the next move should be."
  },
  {
    title: "Build Your Professional Identity",
    body: "Use a living career profile to organize experience, projects, credentials, and achievements before generating tailored outputs."
  },
  {
    title: "Understand How Recruiters Think",
    body: "Prepare for interviews, screenings, and weak-area questions with guidance built around the actual role."
  },
  {
    title: "Transition Into New Opportunities",
    body: "Map undervalued experience into recruiter-readable evidence for adjacent roles and career changes."
  },
  {
    title: "Grow Throughout Your Career",
    body: "Keep opportunities, applications, preparation, and future learning decisions connected over time."
  }
];

const VALUE_PROPS = [
  {
    title: "Interprets real experience",
    body: "Career Ladder looks for the professional functions beneath your background, from customer trust and operations to coordination and judgment."
  },
  {
    title: "Builds around recruiter expectations",
    body: "Each workflow starts from the role, then helps you prepare the evidence, language, and stories a hiring team is likely to test."
  },
  {
    title: "Grows with your career",
    body: "Your master career profile becomes reusable context for resumes, interviews, pathways, and future opportunity tracking."
  }
];

const TRANSFERABLE_EXAMPLES = [
  {
    from: "Chef",
    to: "Operations Coordinator",
    skills: ["Inventory planning", "Vendor coordination", "Team scheduling", "Quality control"]
  },
  {
    from: "Retail Manager",
    to: "Customer Success",
    skills: ["Escalation handling", "Customer retention", "Team coaching", "Follow-through"]
  },
  {
    from: "Hospitality",
    to: "Account Management",
    skills: ["Relationship building", "Service recovery", "Prioritization", "Client communication"]
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
    <main className="space-y-8 sm:space-y-10">
      <ProductHeader />

      <section className="app-screen-card homepage-hero overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="p-6 sm:p-10 lg:p-12">
            <div className="flex flex-wrap gap-2">
              <span className="app-chip">Career intelligence platform</span>
              <span className="app-chip">Recruiter-aware guidance</span>
              <span className="app-chip">Transferable skill translation</span>
            </div>

            <h2 className="mt-7 max-w-3xl text-4xl font-black leading-tight text-[var(--color-text-primary)] sm:text-6xl">
              The platform that grows with your career.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--color-text-primary)]/74 sm:text-lg">
              Career Ladder helps you discover direction, translate your
              experience, tailor career materials, prepare for interviews, and
              keep building a professional identity that moves with you.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/?step=intake" className="app-button-primary text-base">
                Start building your career
              </Link>
              <Link href="/career-pathways" className="app-button-ghost text-base">
                Explore career pathways
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

      <section className="career-ladder-section">
        <div className="career-ladder-intro">
          <p className="app-section-label">Every rung of the ladder</p>
          <h2 className="mt-3 text-3xl app-heading sm:text-4xl">
            From first resume to career transition.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--color-text-muted)]">
            Career Ladder is designed as a long-term career workspace, not a
            one-time document generator. Each service uses the same role context
            and career memory so your preparation becomes more connected over time.
          </p>
        </div>

        <div className="career-rung-list">
          {LADDER_STAGES.map((stage, index) => (
            <article key={stage.title} className="career-rung">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{stage.title}</h3>
                <p>{stage.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="example-transformation" className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <TransformationVisual />
        <div className="transferable-story-panel">
          <p className="app-section-label">Transferable skill intelligence</p>
          <h2 className="mt-3 text-3xl app-heading">
            Your experience may be more valuable than your resume makes it look.
          </h2>
          <p className="mt-4 text-sm leading-7 text-[var(--color-text-muted)]">
            Career Ladder does not ask users to already know hiring-market
            language. It helps interpret real work, responsibilities, and
            pressure-tested judgment into recruiter-readable evidence.
          </p>

          <div className="mt-6 grid gap-3">
            {TRANSFERABLE_EXAMPLES.map((item) => (
              <article key={item.from} className="transferable-example-card">
                <div className="transferable-path">
                  <strong>{item.from}</strong>
                  <span aria-hidden>to</span>
                  <strong>{item.to}</strong>
                </div>
                <div className="transferable-skills">
                  {item.skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
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
          <p className="hero-label">Career intelligence</p>
          <h3>Hidden experience translated</h3>
        </div>
        <span>Profile-first</span>
      </div>

      <div className="hero-doc-stack" aria-label="Career intelligence preview">
        <article className="hero-document hero-document-before">
          <div className="hero-doc-topline">
            <span>Experience</span>
            <span>User language</span>
          </div>
          <h4>Chef & Shift Lead</h4>
          <p>
            Ran busy services, ordered supplies, trained new staff, handled
            timing, quality, and team communication.
          </p>
          <div className="hero-section-title">Raw signal</div>
          <ul>
            <li>Coordinated people, materials, and timing</li>
            <li>Maintained service quality under pressure</li>
            <li>Balanced cost, inventory, and customer experience</li>
          </ul>
        </article>

        <div className="hero-transform-rail" aria-hidden>
          <span>translated into hiring language</span>
        </div>

        <article className="hero-document hero-document-after">
          <div className="hero-doc-topline">
            <span>Positioned</span>
            <span>Recruiter-readable evidence</span>
          </div>
          <h4>Operations & Team Coordination</h4>
          <p>
            Coordinated daily operations, inventory planning, team scheduling,
            vendor communication, and quality control in high-pressure service environments.
          </p>
          <div className="hero-section-title">Career pathways</div>
          <ul>
            <li>Operations coordinator</li>
            <li>Customer success associate</li>
            <li>Project coordination support</li>
          </ul>
        </article>
      </div>

      <div className="hero-signal-grid">
        <article>
          <p>Recruiter lens</p>
          <strong>What proof will they test?</strong>
          <span>Map the role to evidence, gaps, and interview themes.</span>
        </article>
        <article>
          <p>Career memory</p>
          <strong>Master profile context</strong>
          <span>Reuse experience across resumes, pathways, and mock interviews.</span>
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
          <strong>Real experience becomes clearer when it is translated into the language hiring teams recognize.</strong>
        </div>
      </div>
      <div className="transformation-visual-copy">
        <p className="app-section-label">Example transformation</p>
        <h3 className="mt-3 text-2xl app-heading">
          From overlooked work to credible career evidence.
        </h3>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          Career Ladder helps users see the professional function inside their
          background without inventing claims or inflating titles.
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
