"use client";

import type { MatchClassification, MatchEvaluation } from "@/lib/types";

const STATUS_LABEL: Record<MatchClassification, string> = {
  MATCH: "Match",
  PARTIAL: "Partial",
  CLARIFY: "Needs Clarification",
  MISSING: "Missing"
};

const STATUS_STYLES: Record<
  MatchClassification,
  { dot: string; pill: string; border: string }
> = {
  MATCH: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-800 border-emerald-200",
    border: "border-l-emerald-500"
  },
  PARTIAL: {
    dot: "bg-amber-400",
    pill: "bg-amber-50 text-amber-800 border-amber-200",
    border: "border-l-amber-400"
  },
  CLARIFY: {
    dot: "bg-orange-500",
    pill: "bg-orange-50 text-orange-800 border-orange-200",
    border: "border-l-orange-500"
  },
  MISSING: {
    dot: "bg-rose-500",
    pill: "bg-rose-50 text-rose-800 border-rose-200",
    border: "border-l-rose-500"
  }
};

const LENS_LABEL: Record<string, string> = {
  DIRECT: "Direct match",
  SEMANTIC: "Synonym match",
  CLUSTER_TRANSFER: "Transferable cluster",
  EXPERIENCE_YEARS: "Experience-year math",
  STRONGER_EXPERIENCE: "Stronger experience",
  TOOL_CATEGORY: "Same tool category",
  NONE: "No lens fired"
};

interface Props {
  match: MatchEvaluation;
  answer?: string;
  question?: string;
  transformedBullet?: string | null;
  expanded?: boolean;
  onToggle?: () => void;
  onAnswerChange?: (answer: string) => void;
}

export default function RequirementRow({
  match,
  answer = "",
  question: coachedQuestion,
  transformedBullet,
  expanded = false,
  onToggle,
  onAnswerChange
}: Props) {
  const style = STATUS_STYLES[match.classification];
  const statusLabel = STATUS_LABEL[match.classification];
  const lensLabel = LENS_LABEL[match.lens] ?? match.lens;
  const actionable = match.classification !== "MATCH";
  const question = coachedQuestion ?? match.clarificationQuestion ?? defaultQuestion(match);

  return (
    <li
      role={actionable ? "button" : undefined}
      tabIndex={actionable ? 0 : undefined}
      aria-expanded={actionable ? expanded : undefined}
      onClick={actionable ? onToggle : undefined}
      onKeyDown={(e) => {
        if (!actionable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle?.();
        }
      }}
      className={`rounded-[18px] border border-[var(--color-border-light)] border-l-4 bg-white p-4 shadow-[var(--shadow-card)] ${
        actionable
          ? "cursor-pointer transition hover:border-[var(--color-accent-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,140,66,0.15)]"
          : ""
      } ${style.border}`}
    >
      <div className="flex w-full items-start justify-between gap-3 text-left">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className={`mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
          />
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              {match.requirementText}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${style.pill}`}
              >
                {statusLabel}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
                {match.requirementImportance} importance - {lensLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {actionable && (
            <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-800">
              {answer.trim() ? "Answered" : expanded ? "Close" : "Add context"}
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
              match.requirementImportance === "HIGH"
                ? "bg-[var(--color-accent-purple)] text-white"
                : "border border-[var(--color-border-light)] bg-white text-[var(--color-text-primary)]"
            }`}
          >
            {match.requirementImportance}
          </span>
        </div>
      </div>

      {match.reasoning && (
        <dl className="mt-3 space-y-1 pl-[22px] text-xs text-[var(--color-text-muted)]">
          <div className="flex gap-2">
            <dt className="w-12 shrink-0 font-semibold text-[var(--color-text-muted)]">why</dt>
            <dd>{match.reasoning}</dd>
          </div>
          {match.clarificationQuestion && (
            <div className="flex gap-2">
              <dt className="w-12 shrink-0 font-semibold text-[var(--color-text-muted)]">ask</dt>
              <dd className="italic text-[var(--color-text-primary)]/80">
                &ldquo;{match.clarificationQuestion}&rdquo;
              </dd>
            </div>
          )}
        </dl>
      )}

      {actionable && expanded && (
        <div
          className="mt-4 space-y-2 rounded-[18px] border border-[color-mix(in_srgb,var(--color-accent-orange)_20%,white)] bg-[color-mix(in_srgb,var(--color-accent-orange)_8%,white)] p-3"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <label className="block text-sm font-semibold text-[var(--color-text-primary)]">
            {question}
          </label>
          <textarea
            value={answer}
            onChange={(e) => onAnswerChange?.(e.target.value)}
            rows={3}
            className="app-input"
            placeholder="Short answers are fine, like: yes, mostly budgeting and spreadsheets."
          />
          {transformedBullet && (
            <div className="rounded-[18px] border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-900">
              <p className="font-semibold">Will add as resume content:</p>
              <p className="mt-1">- {transformedBullet}</p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function defaultQuestion(match: MatchEvaluation): string {
  if (match.classification === "MISSING") {
    return `What experience do you have with "${match.requirementText}", and where did you use it?`;
  }
  if (match.classification === "PARTIAL") {
    return `What example shows the scope, tools, or results behind "${match.requirementText}"?`;
  }
  return `Can you clarify your experience with "${match.requirementText}"?`;
}
