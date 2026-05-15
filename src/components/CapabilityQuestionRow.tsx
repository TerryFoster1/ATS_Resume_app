"use client";

import type { CSSProperties } from "react";
import type { CapabilityQuestionCluster } from "@/lib/analysis/capabilityQuestionClusters";
import {
  buildResultRefinementQuestion,
  evaluateAnswerEvidenceQuality,
  shouldAskForResultRefinement
} from "@/lib/analysis/answerEvidenceQuality";

const COVERAGE_LABEL: Record<CapabilityQuestionCluster["coverage"], string> = {
  missing: "Needs detail",
  partial: "Could be stronger",
  transferable: "Quick check"
};

const RAIL_COLOR: Record<CapabilityQuestionCluster["coverage"], string> = {
  missing: "#ff7a18",
  partial: "#f2b84b",
  transferable: "#2d1e4a"
};

const PILL_STYLES: Record<CapabilityQuestionCluster["coverage"], string> = {
  missing: "bg-orange-50 text-orange-800",
  partial: "bg-amber-50 text-amber-800",
  transferable: "bg-purple-50 text-[var(--color-accent-purple)]"
};

interface Props {
  cluster: CapabilityQuestionCluster;
  answer?: string;
  transformedBullet?: string | null;
  expanded?: boolean;
  onToggle?: () => void;
  onAnswerChange?: (answer: string) => void;
}

export default function CapabilityQuestionRow({
  cluster,
  answer = "",
  onAnswerChange
}: Props) {
  const answered = answer.trim().length > 0;
  const quality = evaluateAnswerEvidenceQuality(answer);
  const showWeakAnswerCue = answered && quality.strength === "weak";
  const showResultRefinement = answered && !showWeakAnswerCue && shouldAskForResultRefinement(answer);
  const answerLabel = answered
    ? quality.strength === "strong" || quality.strength === "good"
      ? "Strong detail"
      : "Answered"
    : COVERAGE_LABEL[cluster.coverage];
  const refinementText = showWeakAnswerCue
    ? "What did you do, what was it used for, and what changed or improved because of it?"
    : buildResultRefinementQuestion({
        question: cluster.question,
        jobAdReference: cluster.jobAdReference,
        capabilityId: cluster.id,
        requirementText: cluster.primaryMatch.requirementText,
        answer
      });

  return (
    <li
      className="app-question-card"
      style={{ "--question-rail": RAIL_COLOR[cluster.coverage] } as CSSProperties}
    >
      <div className="space-y-5 pl-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black ${PILL_STYLES[cluster.coverage]}`}
              >
                {answerLabel}
              </span>
              <span className="text-[11px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">
                {cluster.importance} impact
              </span>
            </div>
            <h3 className="text-xl leading-7 app-heading">
              {cluster.question}
            </h3>
          </div>
        </div>

        <div className="rounded-[20px] bg-[#f8f4ef] p-4 text-sm">
          <p className="text-xs font-black uppercase tracking-wide text-[var(--color-accent-purple)]">
            Why we&apos;re asking
          </p>
          <p className="mt-1 leading-6 text-[var(--color-text-primary)]/72">
            {cluster.userFacingReason}
          </p>
          <blockquote className="mt-3 border-l-4 border-[var(--color-accent-orange)] pl-3 leading-6 text-[var(--color-text-primary)]">
            &ldquo;{cluster.jobAdReference}&rdquo;
          </blockquote>
        </div>

        <textarea
          value={answer}
          onChange={(e) => onAnswerChange?.(e.target.value)}
          rows={4}
          className="app-input min-h-[120px] resize-y"
          placeholder="Short answers are fine. For example: yes, I used spreadsheets to track contact lists and follow-ups."
        />

        {(showWeakAnswerCue || showResultRefinement) && (
          <div className="rounded-[18px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-[var(--color-text-primary)]">
            <p className="text-xs font-black uppercase tracking-wide text-orange-700">
              {showWeakAnswerCue
                ? "A little more context would help"
                : "One more detail would make this stronger"}
            </p>
            <p className="mt-1 leading-6">{refinementText}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">
              Add the detail to your answer above if you have it. No exact numbers needed unless you know them.
            </p>
          </div>
        )}
      </div>
    </li>
  );
}
