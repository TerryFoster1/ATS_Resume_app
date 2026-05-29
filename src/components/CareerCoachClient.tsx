"use client";

import { useMemo, useState } from "react";
import { generateCareerCoachMatches, type CareerCoachInput } from "@/lib/careerCoach";

const QUESTIONS: Array<{ key: keyof CareerCoachInput; label: string; prompt: string }> = [
  {
    key: "currentExperience",
    label: "Current experience",
    prompt: "What have you done so far? Include jobs, school, service work, caregiving, side projects, clubs, trades, or anything people trusted you with."
  },
  {
    key: "interests",
    label: "Interests and curiosity",
    prompt: "What topics, problems, industries, hobbies, or types of work naturally hold your attention?"
  },
  {
    key: "workPreferences",
    label: "Work preferences",
    prompt: "Do you prefer people-facing work, focused analysis, structure, variety, leadership, independent work, or solving practical problems?"
  },
  {
    key: "lifestyleGoals",
    label: "Lifestyle goals",
    prompt: "What are you optimizing for: remote work, lower stress, better pay, stability, flexibility, growth, or a healthier pace?"
  },
  {
    key: "ambition",
    label: "Ambition and timeline",
    prompt: "How quickly do you want to move, how much income pressure exists, and how much growth or leadership do you want?"
  },
  {
    key: "learningTolerance",
    label: "Learning tolerance",
    prompt: "Are you willing to study, complete a low-cost certificate, build a portfolio example, or learn new tools?"
  },
  {
    key: "financialConstraints",
    label: "Budget constraints",
    prompt: "What budget limits should the path respect? Free resources only, low-cost courses, college programs, or open to investing later?"
  },
  {
    key: "education",
    label: "Education",
    prompt: "What education, training, certifications, licenses, or informal learning should Career Ladder consider?"
  }
];

const EMPTY_INPUT: CareerCoachInput = {
  currentExperience: "",
  interests: "",
  workPreferences: "",
  lifestyleGoals: "",
  ambition: "",
  learningTolerance: "",
  timeline: "",
  financialConstraints: "",
  education: ""
};

export default function CareerCoachClient() {
  const [answers, setAnswers] = useState<CareerCoachInput>(EMPTY_INPUT);
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const current = QUESTIONS[step];
  const matches = useMemo(() => generateCareerCoachMatches(answers), [answers]);
  const progress = Math.round(((step + 1) / QUESTIONS.length) * 100);

  function update(value: string) {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [current.key]: value }));
  }

  return (
    <div className="space-y-6">
      <section className="app-screen-card">
        <p className="app-kicker">Career Coach MVP</p>
        <h1 className="mt-3 text-3xl app-heading sm:text-5xl">Figure out your next realistic move.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--color-text-muted)]">
          Answer in plain language. Career Ladder looks for transferable strengths, lifestyle constraints, recruiter concerns, and realistic paths that explain why your experience may already count in a new way.
        </p>
      </section>

      {!showResults ? (
        <section className="app-mini-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="app-kicker">Question {step + 1} of {QUESTIONS.length}</p>
              <h2 className="mt-2 text-2xl app-heading">{current.label}</h2>
            </div>
            <span className="rounded-full bg-[#eef6ff] px-3 py-2 text-xs font-black text-[#245f9f]">
              {progress}% complete
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-[var(--color-text-muted)]">{current.prompt}</p>
          <textarea
            value={answers[current.key]}
            onChange={(event) => update(event.target.value)}
            className="app-input mt-5 min-h-[12rem] resize-y"
            placeholder="Plain language is enough. Career Ladder will translate the career signal."
          />
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} className="app-button-ghost">
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (step < QUESTIONS.length - 1) setStep((value) => value + 1);
                else setShowResults(true);
              }}
              className="app-button-primary"
            >
              {step < QUESTIONS.length - 1 ? "Continue" : "See career matches"}
            </button>
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="app-mini-card">
            <p className="app-kicker">Career coach results</p>
            <h2 className="mt-2 text-3xl app-heading">Top realistic directions to explore.</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
              These are starting hypotheses, not fixed labels. The goal is to show which paths are realistic, what evidence recruiters will look for, and where your current experience may already translate.
            </p>
          </div>
          {matches.map((match) => (
            <article key={match.title} className="app-screen-card space-y-5">
              <div>
                <p className="app-kicker">Career match</p>
                <h3 className="mt-2 text-3xl app-heading">{match.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{match.whyItFits}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <CoachBlock title="Why this could be realistic" items={match.whyRealistic} />
                <CoachBlock title="Day in the life" items={[match.dayInLife]} />
                <CoachBlock title="Salary expectations" items={[match.salaryExpectation]} />
                <CoachBlock title="AI disruption risk" items={[match.aiDisruptionRisk]} />
                <CoachBlock title="What recruiters will want proof of" items={match.recruiterExpectations} />
                <CoachBlock title="Typical credentials" items={match.typicalCredentials} />
                <CoachBlock title="Fastest path" items={match.fastestPath} />
                <CoachBlock title="Lowest-cost path" items={match.lowestCostPath} />
                <CoachBlock title="Hiring outlook" items={[match.hiringOutlook]} />
                <CoachBlock title="Transferable strengths" items={match.transferableStrengths} />
                <CoachBlock title="Likely challenges" items={match.likelyChallenges} />
                <CoachBlock title="Likely recruiter concerns" items={match.likelyRecruiterConcerns} />
              </div>
            </article>
          ))}
          <div className="flex flex-wrap gap-3">
            <a href="/?step=intake" className="app-button-primary">Use one of these goals</a>
            <button type="button" onClick={() => setShowResults(false)} className="app-button-ghost">
              Adjust answers
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function CoachBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[20px] bg-white px-4 py-4 shadow-[var(--shadow-inset-soft)]">
      <h4 className="text-sm font-black text-[var(--color-text-primary)]">{title}</h4>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm leading-6 text-[var(--color-text-muted)]">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
