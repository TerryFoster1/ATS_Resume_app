"use client";

import { useEffect, useMemo, useState } from "react";
import type { MasterCareerProfile } from "@/lib/masterCareerProfile";

type EntryKind =
  | "work"
  | "volunteer"
  | "project"
  | "education"
  | "certification"
  | "award"
  | "achievement"
  | "interest"
  | "careerGoal"
  | "discoveryNote";

const ENTRY_OPTIONS: Array<{ value: EntryKind; label: string }> = [
  { value: "work", label: "Work experience" },
  { value: "volunteer", label: "Volunteer experience" },
  { value: "project", label: "Project" },
  { value: "education", label: "Education" },
  { value: "certification", label: "Certification" },
  { value: "award", label: "Award or recognition" },
  { value: "achievement", label: "Achievement" },
  { value: "interest", label: "Interest" },
  { value: "careerGoal", label: "Career goal" },
  { value: "discoveryNote", label: "Career discovery note" }
];

export default function MasterCareerProfileClient() {
  const [profile, setProfile] = useState<MasterCareerProfile | null>(null);
  const [kind, setKind] = useState<EntryKind>("work");
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetchProfile();
  }, []);

  const stats = useMemo(() => {
    if (!profile) return { experiences: 0, skills: 0, imports: 0 };
    return {
      experiences:
        profile.workExperience.length +
        profile.volunteerExperience.length +
        profile.projects.length +
        profile.extracurriculars.length,
      skills: profile.skills.length,
      imports: profile.resumeImports.length
    };
  }, [profile]);

  async function fetchProfile() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/career-profile", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as {
        profile?: MasterCareerProfile | null;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Could not load profile.");
      setProfile(data.profile ?? null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }

  async function saveEntry() {
    if (!detail.trim()) {
      setMessage("Add a little detail before saving this profile entry.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/career-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addEntry",
          kind,
          title: title.trim() || undefined,
          organization: organization.trim() || undefined,
          dateRange: dateRange.trim() || undefined,
          detail
        })
      });
      const data = (await response.json().catch(() => ({}))) as {
        profile?: MasterCareerProfile;
        error?: string;
      };
      if (!response.ok || !data.profile) throw new Error(data.error ?? "Could not save entry.");
      setProfile(data.profile);
      setTitle("");
      setOrganization("");
      setDateRange("");
      setDetail("");
      setMessage("Profile updated. Future career outputs can use this evidence.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save entry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="app-screen-card">
        <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-center">
          <div>
            <p className="app-kicker">Master Career Profile</p>
            <h1 className="mt-3 text-3xl app-heading sm:text-4xl">
              Build a living profile Career Ladder can reuse.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] sm:text-base">
              Your profile is the long-term source of truth. Uploaded resumes, first-resume answers,
              projects, certifications, and career goals enrich it over time. Tailored resumes become
              generated views of this profile, not the profile itself.
            </p>
          </div>
          <div className="app-mini-card">
            <p className="app-kicker">Profile memory</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <ProfileStat label="Experience" value={stats.experiences} />
              <ProfileStat label="Skills" value={stats.skills} />
              <ProfileStat label="Imports" value={stats.imports} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="app-mini-card">
          <p className="app-kicker">Add career evidence</p>
          <h2 className="mt-2 text-2xl app-heading">Add one useful detail.</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
            Keep it lightweight. Add work, projects, awards, certifications, goals, or notes that
            future resume, pathway, and interview prep outputs should remember.
          </p>

          <div className="mt-5 space-y-4">
            <label className="block text-sm font-black text-[var(--color-text-primary)]">
              Entry type
              <select value={kind} onChange={(event) => setKind(event.target.value as EntryKind)} className="app-input mt-2">
                {ENTRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-black text-[var(--color-text-primary)]">
              Label optional
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="app-input mt-2" placeholder="Shift lead, portfolio project, scholarship, Salesforce certificate..." />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-black text-[var(--color-text-primary)]">
                Organization optional
                <input value={organization} onChange={(event) => setOrganization(event.target.value)} className="app-input mt-2" placeholder="Company, school, group" />
              </label>
              <label className="block text-sm font-black text-[var(--color-text-primary)]">
                Date optional
                <input value={dateRange} onChange={(event) => setDateRange(event.target.value)} className="app-input mt-2" placeholder="2024, Summer 2025" />
              </label>
            </div>
            <label className="block text-sm font-black text-[var(--color-text-primary)]">
              What should Career Ladder remember?
              <textarea value={detail} onChange={(event) => setDetail(event.target.value)} className="app-input mt-2 min-h-[9rem] resize-y" placeholder="Describe what you did, what you learned, who you helped, or what proof this gives a recruiter." />
            </label>
            <button type="button" disabled={saving} onClick={saveEntry} className="app-button-primary disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? "Saving..." : "Save to profile"}
            </button>
            {message && (
              <p className="rounded-[16px] bg-white px-4 py-3 text-xs font-semibold leading-5 text-[var(--color-text-muted)] shadow-[var(--shadow-inset-soft)]">
                {message}
              </p>
            )}
          </div>
        </article>

        <article className="app-mini-card">
          <p className="app-kicker">Current profile evidence</p>
          <h2 className="mt-2 text-2xl app-heading">What Career Ladder knows so far</h2>
          {loading ? (
            <p className="mt-4 text-sm text-[var(--color-text-muted)]">Loading profile...</p>
          ) : profile ? (
            <div className="mt-5 space-y-5">
              <ProfileSection title="Work and projects" items={[
                ...profile.workExperience.map(formatExperience),
                ...profile.projects.map(formatExperience),
                ...profile.volunteerExperience.map(formatExperience)
              ]} />
              <ProfileSection title="Education and credentials" items={[
                ...profile.education.map((item) => item.detail),
                ...profile.certifications.map((item) => item.detail)
              ]} />
              <ProfileSection title="Skills" items={profile.skills} />
              <ProfileSection title="Goals and discovery notes" items={[
                ...profile.careerGoals,
                ...profile.discoveryNotes.map((item) => item.detail)
              ]} />
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[var(--color-text-muted)]">
              No profile evidence has been saved yet. Upload a resume, build a first resume draft,
              or add a detail here to start your career memory.
            </p>
          )}
        </article>
      </section>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <strong className="block text-2xl app-heading">{value}</strong>
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        {label}
      </span>
    </div>
  );
}

function ProfileSection({ title, items }: { title: string; items: string[] }) {
  const clean = items.filter(Boolean).slice(0, 8);
  return (
    <section>
      <h3 className="text-sm font-black text-[var(--color-text-primary)]">{title}</h3>
      {clean.length ? (
        <ul className="mt-3 space-y-2">
          {clean.map((item) => (
            <li key={item} className="rounded-[16px] bg-white px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)] shadow-[var(--shadow-inset-soft)]">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">No saved evidence yet.</p>
      )}
    </section>
  );
}

function formatExperience(item: MasterCareerProfile["workExperience"][number]) {
  const heading = [item.title, item.organization, item.dateRange].filter(Boolean).join(" | ");
  const bullets = item.bullets.slice(0, 2).join(" ");
  return [heading, bullets].filter(Boolean).join(": ");
}
