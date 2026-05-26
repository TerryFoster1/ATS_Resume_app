"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export default function InterviewPrepPreviewFunnel() {
  const [company, setCompany] = useState("");
  const [posting, setPosting] = useState("");
  const preview = useMemo(() => buildPreview(company, posting), [company, posting]);

  return (
    <aside className="app-mini-card">
      <p className="app-kicker">Free preview</p>
      <h2 className="mt-3 text-xl app-heading">Try one recruiter-style question.</h2>
      <div className="mt-5 grid gap-3">
        <label className="text-sm font-black text-[var(--color-text-primary)]">
          Company optional
          <input
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            className="app-input mt-2"
            placeholder="Shopify"
          />
        </label>
        <label className="text-sm font-black text-[var(--color-text-primary)]">
          Paste a few lines from the posting optional
          <textarea
            value={posting}
            onChange={(event) => setPosting(event.target.value)}
            className="app-input mt-2 min-h-[8rem] resize-y"
            placeholder="Mention account ownership, renewals, onboarding, CRM, client success metrics..."
          />
        </label>
      </div>

      <div className="mt-5 rounded-[22px] bg-[#eef6ff] p-4">
        <span className="app-kicker">Likely question</span>
        <p className="mt-2 text-base font-black leading-7 text-[#143456]">
          {preview.question}
        </p>
      </div>
      <div className="mt-3 grid gap-3">
        <p className="text-sm leading-6 text-[var(--color-text-muted)]">
          <strong className="text-[var(--color-text-primary)]">Recruiter insight: </strong>
          {preview.insight}
        </p>
        <p className="text-sm leading-6 text-[var(--color-text-muted)]">
          <strong className="text-[var(--color-text-primary)]">Prepare this: </strong>
          {preview.recommendation}
        </p>
      </div>

      <Link href="/?step=intake" className="app-button-primary mt-6 w-full justify-center">
        Unlock Full Interview Prep
      </Link>
    </aside>
  );
}

function buildPreview(company: string, posting: string) {
  const text = `${company} ${posting}`.toLowerCase();
  if (/\brenewal|retention|churn|expansion\b/.test(text)) {
    return {
      question: "Tell me about a time you spotted a customer risk early and changed the outcome.",
      insight: "The recruiter is testing whether you notice account-health signals before they become escalations.",
      recommendation: "Prepare a concise example with the signal you noticed, the action you took, and the measurable customer or business result."
    };
  }
  if (/\bonboarding|implementation|launch\b/.test(text)) {
    return {
      question: "Walk me through how you would keep a new customer on track during onboarding.",
      insight: "They want to hear structure, communication rhythm, and how you handle unclear ownership.",
      recommendation: "Prepare an example where you coordinated steps, followed up, and helped someone reach a working outcome."
    };
  }
  return {
    question: "Tell me about a time you managed a customer or stakeholder relationship through a difficult moment.",
    insight: "For Account Manager roles, recruiters are testing judgment, follow-through, and trust-building under pressure.",
    recommendation: "Prepare a STAR example with a real problem, your specific action, and the outcome or lesson."
  };
}
