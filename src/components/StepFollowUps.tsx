"use client";

import StepIndicator from "@/components/StepIndicator";
import type { FollowUp } from "@/lib/types";

interface Props {
  followUps: FollowUp[];
  onChange: (followUps: FollowUp[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function StepFollowUps({
  followUps,
  onChange,
  onBack,
  onNext
}: Props) {
  function update(id: string, answer: string) {
    onChange(followUps.map((f) => (f.id === id ? { ...f, answer } : f)));
  }

  return (
    <section className="space-y-5">
      <StepIndicator current={4} total={5} label="Questions" />

      <div className="app-card-warm space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl app-heading">
            A few quick clarifications
          </h2>
          <p className="text-sm text-[var(--color-text-primary)]/70">
            These questions target specific gaps from your analysis. A one- or
            two-sentence answer gives us the evidence to rewrite your resume
            around your real experience &mdash; not filler.
          </p>
        </div>

        {followUps.length > 0 && (
          <p className="app-card-inset px-4 py-3 text-xs font-semibold text-[var(--color-text-primary)]">
            Answer only what you can confirm. Short answers are fine.
          </p>
        )}

        {followUps.length === 0 ? (
          <p className="text-sm text-[var(--color-text-primary)]/70">
            No clarifications needed &mdash; every requirement is already
            covered. Continue to generation.
          </p>
        ) : (
          <ul className="space-y-4">
            {followUps.map((f) => (
              <li key={f.id} className="space-y-2">
                <label className="block text-sm font-semibold text-[var(--color-text-primary)]">
                  {f.question}
                </label>
                {f.alternativeTools && f.alternativeTools.length > 0 && (
                  <p className="text-[11px] text-[var(--color-text-primary)]/55">
                    Comparable tools: {f.alternativeTools.join(", ")}
                  </p>
                )}
                <textarea
                  value={f.answer}
                  onChange={(e) => update(f.id, e.target.value)}
                  rows={3}
                  className="app-input"
                  placeholder="Short answer"
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="app-button-secondary"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="app-button-primary"
        >
          Generate
        </button>
      </div>
    </section>
  );
}


