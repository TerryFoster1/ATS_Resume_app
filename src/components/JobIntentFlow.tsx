"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  composeJobContextText,
  INTENT_JOB_CONTEXT_KEY,
  type JobContext,
  type JobIntent
} from "@/lib/intentWorkflow";

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
    id: "firstResume",
    title: "Build My First Resume",
    description: "Find useful experience even if you have never written a resume.",
    eyebrow: "Guided discovery",
    contextCopy:
      "Career Ladder will help you identify responsibility, service, school, community, and achievement evidence before structuring it professionally.",
    experienceMode: "none",
    startLabel: "Build First Resume"
  },
  {
    id: "careerDiscovery",
    title: "Discover Career Direction",
    description: "Explore strengths, preferences, and realistic adjacent paths.",
    eyebrow: "Career discovery",
    contextCopy:
      "Career Ladder can explore your interests, strengths, and work preferences without pretending a quiz can predict your future.",
    experienceMode: "none",
    startLabel: "Explore Direction"
  },
  {
    id: "resume",
    title: "Tailor My Resume",
    description: "Position your experience for a specific role.",
    eyebrow: "Resume positioning",
    contextCopy:
      "The role context helps Career Ladder understand what the recruiter is likely trying to prove before it rewrites your resume.",
    experienceMode: "recommended",
    startLabel: "Continue to Resume Tailoring"
  },
  {
    id: "resumeCoverLetter",
    title: "Resume + Cover Letter",
    description: "Create a tailored application package.",
    eyebrow: "Application package",
    contextCopy:
      "The posting helps connect your resume and cover letter to the same hiring expectations, not two disconnected documents.",
    experienceMode: "required",
    startLabel: "Continue to Application Package"
  },
  {
    id: "interviewPrep",
    title: "Prepare for an Interview",
    description: "Prepare for the questions a recruiter is most likely to test.",
    eyebrow: "Interview readiness",
    contextCopy:
      "Paste the posting to generate more realistic recruiter-style interview questions and sharper prep notes.",
    experienceMode: "recommended",
    startLabel: "Generate Interview Prep"
  },
  {
    id: "mockInterview",
    title: "Practice a Mock Interview",
    description: "Answer one question at a time and tighten your framing.",
    eyebrow: "Practice room",
    contextCopy:
      "The role context helps the mock interview ask questions that feel closer to a real recruiter screen.",
    experienceMode: "recommended",
    startLabel: "Start Mock Interview"
  },
  {
    id: "careerPathway",
    title: "Explore a Career Path",
    description: "Map transferable strengths, likely gaps, and next steps.",
    eyebrow: "Pathway analysis",
    contextCopy:
      "Paste the posting to compare your current experience against real hiring expectations for this path.",
    experienceMode: "recommended",
    startLabel: "Create Pathway Preview"
  },
  {
    id: "tracking",
    title: "Track Applications & Offers",
    description: "Manage opportunities, interviews, and application progress.",
    eyebrow: "Pipeline beta",
    contextCopy:
      "Track the role as an opportunity so your materials, prep, and next steps stay connected.",
    experienceMode: "none",
    startLabel: "Open Dashboard",
    beta: true
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
          <p className="app-kicker">Career services</p>
          <h2 className="mt-3 text-4xl app-heading">What would you like help with?</h2>
          <p className="mt-4 text-base leading-7 text-[var(--color-text-muted)]">
            Choose the outcome first. Career Ladder will ask for only the role
            and experience context needed to interpret the opportunity with a
            recruiter lens.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {GOALS.map((goal) => (
            <button
              key={goal.id}
              type="button"
              onClick={() => continueFromGoal(goal.id)}
              className="app-mini-card group min-h-[13rem] text-left transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(17,35,63,0.1)]"
            >
              <span className="app-kicker">{goal.beta ? "Beta service" : goal.eyebrow}</span>
              <strong className="mt-3 block text-xl app-heading">{goal.title}</strong>
              <span className="mt-3 block text-sm leading-6 text-[var(--color-text-muted)]">
                {goal.description}
              </span>
              <span className="mt-5 inline-flex text-sm font-black text-[#245f9f]">
                {goal.id === "tracking" ? "Open workspace" : "Choose this path"}
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

function FirstResumeDiscovery({
  onBack,
  onComplete
}: {
  onBack: () => void;
  onComplete: (resumeDraft: string, profileContext: string) => void;
}) {
  const [responsibility, setResponsibility] = useState("");
  const [helping, setHelping] = useState("");
  const [recognition, setRecognition] = useState("");
  const [community, setCommunity] = useState("");
  const [goals, setGoals] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const canContinue = [responsibility, helping, recognition, community, goals].some(
    (value) => value.trim().length >= 12
  );

  async function complete() {
    if (!canContinue) return;
    const profileContext = [
      responsibility && `Responsibility or leadership: ${responsibility}`,
      helping && `People, service, or teamwork: ${helping}`,
      recognition && `Recognition or achievements: ${recognition}`,
      community && `School, club, community, or activity experience: ${community}`,
      goals && `Career direction: ${goals}`
    ].filter(Boolean).join("\n");
    const skills = inferFirstResumeSkills(profileContext);
    const resumeDraft = [
      "Candidate",
      "",
      "PROFESSIONAL SUMMARY",
      "Emerging professional with experience that can be framed through responsibility, service, teamwork, learning agility, and follow-through.",
      "",
      "KEY SKILLS",
      skills.join(", "),
      "",
      "EXPERIENCE AND ACTIVITIES",
      responsibility && `- ${responsibility}`,
      helping && `- ${helping}`,
      community && `- ${community}`,
      recognition && `- ${recognition}`,
      "",
      goals && "CAREER GOALS",
      goals && `- ${goals}`
    ].filter(Boolean).join("\n");
    setSavingProfile(true);
    try {
      const response = await fetch("/api/career-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "firstResumeDiscovery",
          responsibilities: responsibility || undefined,
          helpingExperience: helping || undefined,
          recognition: recognition || undefined,
          schoolCommunity: community || undefined,
          goals: goals || undefined
        })
      });
      const data = (await response.json().catch(() => ({}))) as { resumeText?: string };
      if (response.ok && data.resumeText) {
        onComplete(data.resumeText, profileContext);
        return;
      }
    } catch {
      // Signed-out users can still continue with a session-only first resume draft.
    } finally {
      setSavingProfile(false);
    }
    onComplete(resumeDraft, profileContext);
  }

  return (
    <section className="app-screen-card space-y-7">
      <FlowHeader
        eyebrow="My first resume"
        title="Let's find experience worth translating."
        body="You do not need polished resume bullets yet. Answer in plain language and Career Ladder will turn responsibility, service, activities, and recognition into a professional starting point."
        onBack={onBack}
        backLabel="Change goal"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <DiscoveryPrompt
          label="Responsibility or leadership"
          value={responsibility}
          onChange={setResponsibility}
          prompt="Have you ever been trusted with responsibility, leadership, opening or closing, training, organizing, or keeping something on track?"
        />
        <DiscoveryPrompt
          label="People, service, or teamwork"
          value={helping}
          onChange={setHelping}
          prompt="Have you helped customers, classmates, teammates, coworkers, family members, or community groups solve problems or get things done?"
        />
        <DiscoveryPrompt
          label="Recognition or achievement"
          value={recognition}
          onChange={setRecognition}
          prompt="Have you received recognition, awards, scholarships, honors, good feedback, promotions, or trusted responsibilities?"
        />
        <DiscoveryPrompt
          label="Activities and community"
          value={community}
          onChange={setCommunity}
          prompt="Have you helped organize clubs, teams, school events, sports, volunteering, community activities, or informal projects?"
        />
      </div>
      <DiscoveryPrompt
        label="Career direction"
        value={goals}
        onChange={setGoals}
        prompt="What kind of role, work environment, or future step are you curious about right now?"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
          The first draft is a starting point. You can upload a resume later and keep enriching your Master Career Profile over time.
        </p>
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
  const [savingProfile, setSavingProfile] = useState(false);
  const canContinue = [interests, strengths, preferences, energy].some((value) => value.trim().length >= 12);

  async function complete() {
    if (!canContinue) return;
    const context = [
      interests && `Interests: ${interests}`,
      strengths && `Strengths: ${strengths}`,
      preferences && `Work preferences: ${preferences}`,
      energy && `Energy patterns and environment: ${energy}`
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
          energyPatterns: energy || undefined
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
          prompt="What kinds of work leave you energized, and what kinds tend to drain you?"
        />
      </div>
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
