"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  composeJobContextText,
  INTENT_JOB_CONTEXT_KEY,
  type JobContext,
  type JobIntent
} from "@/lib/intentWorkflow";
import {
  inferDiscoveryInsights,
  inferTransitionRecommendations,
  inferTransferableSkillSignals
} from "@/lib/careerIntelligence";

type Props = {
  initialContextText?: string;
  onResumeIntent: (contextText: string, resumeText?: string) => void;
};

type ParseResumeResult = {
  text?: string;
  warning?: string;
  profileEnriched?: boolean;
  profileImportWarning?: string;
  error?: string;
};

type GoalId = JobIntent | "tracking" | "firstResume" | "careerDiscovery";
type Stage = "goal" | "context" | "experience" | "firstResume" | "careerDiscovery";

type GoalConfig = {
  id: GoalId;
  title: string;
  description: string;
  eyebrow: string;
  contextCopy: string;
  experienceMode: "required" | "recommended" | "optional" | "none";
  startLabel: string;
  beta?: boolean;
};

const GOALS: GoalConfig[] = [
  {
    id: "careerDiscovery",
    title: "Plan My Career",
    description: "Find realistic directions based on your experience, goals, and constraints.",
    eyebrow: "Career strategy",
    contextCopy:
      "Career Ladder can explore your interests, strengths, and work preferences without pretending a quiz can predict your future.",
    experienceMode: "none",
    startLabel: "Start"
  },
  {
    id: "resume",
    title: "Apply for a Position",
    description: "Position your background for a specific role and recruiter review.",
    eyebrow: "Application strategy",
    contextCopy:
      "The role context helps Career Ladder understand what the recruiter is likely trying to prove before it rewrites your resume.",
    experienceMode: "recommended",
    startLabel: "Start"
  },
  {
    id: "interviewPrep",
    title: "Prepare for an Interview",
    description: "Practice likely questions and prepare stronger proof for the role.",
    eyebrow: "Interview readiness",
    contextCopy:
      "Paste the posting to generate more realistic recruiter-style interview questions and sharper prep notes.",
    experienceMode: "recommended",
    startLabel: "Start"
  }
];

const FIRST_RESUME_EXAMPLES = [
  {
    label: "Clubs, teams, or sports",
    signal: "coordination, discipline, teamwork, leadership, and commitment",
    why: "Recruiters care because teammates relying on you is evidence of accountability, communication, and consistency."
  },
  {
    label: "Family business or caregiving",
    signal: "reliability, service, responsibility, scheduling, and practical judgment",
    why: "Recruiters care because informal responsibility can still prove trust, maturity, and real-world problem solving."
  },
  {
    label: "Side hustles or creative projects",
    signal: "initiative, customer awareness, follow-through, and learning agility",
    why: "Recruiters care because self-started work shows initiative, execution, and learning without someone assigning every step."
  },
  {
    label: "Volunteering or community help",
    signal: "service orientation, communication, organization, and trust",
    why: "Recruiters care because service work often shows empathy, reliability, coordination, and follow-through."
  }
];

