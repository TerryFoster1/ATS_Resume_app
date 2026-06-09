"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LoadingIndicator from "@/components/LoadingIndicator";
import StepIndicator from "@/components/StepIndicator";
import { SearchCardGraphic } from "@/components/VisualDecor";
import type { AnalyzeResponse } from "@/lib/types";

// Cycling subtexts shown under "Analyzing the job postingâ€¦" while
// /api/analyze is in flight. The phases are descriptive rather than
// literal â€” the analyze route runs the coverage engine in a single LLM
// call, but rotating these gives the user the sense that work is
// happening rather than the screen having frozen.
const ANALYZE_SUBTEXTS = [
  "Reading the posting like a recruiter",
  "Separating real requirements from company background copy",
  "Identifying likely proof, gap, and transferability signals"
];

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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const analyzeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeAndContinue = useCallback(async () => {
    if (analyzing) return;

    const jobPostText = textareaRef.current?.value ?? "";
    onChange(jobPostText);
    if (jobPostText.trim().length < 50) {
      setError("Paste a little more of the job posting before analyzing.");
      return;
    }

    setAnalyzing(true);
    setError(null);
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
      setError(
        err instanceof Error ? err.message : "Could not analyze the job post."
      );
    } finally {
      setAnalyzing(false);
    }
  }, [analyzing, onAnalyzed, onChange, onNext, resumeText]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleInput = () => onChange(textarea.value);
    textarea.addEventListener("input", handleInput);
    return () => textarea.removeEventListener("input", handleInput);
  }, [onChange]);

  useEffect(() => {
    const button = analyzeButtonRef.current;
    if (!button) return;

    button.addEventListener("click", analyzeAndContinue);
    return () => button.removeEventListener("click", analyzeAndContinue);
  }, [analyzeAndContinue]);

  return (
    <section className="space-y-5">
      <StepIndicator current={2} total={4} label="Job post" />

      <div className="app-screen-card space-y-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-stretch">
          <div className="app-consult-card p-6 sm:p-7">
            <p className="app-kicker">Step two</p>
            <h2 className="mt-2 text-3xl app-heading">Add the role you want</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-primary)]/72">
              Add the full posting so Career Ladder can identify what employers want,
              compare it against your profile or uploaded resume, and decide what needs
              clearer role-specific framing before generation.
            </p>
            <div className="flow-roadmap mt-5" aria-label="Application workflow preview">
              {["Job context", "Employer expectations", "Profile comparison", "Resume strategy"].map((label, index) => (
                <span key={label}><strong>{index + 1}</strong>{label}</span>
              ))}
            </div>
          </div>
          <div className="app-step-hero hidden p-7 lg:flex lg:items-center lg:justify-center">
            <SearchCardGraphic className="scale-110" />
          </div>
        </div>

        <div className="app-work-panel space-y-4 p-5 sm:p-6">
          <div>
            <label className="block text-sm font-black text-[var(--color-text-primary)]">
              Job posting URL
            </label>
            <input
              type="url"
              disabled
              className="app-input mt-3 bg-[#f9f4ee] text-[var(--color-text-muted)]"
              placeholder="Paste the full posting below for now"
            />
          </div>

          <label className="block text-sm font-black text-[var(--color-text-primary)]">
            Job description
          </label>
          <textarea
            ref={textareaRef}
            defaultValue={value}
            onChange={(e) => onChange(e.target.value)}
            rows={15}
            className="app-input min-h-[28rem] resize-y text-base leading-7"
            placeholder="Paste the full job posting here."
          />
          {error && <p className="text-xs text-rose-700">{error}</p>}
        </div>
      </div>

      {analyzing && (
        <LoadingIndicator
          message={"Analyzing the job posting\u2026"}
          messages={ANALYZE_SUBTEXTS}
        />
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={analyzing}
          className="app-button-secondary"
        >
          Back
        </button>
        <button
          ref={analyzeButtonRef}
          type="button"
          disabled={analyzing}
          className="app-button-primary"
        >
          {analyzing ? "Analyzing\u2026" : "Analyze"}
        </button>
      </div>
    </section>
  );
}



