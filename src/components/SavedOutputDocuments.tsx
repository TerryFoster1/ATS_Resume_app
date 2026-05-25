"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ACCOUNT_CREDITS_REFRESH_EVENT } from "@/components/AccountCreditIndicator";
import InterviewPrepDisplay from "@/components/InterviewPrepDisplay";
import { trackEvent } from "@/lib/analytics";
import { sanitizeGeneratedText } from "@/lib/sanitizeGeneratedText";
import { limitSkillsSection } from "@/lib/skillsSection";

type DocumentKind = "resume" | "coverLetter";

type AccountStatus = {
  signedIn: boolean;
  credits: number;
};

type SavedOutputDocumentsProps = {
  outputId: string;
  title: string;
  companyName?: string | null;
  resumeText: string;
  coverLetterText: string;
  sourceResumeText?: string | null;
  resumeUnlocked: boolean;
  coverLetterUnlocked: boolean;
  interviewPrepStatus?: string;
  interviewPrepText?: string;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const FS_BODY = 10;
const FS_META = 9;
const FS_SECTION = 10.5;
const FS_NAME = 20;
const FS_TITLE = 12;
const FS_LETTER_BODY = 11;
const LH_BODY = 12.8;
const LH_LETTER = 15;
const LH_BULLET_GAP = 1.8;
const CHECKOUT_RETURN_PATH_KEY = "career-ladder:checkout-return-path";

export default function SavedOutputDocuments({
  outputId,
  title,
  companyName,
  resumeText,
  coverLetterText,
  sourceResumeText,
  resumeUnlocked,
  coverLetterUnlocked,
  interviewPrepStatus = "pending",
  interviewPrepText = ""
}: SavedOutputDocumentsProps) {
  const [credits, setCredits] = useState<number | null>(null);
  const [resumeIsUnlocked, setResumeIsUnlocked] = useState(resumeUnlocked);
  const [coverLetterIsUnlocked, setCoverLetterIsUnlocked] = useState(coverLetterUnlocked);
  const [unlockTarget, setUnlockTarget] = useState<DocumentKind | null>(null);
  const [busyTarget, setBusyTarget] = useState<DocumentKind | null>(null);
  const [interviewPrep, setInterviewPrep] = useState(interviewPrepText);
  const [interviewPrepBusy, setInterviewPrepBusy] = useState(false);
  const [interviewPrepError, setInterviewPrepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("dashboard_reopen", { outputId });
    void refreshCredits();
    const params = new URLSearchParams(window.location.search);
    const unlock = params.get("unlock");
    if (params.get("checkout") === "success" && (unlock === "resume" || unlock === "coverLetter")) {
      params.delete("checkout");
      params.delete("unlock");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState(null, "", next);
      window.setTimeout(() => void requestUnlock(unlock), 700);
    } else if (params.get("checkout") === "success" && params.get("interviewPrep") === "1") {
      params.delete("checkout");
      params.delete("interviewPrep");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState(null, "", next);
      window.setTimeout(() => void generatePrep(), 700);
    }
    // This effect intentionally runs once on page entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputId]);

  async function refreshCredits() {
    try {
      const response = await fetch("/api/account/status", { cache: "no-store" });
      const data = (await response.json()) as AccountStatus;
      setCredits(response.ok && data.signedIn ? data.credits : 0);
    } catch {
      setCredits(0);
    }
  }

  async function requestUnlock(target: DocumentKind) {
    setError(null);
    await refreshCredits();
    setUnlockTarget(target);
  }

  async function confirmUnlock() {
    if (!unlockTarget) return;
    if ((credits ?? 0) <= 0) {
      window.sessionStorage.setItem(
        CHECKOUT_RETURN_PATH_KEY,
        `/outputs/${outputId}?checkout=success&unlock=${unlockTarget}`
      );
      window.location.href = "/pricing?pack=5&checkout=1";
      return;
    }

    setBusyTarget(unlockTarget);
    setError(null);
    try {
      const response = await fetch(`/api/outputs/${outputId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: unlockTarget })
      });
      if (response.status === 402) {
        window.location.href = "/pricing?pack=5&checkout=1";
        return;
      }
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Could not unlock this material.");
      }

      if (unlockTarget === "resume") setResumeIsUnlocked(true);
      if (unlockTarget === "coverLetter") setCoverLetterIsUnlocked(true);
      trackEvent("unlock_completed", { outputId, target: unlockTarget });
      window.dispatchEvent(new Event(ACCOUNT_CREDITS_REFRESH_EVENT));
      await refreshCredits();
      setUnlockTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock this material.");
    } finally {
      setBusyTarget(null);
    }
  }

  async function generatePrep() {
    setInterviewPrepError(null);
    setInterviewPrepBusy(true);
    try {
      const response = await fetch(`/api/outputs/${outputId}/interview-prep`, {
        method: "POST"
      });
      const data = (await response.json().catch(() => ({}))) as {
        interviewPrep?: string;
        error?: string;
      };
      if (response.status === 402) {
        window.sessionStorage.setItem(
          CHECKOUT_RETURN_PATH_KEY,
          `/outputs/${outputId}?checkout=success&interviewPrep=1`
        );
        window.location.href = "/pricing?pack=5&checkout=1";
        return;
      }
      if (!response.ok || !data.interviewPrep) {
        throw new Error(data.error ?? "Could not generate interview prep.");
      }
      setInterviewPrep(data.interviewPrep);
      trackEvent("interview_prep_unlocked", { outputId });
      window.dispatchEvent(new Event(ACCOUNT_CREDITS_REFRESH_EVENT));
      await refreshCredits();
    } catch (err) {
      setInterviewPrepError(err instanceof Error ? err.message : "Could not generate interview prep.");
    } finally {
      setInterviewPrepBusy(false);
    }
  }

  const safeFilename = filenameFromTitle(title);
  const materialStatus = [
    { label: "Resume export", value: resumeIsUnlocked ? "Unlocked" : "Locked preview" },
    { label: "Cover letter", value: coverLetterIsUnlocked ? "Unlocked" : "Locked preview" },
    { label: "Interview prep", value: interviewPrep.trim() ? "Ready" : interviewPrepStatus === "failed" ? "Retry needed" : "Not generated" }
  ];

  return (
    <div className="space-y-6">
      <section className="saved-output-toolbar">
        <div>
          <p className="app-kicker">Saved materials</p>
          <h2 className="mt-2 text-xl app-heading">
            Reopen, unlock, and export this application.
          </h2>
        </div>
        <div className="saved-output-credit-card">
          <span>{credits ?? "..."}</span>
          <small>{credits === 1 ? "credit" : "credits"} available</small>
        </div>
      </section>

      <section className="saved-output-status-grid" aria-label="Saved material status">
        {materialStatus.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SavedDocumentPanel
          kind="resume"
          title="Resume"
          text={resumeText}
          fileBaseName={safeFilename}
          unlocked={resumeIsUnlocked}
          onRequestUnlock={() => requestUnlock("resume")}
        />
        <SavedDocumentPanel
          kind="coverLetter"
          title="Cover Letter"
          text={coverLetterText}
          headerSource={sourceResumeText ?? resumeText}
          fileBaseName={`${safeFilename}-cover-letter`}
          unlocked={coverLetterIsUnlocked}
          onRequestUnlock={() => requestUnlock("coverLetter")}
        />
      </section>

      <InterviewPrepSection
        interviewPrep={interviewPrep}
        status={interviewPrepStatus}
        busy={interviewPrepBusy}
        error={interviewPrepError}
        fileBaseName={`${safeFilename}-interview-prep`}
        onGenerate={generatePrep}
      />

      {unlockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(32,23,53,0.34)] px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-[#fffaf4] p-6 shadow-[0_30px_80px_rgba(32,23,53,0.24)]">
            <p className="app-kicker">Credit unlock</p>
            <h2 className="mt-3 text-2xl app-heading">
              {unlockTarget === "resume"
                ? "Unlock resume export for 1 credit?"
                : "Unlock full cover letter for 1 credit?"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
              {unlockTarget === "resume"
                ? "This will unlock copy, TXT, and PDF export for this tailored resume."
                : "This will reveal the full cover letter and enable copy, TXT, and PDF export."}
            </p>
            {(credits ?? 0) <= 0 && (
              <p className="mt-3 rounded-[18px] bg-white px-4 py-3 text-xs leading-5 text-[var(--color-text-muted)] shadow-[var(--shadow-inset-soft)]">
                You do not have credits yet. Continue to checkout to add credits first.
              </p>
            )}
            {error && (
              <p className="mt-3 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold leading-5 text-rose-900">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setUnlockTarget(null)}
                disabled={busyTarget !== null}
                className="app-button-ghost px-5 py-2.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmUnlock}
                disabled={busyTarget !== null}
                className="app-button-primary px-5 py-2.5"
              >
                {busyTarget ? "Working..." : (credits ?? 0) > 0 ? "Unlock" : "Buy credits"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="app-card-soft">
        <p className="app-kicker">Need another angle?</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            Start a new application when you want to reposition this background for a different role or posting.
          </p>
          <Link href="/?step=resume" className="app-button-secondary shrink-0">
            Start a new application
          </Link>
        </div>
      </section>
    </div>
  );
}

function InterviewPrepSection({
  interviewPrep,
  status,
  busy,
  error,
  fileBaseName,
  onGenerate
}: {
  interviewPrep: string;
  status: string;
  busy: boolean;
  error: string | null;
  fileBaseName: string;
  onGenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const hasPrep = interviewPrep.trim().length > 0;

  async function copy() {
    if (!hasPrep) return;
    await navigator.clipboard.writeText(interviewPrep);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function downloadTxt() {
    if (!hasPrep) return;
    triggerDownload(new Blob([interviewPrep], { type: "text/plain;charset=utf-8" }), `${fileBaseName}.txt`);
  }

  return (
    <section className="interview-prep-panel space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="app-kicker">Interview prep</p>
          <h3 className="mt-2 text-xl app-heading">
            {hasPrep ? "Recruiter-style prep is ready." : "Generate recruiter-style interview prep."}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            {hasPrep
              ? "Review likely screening, behavioural, role-specific, and gap-focused questions for this application."
              : "Use 1 credit to generate likely questions, STAR guidance, and preparation notes from this saved resume and job posting."}
          </p>
          {status === "failed" && !hasPrep && (
            <p className="mt-3 rounded-[14px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold leading-5 text-rose-900">
              The last interview prep attempt failed. You can try again.
            </p>
          )}
        </div>
        {hasPrep ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} className="saved-doc-action">
              {copied ? "Copied" : "Copy"}
            </button>
            <button type="button" onClick={downloadTxt} className="saved-doc-action-primary">
              TXT
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onGenerate}
            disabled={busy}
            className="app-button-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Generating..." : "Generate interview prep - 1 credit"}
          </button>
        )}
      </div>
      {error && (
        <p className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
          {error}
        </p>
      )}
      {hasPrep && <InterviewPrepDisplay text={interviewPrep} />}
    </section>
  );
}

function SavedDocumentPanel({
  kind,
  title,
  text,
  fileBaseName,
  headerSource,
  unlocked,
  onRequestUnlock
}: {
  kind: DocumentKind;
  title: string;
  text: string;
  fileBaseName: string;
  headerSource?: string;
  unlocked: boolean;
  onRequestUnlock: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const cleanText = useMemo(() => sanitizeGeneratedText(text), [text]);

  async function copy() {
    if (!unlocked) {
      onRequestUnlock();
      return;
    }
    await navigator.clipboard.writeText(cleanText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function downloadTxt() {
    if (!unlocked) {
      onRequestUnlock();
      return;
    }
    triggerDownload(new Blob([cleanText], { type: "text/plain;charset=utf-8" }), `${fileBaseName}.txt`);
  }

  async function downloadPdf() {
    if (!unlocked) {
      onRequestUnlock();
      return;
    }
    setPdfBusy(true);
    try {
      const blob =
        kind === "resume"
          ? await renderResumePdf(cleanText)
          : await renderCoverLetterPdf(cleanText, headerSource);
      triggerDownload(blob, `${fileBaseName}.pdf`);
    } catch (err) {
      console.error("[SavedOutputDocuments] PDF render failed", err);
      alert("Could not render PDF. The text download should still work.");
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <article className="app-document-panel saved-document-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="app-kicker">{unlocked ? "Unlocked" : "Preview locked"}</p>
          <h3 className="mt-1 text-lg font-black text-[var(--color-text-primary)]">{title}</h3>
        </div>
        {unlocked ? (
          <div className="flex flex-wrap gap-2 text-xs">
            <button type="button" onClick={copy} className="saved-doc-action">
              {copied ? "Copied" : "Copy"}
            </button>
            <button type="button" onClick={downloadTxt} className="saved-doc-action">
              TXT
            </button>
            <button type="button" onClick={downloadPdf} disabled={pdfBusy} className="saved-doc-action-primary">
              {pdfBusy ? "Rendering..." : "PDF"}
            </button>
          </div>
        ) : (
          <button type="button" onClick={onRequestUnlock} className="app-button-primary px-5 py-2.5 text-sm">
            {kind === "resume" ? "Unlock resume export - 1 credit" : "Unlock full cover letter - 1 credit"}
          </button>
        )}
      </div>

      <div className="mt-4">
        {unlocked ? (
          <DocumentPreview text={cleanText} kind={kind} headerSource={headerSource} locked={false} />
        ) : (
          <LockedPreview text={cleanText} kind={kind} headerSource={headerSource} onRequestUnlock={onRequestUnlock} />
        )}
      </div>
    </article>
  );
}

function LockedPreview({
  text,
  kind,
  headerSource,
  onRequestUnlock
}: {
  text: string;
  kind: DocumentKind;
  headerSource?: string;
  onRequestUnlock: () => void;
}) {
  return (
    <div
      className="saved-document-lock"
      onCopy={(event) => {
        event.preventDefault();
        onRequestUnlock();
      }}
    >
      <DocumentPreview text={text} kind={kind} headerSource={headerSource} locked />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#f5f7fa] via-[#f5f7fa]/92 to-[#f5f7fa]/10" />
    </div>
  );
}

function DocumentPreview({
  text,
  kind,
  headerSource,
  locked
}: {
  text: string;
  kind: DocumentKind;
  headerSource?: string;
  locked: boolean;
}) {
  return (
    <div className={locked ? "pointer-events-none select-none" : ""}>
      {kind === "resume" ? (
        <ResumeDocumentPreview text={text} />
      ) : (
        <CoverLetterDocumentPreview text={text} headerSource={headerSource} />
      )}
    </div>
  );
}

function ResumeDocumentPreview({ text }: { text: string }) {
  const model = parseResumeForPdf(limitSkillsSection(sanitizeGeneratedText(text)));
  return (
    <article className="document-card saved-document-page">
      <header className="border-b border-[#2f3a4a]/35 pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h4 className="text-2xl font-black leading-tight tracking-tight text-[#111827]">
            {model.header.name}
          </h4>
          {model.header.title && (
            <p className="max-w-[260px] text-left text-sm font-bold leading-snug text-[#334155] sm:text-right">
              {model.header.title}
            </p>
          )}
        </div>
        {model.header.contact && (
          <p className="mt-3 text-center text-[11px] leading-5 text-[#475569]">
            {model.header.contact}
          </p>
        )}
      </header>
      <div className="mt-5 space-y-5">
        {model.sections.map((section) => (
          <ResumePreviewSection key={`${section.normalized}-${section.heading}`} section={section} />
        ))}
      </div>
    </article>
  );
}

function ResumePreviewSection({ section }: { section: ResumePdfSection }) {
  if (section.lines.length === 0) return null;
  const skills =
    section.normalized === "KEY SKILLS" ? extractSkillsFromLines(section.lines).slice(0, 9) : [];
  return (
    <section>
      <h5 className="border-b border-[#2f3a4a]/25 pb-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#111827]">
        {section.heading}
      </h5>
      {section.normalized === "KEY SKILLS" ? (
        <ul className="mt-3 grid gap-x-4 gap-y-1.5 sm:grid-cols-3">
          {skills.map((skill) => (
            <li key={skill} className="flex gap-2 text-[12px] leading-5 text-[#334155]">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#334155]" />
              <span>{skill}</span>
            </li>
          ))}
        </ul>
      ) : section.normalized === "PROFESSIONAL EXPERIENCE" ? (
        <ExperiencePreviewLines lines={section.lines} />
      ) : (
        <PlainPreviewLines lines={section.lines} />
      )}
    </section>
  );
}

function ExperiencePreviewLines({ lines }: { lines: string[] }) {
  return (
    <div className="mt-3 space-y-1.5">
      {lines.map((line, index) => {
        if (isBulletLine(line)) return <PreviewBullet key={`${index}-${line}`} text={cleanBullet(line)} />;
        if (looksLikeCombinedRoleLine(line)) {
          const parsed = splitCombinedRoleLine(line);
          return (
            <div key={`${index}-${line}`} className="mt-3 first:mt-0">
              <p className="text-[13px] font-black uppercase tracking-[0.03em] text-[#111827]">
                {parsed.title}
              </p>
              {parsed.meta && (
                <p className="mt-0.5 text-[11.5px] font-semibold text-[#64748b]">{parsed.meta}</p>
              )}
            </div>
          );
        }
        return (
          <p key={`${index}-${line}`} className="mt-2 text-[12.5px] leading-5 text-[#334155]">
            {line}
          </p>
        );
      })}
    </div>
  );
}

function PlainPreviewLines({ lines }: { lines: string[] }) {
  return (
    <div className="mt-3 space-y-1.5">
      {lines.map((line, index) =>
        isBulletLine(line) ? (
          <PreviewBullet key={`${index}-${line}`} text={cleanBullet(line)} />
        ) : (
          <p key={`${index}-${line}`} className="text-[12.5px] leading-5 text-[#334155]">
            {line}
          </p>
        )
      )}
    </div>
  );
}

function PreviewBullet({ text }: { text: string }) {
  return (
    <p className="flex gap-2 text-[12.5px] leading-5 text-[#334155]">
      <span aria-hidden className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-[#334155]" />
      <span>{text}</span>
    </p>
  );
}

function CoverLetterDocumentPreview({
  text,
  headerSource
}: {
  text: string;
  headerSource?: string;
}) {
  const header = headerSource ? extractCandidateHeader(headerSource) : {};
  const body = ensureGreeting(normalizeCoverLetterParagraphs(sanitizeGeneratedText(text)));
  return (
    <article className="document-card saved-document-page saved-document-page-letter">
      {(header.name || header.contact) && (
        <header className="mb-8 border-b border-[#2f3a4a]/20 pb-4">
          {header.name && (
            <h4 className="text-[20px] font-bold leading-tight tracking-normal text-[#111827]">
              {header.name}
            </h4>
          )}
          {header.contact && (
            <p className="mt-2 text-[11.5px] leading-5 text-[#475569]">{header.contact}</p>
          )}
        </header>
      )}
      <p className="mb-6 text-[12px] text-[#64748b]">{formatToday()}</p>
      <div className="space-y-4">
        {body.map((paragraph, index) => (
          <p
            key={`${index}-${paragraph.slice(0, 24)}`}
            className={/^dear\b/i.test(paragraph) ? "text-[13px] font-bold leading-[1.65] text-[#111827]" : "text-[13px] font-normal leading-[1.65] text-[#1f2937]"}
          >
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}

type ResumePdfHeader = {
  name: string;
  title?: string;
  contact?: string;
};

type ResumePdfSection = {
  heading: string;
  normalized: string;
  lines: string[];
};

type ResumePdfModel = {
  header: ResumePdfHeader;
  sections: ResumePdfSection[];
};

function parseResumeForPdf(text: string): ResumePdfModel {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const firstSectionIndex = lines.findIndex((line) => normalizeSectionHeading(line));
  const headerLines = firstSectionIndex === -1 ? lines.slice(0, 3) : lines.slice(0, firstSectionIndex);
  const bodyLines = firstSectionIndex === -1 ? lines.slice(3) : lines.slice(firstSectionIndex);
  const name = headerLines[0] || "Candidate";
  const contactIndex = headerLines.findIndex((line, index) => index > 0 && isResumeContactLine(line));
  const title = headerLines
    .slice(1, contactIndex === -1 ? undefined : contactIndex)
    .find((line) => !isResumeContactLine(line));
  const contact = contactIndex >= 0 ? headerLines[contactIndex] : headerLines.find(isResumeContactLine);
  const sections: ResumePdfSection[] = [];
  let current: ResumePdfSection | null = null;

  for (const line of bodyLines) {
    const normalized = normalizeSectionHeading(line);
    if (normalized) {
      current = { heading: normalized, normalized, lines: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { heading: "PROFESSIONAL SUMMARY", normalized: "PROFESSIONAL SUMMARY", lines: [] };
      sections.push(current);
    }
    current.lines.push(line);
  }

  return { header: { name, title, contact }, sections };
}

function normalizeSectionHeading(line: string): string | null {
  const normalized = line.toLowerCase().replace(/[:.\s]+$/, "");
  if (/^(summary|professional summary|profile)$/.test(normalized)) return "PROFESSIONAL SUMMARY";
  if (/^(key skills|skills|core skills|core skills \/ capabilities|core competencies|technical skills)$/.test(normalized)) return "KEY SKILLS";
  if (/^(experience|work experience|professional experience|employment history|work history)$/.test(normalized)) return "PROFESSIONAL EXPERIENCE";
  if (/^(education|academic background)$/.test(normalized)) return "EDUCATION";
  if (/^(tools|tool stack|technical toolkit)$/.test(normalized)) return "TOOL STACK";
  if (/^(certifications|licenses|credentials)$/.test(normalized)) return "CERTIFICATIONS";
  return null;
}

function extractSkillsFromLines(lines: string[]): string[] {
  const seen = new Set<string>();
  return lines
    .join("\n")
    .split(/[,;\n•]+/)
    .map((skill) => skill.replace(/^\s*[-*]\s*/, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((skill) => skill.length <= 80)
    .filter((skill) => {
      const key = skill.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function isResumeContactLine(line: string): boolean {
  return /@|\b(?:https?:\/\/|www\.|linkedin\.com|[a-z0-9-]+\.(?:com|ca|net|org|io))\b|\d{3}[-.)\s]\d{3}/i.test(line);
}

function isBulletLine(line: string): boolean {
  return /^\s*[•\-*·●◦▪]\s+/.test(line);
}

function cleanBullet(line: string): string {
  return line.replace(/^\s*[•\-*·●◦▪]\s+/, "").trim();
}

function looksLikeCombinedRoleLine(line: string): boolean {
  return /\s+\|\s+/.test(line) && looksLikeDateLine(line);
}

function looksLikeDateLine(line?: string): boolean {
  if (!line) return false;
  return /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\s+-\s+(?:Present|Current|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4})\b|\b(?:19|20)\d{2}\s+-\s+(?:Present|Current|(?:19|20)\d{2})\b/i.test(line);
}

function splitCombinedRoleLine(line: string): { title: string; meta?: string } {
  const parts = line.split(/\s+\|\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return { title: line };
  return { title: parts[0], meta: parts.slice(1).join(" | ") };
}

async function renderResumePdf(text: string): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const model = parseResumeForPdf(limitSkillsSection(text));
  let y = MARGIN;

  y = drawResumeHeader(doc, model.header, y);
  for (const section of model.sections) {
    y = drawSectionHeading(doc, section.heading, y);
    if (section.normalized === "KEY SKILLS") {
      y = drawSkillsList(doc, extractSkillsFromLines(section.lines), y);
    } else if (section.normalized === "PROFESSIONAL EXPERIENCE") {
      y = drawExperienceSection(doc, section.lines, y);
    } else {
      y = drawPlainSection(doc, section.lines, y);
    }
  }

  return doc.output("blob");
}

async function renderCoverLetterPdf(text: string, headerSource?: string): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const header = extractCandidateHeader(headerSource ?? text);
  const body = ensureGreeting(normalizeCoverLetterParagraphs(text));
  let y = MARGIN;

  if (header.name) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FS_NAME);
    y = ensureRoom(doc, y, FS_NAME + 4);
    doc.text(header.name, MARGIN, y + FS_NAME);
    y += FS_NAME + 6;
  }
  if (header.contact) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const contactLines = doc.splitTextToSize(header.contact, CONTENT_WIDTH) as string[];
    for (const line of contactLines) {
      y = ensureRoom(doc, y, 12);
      doc.text(line, MARGIN, y + 9.5);
      y += 12;
    }
  }

  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FS_LETTER_BODY);
  y = drawLetterParagraph(doc, formatToday(), y);
  y += 10;
  for (const paragraph of body) {
    y = drawLetterParagraph(doc, paragraph, y);
    y += 10;
  }

  return doc.output("blob");
}

function drawResumeHeader(doc: import("jspdf").jsPDF, header: ResumePdfHeader, y: number): number {
  y = ensureRoom(doc, y, 64);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FS_NAME);
  doc.text(header.name, MARGIN, y + FS_NAME);

  if (header.title) {
    doc.setFontSize(FS_TITLE);
    const wrappedTitle = doc.splitTextToSize(header.title, CONTENT_WIDTH * 0.42) as string[];
    wrappedTitle.slice(0, 2).forEach((line, index) => {
      doc.text(line, MARGIN + CONTENT_WIDTH, y + FS_TITLE + 2 + index * 13, { align: "right" });
    });
  }
  const titleLineCount = header.title ? (doc.splitTextToSize(header.title, CONTENT_WIDTH * 0.42) as string[]).length : 0;
  y += titleLineCount > 1 ? 42 : 30;
  doc.setLineWidth(0.65);
  doc.setDrawColor(60, 60, 60);
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);
  y += 11;

  if (header.contact) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FS_META);
    const contactLines = doc.splitTextToSize(header.contact, CONTENT_WIDTH) as string[];
    for (const line of contactLines.slice(0, 2)) {
      y = ensureRoom(doc, y, 11);
      doc.text(line, MARGIN + CONTENT_WIDTH / 2, y + FS_META, { align: "center" });
      y += 11;
    }
  }
  return y + 18;
}

function drawSectionHeading(doc: import("jspdf").jsPDF, heading: string, y: number): number {
  y += 7;
  y = ensureRoom(doc, y, 24);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FS_SECTION);
  doc.text(heading.toUpperCase(), MARGIN, y + FS_SECTION);
  y += FS_SECTION + 4;
  doc.setLineWidth(0.45);
  doc.setDrawColor(80, 80, 80);
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);
  return y + 9;
}

function drawSkillsList(doc: import("jspdf").jsPDF, skills: string[], y: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FS_BODY);
  for (const skill of skills.slice(0, 9)) y = drawBullet(doc, skill, y);
  return y + 4;
}

function drawExperienceSection(doc: import("jspdf").jsPDF, lines: string[], y: number): number {
  for (const line of lines) {
    if (!line) continue;
    if (isBulletLine(line)) {
      y = drawBullet(doc, cleanBullet(line), y);
    } else if (looksLikeCombinedRoleLine(line)) {
      const parsed = splitCombinedRoleLine(line);
      y += 7;
      y = ensureRoom(doc, y, 34);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.8);
      doc.text(parsed.title.toUpperCase(), MARGIN, y + 10.8);
      y += 14;
      if (parsed.meta) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(FS_META);
        doc.text(parsed.meta, MARGIN, y + FS_META);
        y += 16;
      }
    } else {
      y = drawParagraph(doc, line, y, CONTENT_WIDTH, "normal") + 2;
    }
  }
  return y + 2;
}

function drawPlainSection(doc: import("jspdf").jsPDF, lines: string[], y: number): number {
  for (const line of lines) {
    if (isBulletLine(line)) y = drawBullet(doc, cleanBullet(line), y);
    else y = drawParagraph(doc, line, y, CONTENT_WIDTH, "normal") + 2;
  }
  return y + 2;
}

function drawParagraph(
  doc: import("jspdf").jsPDF,
  text: string,
  y: number,
  width: number,
  style: "normal" | "bold"
): number {
  doc.setFont("helvetica", style);
  doc.setFontSize(FS_BODY);
  const wrapped = doc.splitTextToSize(text, width) as string[];
  for (const line of wrapped) {
    y = ensureRoom(doc, y, LH_BODY);
    doc.text(line, MARGIN, y + FS_BODY);
    y += LH_BODY;
  }
  return y;
}

function drawBullet(doc: import("jspdf").jsPDF, text: string, y: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FS_BODY);
  const wrapped = doc.splitTextToSize(text, CONTENT_WIDTH - 17) as string[];
  for (let j = 0; j < wrapped.length; j++) {
    y = ensureRoom(doc, y, LH_BODY);
    if (j === 0) doc.text("•", MARGIN + 2, y + FS_BODY);
    doc.text(wrapped[j], MARGIN + 17, y + FS_BODY);
    y += LH_BODY + LH_BULLET_GAP;
  }
  return y + 1;
}

function drawLetterParagraph(doc: import("jspdf").jsPDF, paragraph: string, y: number): number {
  doc.setFont("helvetica", paragraph === "Dear Hiring Manager," ? "bold" : "normal");
  doc.setFontSize(FS_LETTER_BODY);
  const wrapped = doc.splitTextToSize(paragraph, CONTENT_WIDTH) as string[];
  for (const line of wrapped) {
    y = ensureRoom(doc, y, LH_LETTER);
    doc.text(line, MARGIN, y + FS_LETTER_BODY);
    y += LH_LETTER;
  }
  return y;
}

function ensureRoom(doc: import("jspdf").jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_HEIGHT - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function extractCandidateHeader(text: string): { name?: string; contact?: string } {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const name =
    lines[0] && !isCoverLetterLabel(lines[0]) && !looksLikeLetterBodyStart(lines[0])
      ? lines[0]
      : undefined;
  const contact = lines
    .slice(1, 4)
    .find((line) => /@|\b(?:https?:\/\/|linkedin\.com)|\d{3}[-.)\s]\d{3}/i.test(line));
  return { name, contact };
}

function normalizeCoverLetterParagraphs(text: string): string[] {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((paragraph) => paragraph && !isCoverLetterLabel(paragraph))
    .filter((paragraph) => !isDateLine(paragraph));
}

function ensureGreeting(paragraphs: string[]): string[] {
  if (paragraphs.some((paragraph) => /^dear\b/i.test(paragraph))) return paragraphs;
  return ["Dear Hiring Manager,", ...paragraphs];
}

function isCoverLetterLabel(text: string): boolean {
  return /^(?:tailored\s+)?cover\s+letter:?$/i.test(text.trim());
}

function looksLikeLetterBodyStart(text: string): boolean {
  return /^(dear\b|to whom it may concern|i am writing\b|i’m writing\b|thank you\b)/i.test(text.trim());
}

function isDateLine(text: string): boolean {
  return /^(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},\s+\d{4}$/i.test(text.trim());
}

function formatToday(): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date());
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function filenameFromTitle(title: string) {
  return (
    title
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "tailored-application"
  );
}