export default function JobIntentFlow({
  initialContextText = "",
  onResumeIntent
}: Props) {
  const initial = useMemo(() => readInitialContext(initialContextText), [initialContextText]);
  const [targetRole, setTargetRole] = useState(initial.targetRole);
  const [companyName, setCompanyName] = useState(initial.companyName ?? "");
  const [jobPosting, setJobPosting] = useState(initial.jobPosting ?? "");
  const [currentBackground, setCurrentBackground] = useState(initial.currentBackground ?? "");
  const [resumeText, setResumeText] = useState(initial.resumeText ?? "");
  const [resumeFileName, setResumeFileName] = useState(initial.resumeFileName ?? "");
  const [resumeWarning, setResumeWarning] = useState<string | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalId | null>(null);
  const [stage, setStage] = useState<Stage>("goal");
  const [busyIntent, setBusyIntent] = useState<JobIntent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedConfig = GOALS.find((goal) => goal.id === selectedGoal) ?? null;
  const context: JobContext = useMemo(
    () => ({
      targetRole,
      companyName,
      jobPosting,
      currentBackground,
      resumeText,
      resumeFileName
    }),
    [companyName, currentBackground, jobPosting, resumeFileName, resumeText, targetRole]
  );
  const contextText = composeJobContextText(context);
  const canContinue = targetRole.trim().length >= 2 || jobPosting.trim().length >= 20;
  const hasResumeContext = resumeText.trim().length > 80;

  const handleResumeUpload = useCallback(async (file: File | null) => {
    if (!file) return;
    setResumeUploading(true);
    setResumeWarning(null);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("enrichProfile", "1");
      const response = await fetch("/api/parse-resume", {
        method: "POST",
        body: form
      });
      const data = (await response.json().catch(() => ({}))) as ParseResumeResult;
      if (!response.ok || !data.text) {
        throw new Error(data.error ?? "Could not read that resume file.");
      }
      setResumeText(data.text);
      setResumeFileName(file.name);
      setResumeWarning(data.profileImportWarning ?? data.warning ?? null);
    } catch (err) {
      setResumeText("");
      setResumeFileName("");
      setResumeWarning(null);
      setError(err instanceof Error ? err.message : "Could not read that resume file.");
    } finally {
      setResumeUploading(false);
    }
  }, []);

  const handleIntent = useCallback(
    async (intent: JobIntent) => {
      setError(null);
      if (!canContinue) {
        setStage("context");
        setError("Add a target role or paste enough of the job posting first.");
        return;
      }

      if (intent === "resume" || intent === "resumeCoverLetter") {
        persistContext(context);
        onResumeIntent(contextText, resumeText.trim() || undefined);
        return;
      }

      setBusyIntent(intent);
      persistContext(context);
      try {
        const response = await fetch("/api/opportunities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetRole: targetRole.trim() || undefined,
            companyName: companyName.trim() || undefined,
            jobPosting: jobPosting.trim() || undefined,
            currentBackground: currentBackground.trim() || undefined,
            resumeText: resumeText.trim() || undefined,
            resumeFileName: resumeFileName.trim() || undefined,
            intent
          })
        });

        if (response.status === 401) {
          const next = `/?step=intent&intent=${encodeURIComponent(intent)}`;
          window.location.href = `/auth?next=${encodeURIComponent(next)}`;
          return;
        }

        const data = (await response.json().catch(() => ({}))) as {
          id?: string;
          error?: string;
        };
        if (!response.ok || !data.id) {
          throw new Error(data.error ?? "Could not create this opportunity.");
        }

        if (intent === "mockInterview") {
          window.location.href = `/outputs/${data.id}/interview?start=1`;
          return;
        }
        if (intent === "careerPathway") {
          window.location.href = `/outputs/${data.id}?intent=pathway`;
          return;
        }
        window.location.href = `/outputs/${data.id}?intent=interview-prep`;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start this workflow.");
      } finally {
        setBusyIntent(null);
      }
    },
    [
      canContinue,
      companyName,
      context,
      contextText,
      currentBackground,
      jobPosting,
      onResumeIntent,
      resumeFileName,
      resumeText,
      targetRole
    ]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    if (mode === "firstResume") {
      params.delete("mode");
      const next = `${window.location.pathname}?${params.toString()}`.replace(/\?$/, "");
      window.history.replaceState(null, "", next);
      setSelectedGoal("firstResume");
      setStage("firstResume");
      return;
    }
    const intent = params.get("intent") as JobIntent | null;
    if (!intent || !GOALS.some((item) => item.id === intent)) return;
    setSelectedGoal(intent);
    if (canContinue) {
      params.delete("intent");
      const next = `${window.location.pathname}?${params.toString()}`.replace(/\?$/, "");
      window.history.replaceState(null, "", next);
      const timer = window.setTimeout(() => void handleIntent(intent), 300);
      return () => window.clearTimeout(timer);
    }
    setStage("context");
  }, [canContinue, handleIntent]);

  function continueFromGoal(goal: GoalId) {
    setError(null);
    setSelectedGoal(goal);
    if (goal === "tracking") {
      window.location.href = "/dashboard";
      return;
    }
    if (goal === "firstResume") {
      setStage("firstResume");
      return;
    }
    if (goal === "careerDiscovery") {
      setStage("careerDiscovery");
      return;
    }
    setStage("context");
    window.history.replaceState(null, "", "/?step=intake");
  }

  function continueFromContext() {
    setError(null);
    if (!selectedConfig || selectedConfig.id === "tracking") {
      setStage("goal");
      return;
    }
    if (!canContinue) {
      setError("Add a target role or paste enough of the job posting first.");
      return;
    }
    persistContext(context);
    if (selectedConfig.experienceMode === "none") {
      if (isJobIntent(selectedConfig.id)) void handleIntent(selectedConfig.id);
      return;
    }
    setStage("experience");
  }

  function startSelectedGoal() {
    if (!selectedConfig || selectedConfig.id === "tracking") return;
    persistContext(context);
    if (isJobIntent(selectedConfig.id)) void handleIntent(selectedConfig.id);
  }

  if (stage === "goal") {
    return (
      <section className="app-screen-card space-y-7">
        <div className="max-w-3xl">
          <p className="app-kicker">Choose your next step</p>
          <h2 className="mt-3 text-3xl app-heading sm:text-4xl">What would you like help with?</h2>
          <p className="mt-3 text-base leading-7 text-[var(--color-text-muted)]">
            Start with one clear goal. Career Ladder will ask only for the context
            needed to help you move forward with a recruiter-aware lens.
          </p>
        </div>

        <JourneyModelStrip />

        <div className="grid gap-4 lg:grid-cols-3">
          {GOALS.map((goal) => (
            <button
              key={goal.id}
              type="button"
              onClick={() => continueFromGoal(goal.id)}
              className="app-mini-card group min-h-[11.5rem] text-left transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(17,35,63,0.1)]"
            >
              <span className="app-kicker">{goal.eyebrow}</span>
              <strong className="mt-3 block text-xl app-heading">{goal.title}</strong>
              <span className="mt-3 block text-sm leading-6 text-[var(--color-text-muted)]">
                {goal.description}
              </span>
              <span className="mt-5 inline-flex text-sm font-black text-[#245f9f]">
                Start
              </span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (stage === "context") {
    return (
      <section className="app-screen-card space-y-7">
        <FlowHeader
          eyebrow={selectedConfig?.eyebrow ?? "Role context"}
          title="Add the role context."
          body={
            selectedConfig?.contextCopy ??
            "The role context helps Career Ladder understand what recruiters are likely evaluating."
          }
          onBack={() => {
            setStage("goal");
            window.history.replaceState(null, "", "/?step=intake");
          }}
          backLabel="Change goal"
        />

        <FlowRoadmap goal={selectedConfig?.id ?? null} />

        <div className="grid gap-4 lg:grid-cols-[0.8fr_0.8fr_1.4fr]">
          <label className="block text-sm font-black text-[var(--color-text-primary)]">
            Target role
            <input
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value)}
              className="app-input mt-3"
              placeholder="Customer Success Manager"
            />
          </label>
          <label className="block text-sm font-black text-[var(--color-text-primary)]">
            Company optional
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              className="app-input mt-3"
              placeholder="RECODemand"
            />
          </label>
          <label className="block text-sm font-black text-[var(--color-text-primary)]">
            Job posting or role description optional, strongly encouraged
            <textarea
              value={jobPosting}
              onChange={(event) => setJobPosting(event.target.value)}
              className="app-input mt-3 min-h-[12rem] resize-y"
              placeholder="Paste the posting so the analysis can separate real role expectations from company background copy."
            />
          </label>
        </div>

        {error && <InlineError message={error} />}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
            Job-title-only mode works for interview and pathway exploration. The full
            posting makes recruiter expectations, likely concerns, and transferable
            skill gaps more specific.
          </p>
          <button type="button" onClick={continueFromContext} className="app-button-primary">
            Continue
          </button>
        </div>
      </section>
    );
  }

  if (stage === "firstResume") {
    return (
      <FirstResumeDiscovery
        onBack={() => setStage("goal")}
        onComplete={(resumeDraft, profileContext) => {
          persistContext({
            ...context,
            currentBackground: [currentBackground, profileContext].filter(Boolean).join("\n\n"),
            resumeText: resumeDraft,
            resumeFileName: "Career Ladder first resume draft"
          });
          onResumeIntent(
            composeJobContextText({
              ...context,
              currentBackground: [currentBackground, profileContext].filter(Boolean).join("\n\n")
            }),
            resumeDraft
          );
        }}
      />
    );
  }

  if (stage === "careerDiscovery") {
    return (
      <CareerDiscoveryFoundation
        onBack={() => setStage("goal")}
        onContinue={(discoveryContext) => {
          setCurrentBackground(discoveryContext);
          setSelectedGoal("careerPathway");
          setStage("context");
        }}
      />
    );
  }

  return (
    <section className="app-screen-card space-y-7">
      <FlowHeader
        eyebrow="Experience context"
        title={experienceTitle(selectedConfig)}
        body={experienceBody(selectedConfig)}
        onBack={() => setStage("context")}
        backLabel="Edit role context"
      />

      <ProfileContextPanel goal={selectedConfig?.id ?? null} hasResumeContext={hasResumeContext} />

      <section className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="app-mini-card bg-gradient-to-br from-white to-[#eef6ff]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="app-kicker">
                {selectedConfig?.experienceMode === "required" ? "Primary input" : "Recommended input"}
              </p>
              <h3 className="mt-2 text-2xl app-heading">Upload your current resume.</h3>
            </div>
            {selectedConfig?.experienceMode === "required" && (
              <span className="rounded-full bg-[#143456] px-3 py-1 text-xs font-black text-white">
                Required next
              </span>
            )}
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
            Career Ladder can extract your existing evidence, translate transferable
            strengths, and compare your background against the role through a
            recruiter-aware lens.
          </p>

          <label className="mt-5 flex cursor-pointer flex-col items-start gap-3 rounded-[22px] border border-dashed border-[#9dc4e8] bg-white/78 p-5 transition hover:-translate-y-0.5 hover:border-[#2f80ed] hover:shadow-[0_18px_38px_rgba(47,128,237,0.14)]">
            <input
              type="file"
              accept=".pdf,.docx,.txt,.text,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="sr-only"
              disabled={resumeUploading}
              onChange={(event) => void handleResumeUpload(event.target.files?.[0] ?? null)}
            />
            <span className="text-sm font-black text-[var(--color-text-primary)]">
              {resumeUploading ? "Reading your resume..." : hasResumeContext ? "Resume added" : "Upload resume"}
            </span>
            <span className="text-sm leading-6 text-[var(--color-text-muted)]">
              {hasResumeContext
                ? `${resumeFileName || "Resume"} will power skill-gap analysis, recruiter interpretation, interview prep, and pathway recommendations.`
                : "PDF, DOCX, or TXT. This becomes the primary evidence source for career analysis."}
            </span>
          </label>

          {resumeWarning && (
            <p className="mt-3 rounded-[16px] bg-white px-4 py-3 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
              {resumeWarning}
            </p>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {["Skill-gap analysis", "Recruiter interpretation", "Interview prep"].map((item) => (
              <span key={item} className="rounded-full bg-white px-3 py-2 text-center text-xs font-black text-[#245f9f] shadow-[var(--shadow-inset-soft)]">
                {item}
              </span>
            ))}
          </div>
        </div>

        <label className="app-mini-card block text-sm font-black text-[var(--color-text-primary)]">
          Additional context optional
          <span className="mt-2 block text-sm font-normal leading-6 text-[var(--color-text-muted)]">
            Add anything the resume might not explain clearly. This is a secondary
            signal, not another task to complete.
          </span>
          <textarea
            value={currentBackground}
            onChange={(event) => setCurrentBackground(event.target.value)}
            className="app-input mt-4 min-h-[9rem] resize-y"
            placeholder="Examples: I'm changing industries. My resume is outdated. I have freelance experience not listed."
          />
        </label>
      </section>

      {error && <InlineError message={error} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
          You likely already have more relevant experience than you think.
          Career Ladder helps translate it into recruiter-readable language.
        </p>
        <button
          type="button"
          onClick={startSelectedGoal}
          disabled={Boolean(busyIntent || resumeUploading)}
          className="app-button-primary"
        >
          {busyIntent ? "Starting..." : selectedConfig?.startLabel ?? "Continue"}
        </button>
      </div>
    </section>
  );
}

function JourneyModelStrip() {
  return <div className="career-journey-strip" aria-label="Career Ladder journeys"><span><strong>1</strong> Build your profile</span><span><strong>2</strong> Plan your direction</span><span><strong>3</strong> Win opportunities</span></div>;
}

function FlowRoadmap({ goal }: { goal: GoalId | null }) {
  const steps = goal === "interviewPrep" ? ["Analyze the role", "Identify recruiter expectations", "Generate likely questions", "Practice with feedback"] : ["Add role context", "Read what employers want", "Compare with your profile", "Generate stronger materials"];
  return <div className="flow-roadmap" aria-label="Workflow preview">{steps.map((step, index) => <span key={step}><strong>{index + 1}</strong>{step}</span>)}</div>;
}

function ProfileContextPanel({ goal, hasResumeContext }: { goal: GoalId | null; hasResumeContext: boolean }) {
  const items = goal === "interviewPrep" ? ["saved profile evidence", "uploaded resume details", "role requirements", "likely recruiter concerns"] : ["saved profile evidence", "uploaded resume details", "target role requirements", "transferable strengths"];
  return (
    <section className="profile-context-panel">
      <div><p className="app-kicker">Using your career profile</p><h3 className="mt-2 text-xl app-heading">Career Ladder keeps the context connected.</h3><p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{hasResumeContext ? "Your uploaded resume will work with any saved profile evidence for this step." : "If you have saved profile evidence, Career Ladder can use it before relying on this upload alone."}</p></div>
      <div className="profile-context-tags">{items.map((item) => <span key={item}>{item}</span>)}</div>
    </section>
  );
}

function FirstResumeCoverageGuide() {
  const areas = ["Work or responsibility", "Education or coursework", "Volunteer or community", "Sports, clubs, or activities", "Projects or side hustles", "Awards or recognition", "Languages, software, or tools", "Career goals"];
  return (
    <section className="first-resume-coverage">
      <div><p className="app-kicker">Profile builder interview</p><h3 className="mt-2 text-xl app-heading">We will look for experience people often leave out.</h3><p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">The goal is not to fill a template. It is to uncover evidence that can become your first career profile.</p></div>
      <div className="first-resume-coverage-grid">{areas.map((area) => <span key={area}>{area}</span>)}</div>
    </section>
  );
}

type FirstResumeSectionKey =
  | "personalInfo"
  | "workExperience"
  | "education"
  | "volunteerWork"
  | "projects"
  | "skills"
  | "toolsSoftware"
  | "equipmentTools"
  | "languages"
  | "awards"
  | "hobbies"
  | "careerGoals";

type FirstResumeSection = {
  key: FirstResumeSectionKey;
  title: string;
  explanation: string;
  prompt: string;
  placeholder: string;
};

const FIRST_RESUME_SECTIONS: FirstResumeSection[] = [
  { key: "personalInfo", title: "Personal Info", explanation: "Basic contact and location details make the resume usable.", prompt: "What name, city, email, phone, or LinkedIn should this resume use?", placeholder: "Name, city, email, phone, LinkedIn..." },
  { key: "workExperience", title: "Work Experience", explanation: "Paid or informal work gives recruiters proof of responsibility.", prompt: "Have you worked a job, helped a family business, done babysitting, tutoring, delivery, retail, food service, or other paid work?", placeholder: "Describe the role, where it happened, and what you were trusted to do." },
  { key: "education", title: "Education", explanation: "School, coursework, and training help explain your current foundation.", prompt: "What school, program, coursework, training, or graduation details should be included?", placeholder: "School, program, relevant courses, graduation year..." },
  { key: "volunteerWork", title: "Volunteer Work", explanation: "Volunteer and community experience can show service, trust, and follow-through.", prompt: "Have you volunteered, helped at events, supported community groups, or taken responsibility without being paid?", placeholder: "What you helped with, who benefited, and what responsibility you had." },
  { key: "projects", title: "Projects", explanation: "Projects prove initiative, learning, creativity, and execution.", prompt: "Have you built, organized, created, researched, fixed, designed, or launched anything?", placeholder: "School project, portfolio piece, online project, event, side project..." },
  { key: "skills", title: "Skills", explanation: "Skills help Career Ladder translate your experience into recruiter-readable language.", prompt: "What are you good at? Include communication, organization, problem solving, customer service, writing, analysis, teamwork, or leadership.", placeholder: "Communication, customer service, organization, writing..." },
  { key: "toolsSoftware", title: "Tools & Software", explanation: "Software and tools often make a candidate look more ready for the role.", prompt: "What apps, platforms, software, or digital tools have you used?", placeholder: "Excel, Google Docs, Canva, POS systems, CRM tools, social platforms..." },
  { key: "equipmentTools", title: "Equipment / Physical Tools", explanation: "Physical tools and equipment can show safety, precision, trade exposure, and practical judgment.", prompt: "Have you used equipment, machinery, kitchen tools, shop tools, lab tools, devices, or safety gear?", placeholder: "Kitchen equipment, power tools, cash systems, lab equipment..." },
  { key: "languages", title: "Languages", explanation: "Languages can support customer-facing, service, community, and global roles.", prompt: "What languages do you speak, read, or write?", placeholder: "English, French, Spanish, Arabic... include comfort level if useful." },
  { key: "awards", title: "Awards", explanation: "Recognition can prove reliability, achievement, growth, and trust.", prompt: "Have you received awards, scholarships, honors, certificates, promotions, praise, or recognition?", placeholder: "Award name, who gave it, and what it recognized." },
  { key: "hobbies", title: "Hobbies / Interests", explanation: "Interests can reveal career direction and hidden strengths when used carefully.", prompt: "What hobbies, interests, communities, or topics do you spend time on?", placeholder: "Sports, coding, photography, gaming communities, writing, fitness..." },
  { key: "careerGoals", title: "Career Goals", explanation: "Goals help Career Ladder recommend the right next step instead of creating a generic resume.", prompt: "What kind of job, industry, lifestyle, or future are you aiming toward?", placeholder: "I want a first job in retail, a stable office role, remote work, trades exposure..." }
];

function FirstResumeDiscovery({
  onBack,
  onComplete
}: {
  onBack: () => void;
  onComplete: (resumeDraft: string, profileContext: string) => void;
}) {
  const [answers, setAnswers] = useState<Record<FirstResumeSectionKey, string>>(() =>
    Object.fromEntries(FIRST_RESUME_SECTIONS.map((section) => [section.key, ""])) as Record<FirstResumeSectionKey, string>
  );
  const [activeKey, setActiveKey] = useState<FirstResumeSectionKey>("personalInfo");
  const [savingProfile, setSavingProfile] = useState(false);
  const activeSection = FIRST_RESUME_SECTIONS.find((section) => section.key === activeKey) ?? FIRST_RESUME_SECTIONS[0];
  const completedSections = FIRST_RESUME_SECTIONS.filter((section) => answers[section.key].trim().length >= 8);
  const canContinue = completedSections.length >= 2 || answers.careerGoals.trim().length >= 12;
  const combinedContext = FIRST_RESUME_SECTIONS
    .map((section) => answers[section.key].trim() ? section.title + ": " + answers[section.key].trim() : "")
    .filter(Boolean)
    .join("\n");
  const signals = inferTransferableSkillSignals(combinedContext, answers.careerGoals);

  function updateAnswer(key: FirstResumeSectionKey, value: string) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  async function complete() {
    if (!canContinue) return;
    const skills = inferFirstResumeSkills(combinedContext);
    const resumeDraft = [
      answers.personalInfo.trim() || "Candidate",
      "",
      "PROFESSIONAL SUMMARY",
      "Emerging professional with experience that can be framed through responsibility, service, teamwork, learning agility, and follow-through.",
      "",
      "KEY SKILLS",
      skills.join(", "),
      "",
      "EXPERIENCE AND ACTIVITIES",
      ...FIRST_RESUME_SECTIONS
        .filter((section) => !["personalInfo", "skills", "careerGoals"].includes(section.key))
        .map((section) => answers[section.key].trim() ? "- " + section.title + ": " + answers[section.key].trim() : "")
        .filter(Boolean),
      "",
      answers.careerGoals.trim() ? "CAREER GOALS" : "",
      answers.careerGoals.trim() ? "- " + answers.careerGoals.trim() : ""
    ].filter(Boolean).join("\n");
    setSavingProfile(true);
    try {
      const response = await fetch("/api/career-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "firstResumeDiscovery",
          responsibilities: [answers.workExperience, answers.projects, answers.equipmentTools].filter(Boolean).join("\n") || undefined,
          helpingExperience: [answers.volunteerWork, answers.hobbies].filter(Boolean).join("\n") || undefined,
          recognition: answers.awards || undefined,
          schoolCommunity: [answers.education, answers.languages, answers.toolsSoftware].filter(Boolean).join("\n") || undefined,
          goals: answers.careerGoals || undefined
        })
      });
      const data = (await response.json().catch(() => ({}))) as { resumeText?: string };
      if (response.ok && data.resumeText) {
        onComplete(data.resumeText, combinedContext);
        return;
      }
    } catch {
      // Signed-out users can still continue with a session-only first resume draft.
    } finally {
      setSavingProfile(false);
    }
    onComplete(resumeDraft, combinedContext);
  }

  return (
    <section className="app-screen-card space-y-7">
      <FlowHeader
        eyebrow="My first resume"
        title="Build your first resume from real life experience."
        body="Use the checklist to uncover work, school, community, tools, languages, interests, and goals. Career Ladder will turn the useful pieces into recruiter-readable evidence."
        onBack={onBack}
        backLabel="Change goal"
      />
      <section className="first-resume-builder-grid">
        <div className="first-resume-checklist-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="app-kicker">Guided checklist</p>
              <h3 className="mt-2 text-xl app-heading">{completedSections.length} of {FIRST_RESUME_SECTIONS.length} sections started</h3>
            </div>
            <span className="upload-insight-status">Profile builder</span>
          </div>
          <div className="first-resume-section-list">
            {FIRST_RESUME_SECTIONS.map((section) => {
              const complete = answers[section.key].trim().length >= 8;
              return (
                <button
                  type="button"
                  key={section.key}
                  onClick={() => setActiveKey(section.key)}
                  className={activeKey === section.key ? "is-active" : ""}
                >
                  <span>{complete ? "Started" : "Start"}</span>
                  <strong>{section.title}</strong>
                  <small>{section.explanation}</small>
                </button>
              );
            })}
          </div>
        </div>
        <div className="first-resume-editor-panel">
          <p className="app-kicker">{answers[activeSection.key].trim().length >= 8 ? "Editing section" : "Start section"}</p>
          <h3 className="mt-2 text-2xl app-heading">{activeSection.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{activeSection.prompt}</p>
          <textarea
            value={answers[activeSection.key]}
            onChange={(event) => updateAnswer(activeSection.key, event.target.value)}
            className="app-input mt-4 min-h-[11rem] resize-y"
            placeholder={activeSection.placeholder}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {FIRST_RESUME_SECTIONS.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveKey(section.key)}
                className={section.key === activeKey ? "first-resume-mini-nav is-active" : "first-resume-mini-nav"}
              >
                {section.title}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="app-mini-card bg-gradient-to-br from-white to-[#eef6ff]">
        <p className="app-kicker">What this can prove</p>
        <h3 className="mt-2 text-2xl app-heading">Career Ladder looks for professional evidence, not perfect resume language.</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {signals.slice(0, 3).map((signal) => (
            <article key={signal.mapsTo} className="rounded-[18px] bg-white px-4 py-3 shadow-[var(--shadow-inset-soft)]">
              <strong className="block text-sm font-black text-[var(--color-text-primary)]">{signal.source}</strong>
              <span className="mt-2 block text-sm leading-6 text-[var(--color-text-muted)]">Can support {signal.mapsTo}. In resume language: {signal.recruiterLanguage}</span>
              <span className="mt-2 block text-xs font-semibold leading-5 text-[var(--color-text-muted)]">Evidence to look for: {signal.evidenceExamples.slice(0, 2).join("; ")}.</span>
            </article>
          ))}
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-xs font-semibold leading-5 text-[var(--color-text-muted)]">You do not need to complete every section today. Add enough real evidence to create a credible starting draft.</p>
        <button type="button" disabled={!canContinue || savingProfile} onClick={() => void complete()} className="app-button-primary disabled:cursor-not-allowed disabled:opacity-50">
          {savingProfile ? "Building profile..." : "Create first resume draft"}
        </button>
      </div>
    </section>
  );
}

function CareerDiscoveryFoundation({
  onBack,
  onContinue
}: {
  onBack: () => void;
  onContinue: (context: string) => void;
}) {
  const [interests, setInterests] = useState("");
  const [strengths, setStrengths] = useState("");
  const [preferences, setPreferences] = useState("");
  const [energy, setEnergy] = useState("");
  const [ambition, setAmbition] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const insights = inferDiscoveryInsights({ interests, strengths, preferences, energy, ambition });
  const transitionIdeas = inferTransitionRecommendations([interests, strengths, preferences, energy, ambition].join("\n"));
  const canContinue = [interests, strengths, preferences, energy, ambition].some((value) => value.trim().length >= 12);

  async function complete() {
    if (!canContinue) return;
    const context = [
      interests && `Interests: ${interests}`,
      strengths && `Strengths: ${strengths}`,
      preferences && `Work preferences: ${preferences}`,
      energy && `Energy patterns and environment: ${energy}`,
      ambition && `Ambition, income, and learning tolerance: ${ambition}`
    ].filter(Boolean).join("\n");
    setSavingProfile(true);
    try {
      await fetch("/api/career-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "careerDiscovery",
          interests: interests || undefined,
          strengths: strengths || undefined,
          workPreferences: preferences || undefined,
          energyPatterns: energy || undefined,
          goals: ambition || undefined
        })
      });
    } catch {
      // Signed-out users can still continue with session-only discovery context.
    } finally {
      setSavingProfile(false);
    }
    onContinue(context);
  }

  return (
    <section className="app-screen-card space-y-7">
      <FlowHeader
        eyebrow="Career discovery"
        title="Explore direction without forcing a career quiz."
        body="Career Ladder looks for patterns in what gives you energy, where you already show strength, and what kinds of work environments may be worth exploring."
        onBack={onBack}
        backLabel="Change goal"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <DiscoveryPrompt
          label="Interests"
          value={interests}
          onChange={setInterests}
          prompt="What topics, industries, problems, or types of work are you naturally curious about?"
        />
        <DiscoveryPrompt
          label="Strengths"
          value={strengths}
          onChange={setStrengths}
          prompt="What do people tend to trust you with? Think communication, organizing, fixing, explaining, planning, selling, analyzing, or helping."
        />
        <DiscoveryPrompt
          label="Work preferences"
          value={preferences}
          onChange={setPreferences}
          prompt="Do you prefer structure or variety, people-facing work or focused work, steady routines or ambiguous problems?"
        />
        <DiscoveryPrompt
          label="Energy and lifestyle"
          value={energy}
          onChange={setEnergy}
          prompt="What kinds of work leave you energized, and what kinds tend to drain you? Include stress, remote work, structure, or balance needs."
        />
        <DiscoveryPrompt
          label="Ambition and constraints"
          value={ambition}
          onChange={setAmbition}
          prompt="What matters right now: better pay, lower stress, faster growth, remote work, stability, learning something new, or a realistic pivot?"
        />
      </div>
      <section className="app-mini-card bg-gradient-to-br from-white to-[#eef6ff]">
        <p className="app-kicker">Early pattern read</p>
        <h3 className="mt-2 text-2xl app-heading">Possible directions Career Ladder is noticing.</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(insights.length ? insights : [
            {
              theme: "Career signal",
              interpretation: "Add a little more detail and Career Ladder will look for realistic career patterns, not personality labels.",
              possibleDirections: ["career pathway exploration"]
            }
          ]).map((insight) => (
            <article key={insight.theme} className="rounded-[18px] bg-white px-4 py-3 shadow-[var(--shadow-inset-soft)]">
              <strong className="block text-sm font-black text-[var(--color-text-primary)]">
                {insight.theme}
              </strong>
              <span className="mt-2 block text-sm leading-6 text-[var(--color-text-muted)]">
                {insight.interpretation}
              </span>
              <span className="mt-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#245f9f]">
                {insight.possibleDirections.join(" / ")}
              </span>
            </article>
          ))}
        </div>
      </section>
      {transitionIdeas.length ? (
        <section className="app-mini-card">
          <p className="app-kicker">Possible transition logic</p>
          <h3 className="mt-2 text-2xl app-heading">Early paths that may be worth testing.</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {transitionIdeas.slice(0, 4).map((idea) => (
              <article key={`${idea.title}-${idea.category}`} className="rounded-[18px] bg-white px-4 py-3 shadow-[var(--shadow-inset-soft)]">
                <strong className="block text-sm font-black text-[var(--color-text-primary)]">
                  {idea.title}
                </strong>
                <span className="mt-2 block text-sm leading-6 text-[var(--color-text-muted)]">
                  {idea.whyRealistic}
                </span>
                <span className="mt-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#245f9f]">
                  First move: {idea.firstMove}
                </span>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
          This is not a personality test. It is a starting context for realistic pathway exploration.
        </p>
        <button type="button" disabled={!canContinue || savingProfile} onClick={() => void complete()} className="app-button-primary disabled:cursor-not-allowed disabled:opacity-50">
          {savingProfile ? "Saving direction..." : "Explore possible paths"}
        </button>
      </div>
    </section>
  );
}

function DiscoveryPrompt({
  label,
  prompt,
  value,
  onChange
}: {
  label: string;
  prompt: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="app-mini-card block text-sm font-black text-[var(--color-text-primary)]">
      {label}
      <span className="mt-2 block text-sm font-normal leading-6 text-[var(--color-text-muted)]">
        {prompt}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="app-input mt-4 min-h-[8rem] resize-y"
        placeholder="Plain language is fine. Career Ladder will help structure it."
      />
    </label>
  );
}

function inferFirstResumeSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const skills = new Set(["Communication", "Reliability", "Teamwork"]);
  if (/lead|trusted|responsib|train|organize|captain/.test(lower)) skills.add("Leadership");
  if (/customer|help|service|community|classmate|teammate/.test(lower)) skills.add("Service orientation");
  if (/event|schedule|club|team|project/.test(lower)) skills.add("Coordination");
  if (/award|honou?r|scholarship|recognition|promot/.test(lower)) skills.add("Achievement focus");
  if (/busy|pressure|conflict|solve|fix/.test(lower)) skills.add("Problem solving");
  return [...skills];
}

function FlowHeader({
  eyebrow,
  title,
  body,
  onBack,
  backLabel
}: {
  eyebrow: string;
  title: string;
  body: string;
  onBack: () => void;
  backLabel: string;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-3xl">
        <p className="app-kicker">{eyebrow}</p>
        <h2 className="mt-3 text-4xl app-heading">{title}</h2>
        <p className="mt-4 text-base leading-7 text-[var(--color-text-muted)]">{body}</p>
      </div>
      <button type="button" onClick={onBack} className="app-button-ghost">
        {backLabel}
      </button>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <p className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
      {message}
    </p>
  );
}

function experienceTitle(goal: GoalConfig | null) {
  if (goal?.id === "careerPathway") return "Add the experience Career Ladder should interpret.";
  if (goal?.id === "interviewPrep" || goal?.id === "mockInterview") {
    return "Add experience for more realistic practice.";
  }
  return "Add the resume Career Ladder should work from.";
}

function experienceBody(goal: GoalConfig | null) {
  if (goal?.id === "careerPathway") {
    return "A resume gives the pathway analysis real evidence to compare against the target role. Extra context can help when you are changing industries or your resume is incomplete.";
  }
  if (goal?.id === "interviewPrep" || goal?.id === "mockInterview") {
    return "You can continue with job context alone, but a resume helps the questions and feedback reflect your actual background.";
  }
  return "Resume upload is the strongest way to preserve your real experience while tailoring it toward the role.";
}

function readInitialContext(initialContextText: string): JobContext {
  if (typeof window !== "undefined") {
    try {
      const saved = window.sessionStorage.getItem(INTENT_JOB_CONTEXT_KEY);
      if (saved) return JSON.parse(saved) as JobContext;
    } catch {
      // Ignore malformed session data.
    }
  }

  const role = initialContextText.match(/^job\s*title\s*:\s*(.+)$/im)?.[1]?.trim() ?? "";
  const company = initialContextText.match(/^company\s*:\s*(.+)$/im)?.[1]?.trim() ?? "";
  const postingMatch = initialContextText.match(/(?:^|\n)job posting:\s*\n([\s\S]*)$/i);
  const backgroundMatch = initialContextText.match(/(?:^|\n)current background:\s*\n([\s\S]*?)(?:\n\s*job posting:|$)/i);
  return {
    targetRole: role,
    companyName: company,
    currentBackground: backgroundMatch?.[1]?.trim() || undefined,
    jobPosting: postingMatch?.[1]?.trim() || undefined
  };
}

function persistContext(context: JobContext) {
  try {
    window.sessionStorage.setItem(INTENT_JOB_CONTEXT_KEY, JSON.stringify(context));
  } catch {
    // Session storage is a convenience only.
  }
}

function isJobIntent(value: GoalId): value is JobIntent {
  return value === "resume" || value === "resumeCoverLetter" || value === "interviewPrep" || value === "mockInterview" || value === "careerPathway";
}

