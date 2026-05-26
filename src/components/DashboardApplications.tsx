"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type DashboardApplication = {
  id: string;
  jobTitle: string;
  companyName?: string | null;
  createdAt: string;
  resumeUnlocked: boolean;
  coverLetterUnlocked: boolean;
  interviewPrepReady: boolean;
  mockInterviewStatus?: "not_started" | "in_progress" | "completed";
};

export default function DashboardApplications({
  applications
}: {
  applications: DashboardApplication[];
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((item) =>
      `${item.jobTitle} ${item.companyName ?? ""}`.toLowerCase().includes(q)
    );
  }, [applications, query]);

  return (
    <section className="dashboard-list-section">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="dashboard-eyebrow">Saved applications</p>
          <h2 className="mt-2 text-2xl app-heading">Your active materials</h2>
          <p className="mt-2 text-sm leading-6 text-[#5d6f85]">
            Reopen prior drafts, exports, and cover letters from the roles you are pursuing.
          </p>
        </div>
        <label className="dashboard-search">
          <span>Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Job title or company"
          />
        </label>
      </div>

      <div className="mt-6 grid gap-4">
        {filtered.map((item) => (
          <Link
            key={item.id}
            href={`/outputs/${item.id}`}
            className="dashboard-application-card group"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="dashboard-date-pill">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
                <span className="text-xs font-bold text-[#7a8aa0]">
                  {item.companyName ?? "Company not detected"}
                </span>
              </div>
              <h3 className="mt-3 text-xl app-heading">{item.jobTitle}</h3>
              <p className="mt-2 text-sm leading-6 text-[#65748a]">
                Saved application materials for this role.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={item.resumeUnlocked ? "dashboard-badge is-ready" : "dashboard-badge"}>
                  Resume {item.resumeUnlocked ? "unlocked" : "locked"}
                </span>
                <span className={item.coverLetterUnlocked ? "dashboard-badge is-ready" : "dashboard-badge"}>
                  Cover letter {item.coverLetterUnlocked ? "unlocked" : "locked"}
                </span>
                <span className={item.interviewPrepReady ? "dashboard-badge is-ready" : "dashboard-badge is-pending"}>
                  Interview prep {item.interviewPrepReady ? "ready" : "pending"}
                </span>
                <span className={item.mockInterviewStatus === "completed" ? "dashboard-badge is-ready" : item.mockInterviewStatus === "in_progress" ? "dashboard-badge is-pending" : "dashboard-badge"}>
                  Mock interview {item.mockInterviewStatus === "completed" ? "complete" : item.mockInterviewStatus === "in_progress" ? "in progress" : "not started"}
                </span>
              </div>
            </div>

            <div className="dashboard-open-action">
              Open materials
            </div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="mt-5 rounded-[22px] border border-[#d9e3ed] bg-white px-4 py-3 text-sm text-[#5d6f85] shadow-[0_10px_28px_rgba(17,35,63,0.06)]">
          No saved applications match that search.
        </p>
      )}
    </section>
  );
}
