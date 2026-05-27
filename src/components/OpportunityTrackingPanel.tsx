"use client";

import { useMemo, useState } from "react";
import {
  APPLICATION_STATUSES,
  summarizeOfferReadiness,
  summarizeOfferTradeoffs,
  type ApplicationStatus,
  type InterviewRound,
  type InterviewerInfo,
  type OfferComparison,
  type OpportunityTracking
} from "@/lib/opportunityTracking";

type Props = {
  outputId: string;
  initialTracking: OpportunityTracking;
};

export default function OpportunityTrackingPanel({ outputId, initialTracking }: Props) {
  const [tracking, setTracking] = useState(initialTracking);
  const [status, setStatus] = useState<ApplicationStatus>(initialTracking.status);
  const [recruiterName, setRecruiterName] = useState(initialTracking.recruiterName ?? "");
  const [recruiterEmail, setRecruiterEmail] = useState(initialTracking.recruiterEmail ?? "");
  const [recruiterPhone, setRecruiterPhone] = useState(initialTracking.recruiterPhone ?? "");
  const [followUpDate, setFollowUpDate] = useState(initialTracking.followUpDate ?? "");
  const [note, setNote] = useState("");
  const [interviewRounds, setInterviewRounds] = useState<InterviewRound[]>(
    initialTracking.interviewRounds.length
      ? initialTracking.interviewRounds
      : [{ id: "round-1", label: "Recruiter screen", date: "", status: "", notes: "" }]
  );
  const [interviewers, setInterviewers] = useState<InterviewerInfo[]>(initialTracking.interviewers);
  const [offer, setOffer] = useState<OfferComparison>(initialTracking.offer);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const offerReadiness = useMemo(() => summarizeOfferReadiness(offer), [offer]);
  const offerTradeoffs = useMemo(() => summarizeOfferTradeoffs(offer), [offer]);

  async function saveTracking() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/outputs/${outputId}/tracking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          recruiterName,
          recruiterEmail,
          recruiterPhone,
          followUpDate,
          note,
          interviewRounds: interviewRounds.filter((round) => round.label.trim()),
          interviewers: interviewers.filter((person) => (person.name ?? "").trim() || (person.role ?? "").trim()),
          offer
        })
      });
      const data = (await response.json().catch(() => ({}))) as {
        tracking?: OpportunityTracking;
        error?: string;
      };
      if (!response.ok || !data.tracking) throw new Error(data.error ?? "Could not save tracking details.");
      setTracking(data.tracking);
      setStatus(data.tracking.status);
      setNote("");
      setMessage("Opportunity updated. Your dashboard will reflect this status.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save tracking details.");
    } finally {
      setSaving(false);
    }
  }

  function updateRound(index: number, key: keyof InterviewRound, value: string) {
    setInterviewRounds((current) =>
      current.map((round, roundIndex) => (roundIndex === index ? { ...round, [key]: value } : round))
    );
  }

  function updateInterviewer(index: number, key: keyof InterviewerInfo, value: string) {
    setInterviewers((current) =>
      current.map((person, personIndex) => (personIndex === index ? { ...person, [key]: value } : person))
    );
  }

  function updateOffer(key: keyof OfferComparison, value: string) {
    setOffer((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="opportunity-workspace">
      <div className="opportunity-panel">
        <div className="opportunity-panel-header">
          <div>
            <p className="app-kicker">Opportunity tracking</p>
            <h2 className="mt-2 text-2xl app-heading">Keep the hiring process tied to this role.</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
              Track status, recruiter details, interviews, follow-ups, and offer context without turning Career Ladder into a heavy ATS.
            </p>
          </div>
          <div className="opportunity-status-card">
            <span>Current stage</span>
            <strong>{tracking.status}</strong>
          </div>
        </div>

        <div className="opportunity-grid mt-6">
          <label className="opportunity-field">
            Stage
            <select value={status} onChange={(event) => setStatus(event.target.value as ApplicationStatus)} className="app-input mt-2">
              {APPLICATION_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="opportunity-field">
            Follow-up date
            <input value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} className="app-input mt-2" placeholder="2026-06-05 or after recruiter screen" />
          </label>
          <label className="opportunity-field">
            Recruiter name
            <input value={recruiterName} onChange={(event) => setRecruiterName(event.target.value)} className="app-input mt-2" placeholder="Name if known" />
          </label>
          <label className="opportunity-field">
            Recruiter email
            <input value={recruiterEmail} onChange={(event) => setRecruiterEmail(event.target.value)} className="app-input mt-2" placeholder="Email or LinkedIn note" />
          </label>
        </div>
        <label className="opportunity-field mt-4 block">
          Quick note
          <textarea value={note} onChange={(event) => setNote(event.target.value)} className="app-input mt-2 min-h-[92px] resize-y" placeholder="What happened, what they cared about, or what you need to follow up on." />
        </label>

        <div className="opportunity-subsection">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="app-kicker">Interview rounds</p>
              <h3 className="mt-1 text-xl app-heading">Capture the next conversation.</h3>
            </div>
            <button
              type="button"
              className="app-button-ghost"
              onClick={() =>
                setInterviewRounds((current) => [
                  ...current,
                  { id: `round-${Date.now()}`, label: "", date: "", status: "", notes: "" }
                ])
              }
            >
              Add round
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            {interviewRounds.map((round, index) => (
              <div key={round.id} className="opportunity-row-grid">
                <input value={round.label} onChange={(event) => updateRound(index, "label", event.target.value)} className="app-input" placeholder="Recruiter screen, panel, final..." />
                <input value={round.date ?? ""} onChange={(event) => updateRound(index, "date", event.target.value)} className="app-input" placeholder="Date or timing" />
                <input value={round.status ?? ""} onChange={(event) => updateRound(index, "status", event.target.value)} className="app-input" placeholder="Scheduled, done, waiting..." />
                <input value={round.notes ?? ""} onChange={(event) => updateRound(index, "notes", event.target.value)} className="app-input" placeholder="Focus, interviewer, next step" />
              </div>
            ))}
          </div>
        </div>

        <div className="opportunity-subsection">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="app-kicker">Interviewers</p>
              <h3 className="mt-1 text-xl app-heading">Remember who is evaluating what.</h3>
            </div>
            <button
              type="button"
              className="app-button-ghost"
              onClick={() =>
                setInterviewers((current) => [
                  ...current,
                  { id: `interviewer-${Date.now()}`, name: "", role: "", email: "", notes: "" }
                ])
              }
            >
              Add person
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            {interviewers.length === 0 && (
              <p className="rounded-[18px] bg-white px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)] shadow-[var(--shadow-inset-soft)]">
                Add interviewer details when you receive them. This keeps preparation grounded in the actual hiring process.
              </p>
            )}
            {interviewers.map((person, index) => (
              <div key={person.id} className="opportunity-row-grid">
                <input value={person.name ?? ""} onChange={(event) => updateInterviewer(index, "name", event.target.value)} className="app-input" placeholder="Name" />
                <input value={person.role ?? ""} onChange={(event) => updateInterviewer(index, "role", event.target.value)} className="app-input" placeholder="Role or team" />
                <input value={person.email ?? ""} onChange={(event) => updateInterviewer(index, "email", event.target.value)} className="app-input" placeholder="Email or profile" />
                <input value={person.notes ?? ""} onChange={(event) => updateInterviewer(index, "notes", event.target.value)} className="app-input" placeholder="What they may test" />
              </div>
            ))}
          </div>
        </div>

        <div className="opportunity-subsection">
          <p className="app-kicker">Offer comparison</p>
          <h3 className="mt-1 text-xl app-heading">Think beyond the headline salary.</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
            {offerReadiness}
          </p>
          <div className="opportunity-grid mt-4">
            <OfferInput label="Salary" value={offer.salary} onChange={(value) => updateOffer("salary", value)} />
            <OfferInput label="Bonus" value={offer.bonus} onChange={(value) => updateOffer("bonus", value)} />
            <OfferInput label="Work model" value={offer.workModel} onChange={(value) => updateOffer("workModel", value)} />
            <OfferInput label="PTO" value={offer.pto} onChange={(value) => updateOffer("pto", value)} />
            <OfferInput label="Title" value={offer.title} onChange={(value) => updateOffer("title", value)} />
            <OfferInput label="Commute" value={offer.commute} onChange={(value) => updateOffer("commute", value)} />
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <OfferText label="Benefits" value={offer.benefits} onChange={(value) => updateOffer("benefits", value)} />
            <OfferText label="Growth opportunity" value={offer.growthOpportunity} onChange={(value) => updateOffer("growthOpportunity", value)} />
            <OfferText label="Career fit notes" value={offer.careerGrowthPotential ?? offer.notes} onChange={(value) => updateOffer("careerGrowthPotential", value)} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {offerTradeoffs.map((item) => (
              <p key={item} className="rounded-[18px] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[var(--color-text-muted)] shadow-[var(--shadow-inset-soft)]">
                {item}
              </p>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={saveTracking} disabled={saving} className="app-button-primary disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? "Saving..." : "Save opportunity"}
          </button>
          {message && <p className="text-sm font-semibold text-[var(--color-text-muted)]">{message}</p>}
        </div>

        {tracking.notes.length > 0 && (
          <div className="opportunity-subsection">
            <p className="app-kicker">Recent notes</p>
            <ul className="mt-3 space-y-2">
              {tracking.notes.slice(0, 4).map((item) => (
                <li key={item.id} className="rounded-[18px] bg-white px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)] shadow-[var(--shadow-inset-soft)]">
                  <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-[#245f9f]">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                  {item.body}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function OfferInput({
  label,
  value,
  onChange
}: {
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <label className="opportunity-field">
      {label}
      <input value={value ?? ""} onChange={(event) => onChange(event.target.value)} className="app-input mt-2" />
    </label>
  );
}

function OfferText({
  label,
  value,
  onChange
}: {
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <label className="opportunity-field">
      {label}
      <textarea value={value ?? ""} onChange={(event) => onChange(event.target.value)} className="app-input mt-2 min-h-[96px] resize-y" />
    </label>
  );
}
