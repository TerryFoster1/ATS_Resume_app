"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import LoadingIndicator from "@/components/LoadingIndicator";
import StepIndicator from "@/components/StepIndicator";
import type { AnalyzeResponse } from "@/lib/types";

const ANALYZE_SUBTEXTS = [
  "Reading the role like a recruiter",
  "Breaking down what the employer needs",
  "Comparing the role against your resume evidence"
];

type TargetMode = "description" | "title" | "saved";

interface Props {
  value: string;
  onChange: (text: string) => void;
  onBack: () => void;
  onNext: () => void;
  resumeText: string;
  onAnalyzed: (partial: Partial<AnalyzeResponse>) => void;
}

export default function StepJobPost({
  value,
  onChange,
  onBack,
  onNext,
  resumeText,
  onAnalyzed
}: Props) {
  const [mode, setMode] = useState<TargetMode>("description");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState(value);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasResumeContext = resumeText.trim().length >= 50;

  const analyzeAndContinue = useCallback(async () => {
    if (analyzing) return;
    if (mode === "saved") {
      setError("Open a saved opportunity from your dashboard, or choose another targeting option here.");
      return;
    }

    const jobPostText = mode === "title"
      ? buildJobTitleOnlyContext(jobTitle)
      : jobDescription.trim();

    if (mode === "title" && jobTitle.trim().length < 2) {
      setError("Enter the job title you want to target.");
      return;
    }
    if (mode === "description" && jobPostText.length < 50) {
      setError("Paste a little more of the job description before analyzing.");
      return;
    }

    setAnalyzing(true);
    setError(null);
    onChange(jobPostText);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobPostText })
      });
      if (!res.ok) throw new Error(await res.text());
      const data: AnalyzeResponse = await res.json();
      onAnalyzed(data);
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not analyze this role.");
    } finally {
      setAnalyzing(false);
    }
  }, [analyzing, jobDescription, jobTitle, mode, onAnalyzed, onChange, onNext, resumeText]);

  function updateDescription(next: string) {
    setJobDescription(next);
    onChange(next);
  }

  return (
    <section className="space-y-5">
      <StepIndicator current={2} total={4} label="Target role" />

      <div className="app-screen-card space-y-6">
        <div className="max-w-3xl">
          <h2 className="text-3xl app-heading sm:text-4xl">What job are you targeting?</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)] sm:text-base">
            We&apos;ll break down what the role needs, compare it to your profile, and help position your experience.
          </p>
        </div>

        {hasResumeContext && (
          <div className="app-soft-band px-4 py-4 text-sm text-[var(--color-text-primary)]">
            <strong>Resume Added {"\u2713"}</strong>
            <span className="mt-2 block leading-6 text-[var(--color-text-muted)]">
              Career Ladder will combine your uploaded resume, Master Career Profile,
              transferable skills, and this target role context for the analysis.
            </span>
          </div>
        )}

        <div className="job-target-options" role="tablist" aria-label="Job targeting options">
          <button type="button" className={mode === "description" ? "is-active" : ""} onClick={() => setMode("description")}>
            <strong>Paste job description</strong>
            <span>Best when you have the posting.</span>
          </button>
          <button type="button" className={mode === "title" ? "is-active" : ""} onClick={() => setMode("title")}>
            <strong>Enter job title</strong>
            <span>Useful for early exploration.</span>
          </button>
          <button type="button" className={mode === "saved" ? "is-active" : ""} onClick={() => setMode("saved")}>
            <strong>Choose saved opportunity</strong>
            <span>Continue from your dashboard.</span>
          </button>
        </div>

        {mode === "description" && (
          <div className="app-work-panel space-y-4 p-5 sm:p-6">
            <label className="block text-sm font-black text-[var(--color-text-primary)]">
              Paste the job description
              <span className="mt-2 block text-sm font-normal leading-6 text-[var(--color-text-muted)]">
                Add the full posting for the strongest read on requirements, proof gaps, keywords, and likely recruiter concerns.
              </span>
              <textarea
                value={jobDescription}
                onChange={(event) => updateDescription(event.target.value)}
                rows={13}
                className="app-input mt-3 min-h-[22rem] resize-y text-base leading-7"
                placeholder="Paste the full job description here."
              />
            </label>
          </div>
        )}

        {mode === "title" && (
          <div className="app-work-panel space-y-4 p-5 sm:p-6">
            <label className="block text-sm font-black text-[var(--color-text-primary)]">
              Job title
              <input
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                className="app-input mt-3"
                placeholder="Project Manager, Customer Success Manager, Operations Coordinator..."
              />
            </label>
            <p className="rounded-[18px] bg-white px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)] shadow-[var(--shadow-inset-soft)]">
              Job-title mode uses common role expectations. Paste a full posting later when you want more precise recruiter concerns and keyword coverage.
            </p>
          </div>
        )}

        {mode === "saved" && (
          <div className="app-work-panel p-5 sm:p-6">
            <h3 className="text-xl app-heading">Continue from a saved opportunity.</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
              Saved opportunities already have role context, materials, interview prep, and tracking in one workspace.
            </p>
            <Link href="/dashboard" className="app-button-primary mt-5 inline-flex">Open dashboard</Link>
          </div>
        )}

        <div className="flow-roadmap" aria-label="Application workflow preview">
          {["Break down role needs", "Compare to your profile", "Position your experience", "Generate materials"].map((label, index) => (
            <span key={label}><strong>{index + 1}</strong>{label}</span>
          ))}
        </div>

        {error && <p className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">{error}</p>}
      </div>

      {analyzing && <LoadingIndicator message="Analyzing the role..." messages={ANALYZE_SUBTEXTS} />}

      <div className="flex justify-between">
        <button type="button" onClick={onBack} disabled={analyzing} className="app-button-secondary">Back</button>
        <button type="button" disabled={analyzing || mode === "saved"} onClick={analyzeAndContinue} className="app-button-primary">
          {analyzing ? "Analyzing..." : mode === "title" ? "Analyze Job Title" : "Analyze Job"}
        </button>
      </div>
    </section>
  );
}

function buildJobTitleOnlyContext(title: string) {
  const cleanTitle = title.trim();
  return [
    "Target job title: " + cleanTitle,
    "",
    "Analyze typical employer expectations, likely responsibilities, recruiter concerns, transferable skills, and resume positioning for this role.",
    "Use this as an early role analysis because no full job posting was provided."
  ].join("\n");
}
