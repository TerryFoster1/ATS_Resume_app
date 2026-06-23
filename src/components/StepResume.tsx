"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import LoadingIndicator from "@/components/LoadingIndicator";
import StepIndicator from "@/components/StepIndicator";
import { DocumentStackGraphic } from "@/components/VisualDecor";
import { extractTransferableSkillProfile } from "@/lib/transferableSkillExtraction";

interface Props {
  value: string;
  onChange: (text: string) => void;
  onNext: (text: string) => void;
}

const UPLOAD_ERROR =
  "We couldn't extract text from that file. Please try another resume file.";

export default function StepResume({ value, onChange, onNext }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeUploadKeyRef = useRef<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extractedFileName, setExtractedFileName] = useState<string | null>(
    null
  );
  const [hasUploadedResume, setHasUploadedResume] = useState(
    value.trim().length >= 50
  );
  const [warning, setWarning] = useState<string | null>(null);
  const [tooShort, setTooShort] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false);
  const resumeText = value.trim();
  const resumeAvailable = resumeText.length >= 50;
  const showUploadControls = !resumeAvailable || replaceMode;
  const resumeLabel = extractedFileName ?? selectedFile?.name ?? "Resume already added";
  const insightPreview = useMemo(
    () => buildUploadInsightPreview(resumeText),
    [resumeText]
  );

  useEffect(() => {
    if (resumeAvailable) {
      setHasUploadedResume(true);
    }
  }, [resumeAvailable]);

  function handleFileSelection(file: File | null) {
    setSelectedFile(file);
    setExtractedFileName(null);
    setWarning(null);
  }

  async function uploadSelectedFile() {
    const file = selectedFile;
    if (!file) {
      setWarning("Choose a PDF, DOCX, or TXT resume file first.");
      return;
    }

    const uploadKey = `${file.name}-${file.size}-${file.lastModified}`;
    if (uploading || activeUploadKeyRef.current === uploadKey) return;

    activeUploadKeyRef.current = uploadKey;
    setUploading(true);
    setWarning(null);
    setExtractedFileName(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("enrichProfile", "1");

      const res = await fetch("/api/parse-resume", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Parse failed");

      const data = (await res.json()) as {
        text?: string;
        warning?: string;
        profileEnriched?: boolean;
        profileImportWarning?: string;
      };
      const text = typeof data.text === "string" ? data.text : "";
      if (!text.trim()) throw new Error("No text extracted");

      onChange(text);
      if (textareaRef.current) textareaRef.current.value = text;
      setExtractedFileName(file.name);
      setHasUploadedResume(true);
      setReplaceMode(false);
      setTooShort(false);
      if (data.profileImportWarning) setWarning(data.profileImportWarning);
      else if (data.warning) setWarning(data.warning);
    } catch {
      setWarning(UPLOAD_ERROR);
    } finally {
      setUploading(false);
      activeUploadKeyRef.current = null;
    }
  }

  function continueToJob() {
    const text = textareaRef.current?.value ?? value;
    onChange(text);
    if (text.trim().length < 50) {
      setTooShort(true);
      return;
    }
    setTooShort(false);
    onNext(text);
  }

  return (
    <section className="space-y-5">
      <StepIndicator current={1} total={4} label="Resume" />

      <div className="app-screen-card space-y-6">
        <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
          <div className="app-step-hero p-6 sm:p-8">
            <div className="flex h-full flex-col justify-between gap-6">
              <div>
                <p className="app-kicker">{resumeAvailable && !replaceMode ? "Resume context" : "Your experience"}</p>
                <h2 className="mt-2 text-3xl app-heading">
                  {resumeAvailable && !replaceMode ? "Resume added" : "Bring in your resume"}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--color-text-primary)]/74">
                  {resumeAvailable && !replaceMode
                    ? "Career Ladder already has resume evidence for this workflow. Continue when you are ready, or replace it if this is not the resume you want to use."
                    : "Upload your resume so Career Ladder can start finding strengths, gaps, and recruiter-readable evidence in your background."}
                </p>
              </div>
              <DocumentStackGraphic className="mx-auto" />
            </div>
          </div>

          <div className="app-consult-card p-5 sm:p-6">
            {!showUploadControls ? (
              <div className="space-y-5">
                <div>
                  <p className="app-section-label">Resume context</p>
                  <h3 className="mt-2 text-xl app-heading">
                    Resume Added <span className="text-emerald-600" aria-hidden>{"\u2713"}</span>
                  </h3>
                  <p className="mt-3 text-sm font-semibold text-[var(--color-text-muted)]">Using:</p>
                  <div className="mt-2 rounded-[18px] border border-[#d8e6f3] bg-white px-4 py-3 text-sm font-black text-[var(--color-text-primary)] shadow-[var(--shadow-inset-soft)]">
                    {resumeLabel}
                  </div>
                </div>

                <div className="upload-next-checklist">
                  <h4>Career Ladder will combine</h4>
                  {[
                    "your uploaded resume",
                    "your Master Career Profile",
                    "transferable skills",
                    "target role context"
                  ].map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>

                <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                  You do not need to upload again unless this is the wrong resume or the original import missed important details.
                </p>

                {warning && <p className="text-xs text-orange-700">{warning}</p>}

                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={continueToJob} className="app-button-primary">
                    Continue
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplaceMode(true);
                      setSelectedFile(null);
                      setWarning(null);
                    }}
                    className="app-button-secondary"
                  >
                    Replace resume
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <p className="app-section-label">Resume import</p>
                  <h3 className="mt-2 text-xl app-heading">
                    {resumeAvailable ? "Replace resume file" : "Choose a resume file"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                    PDF, DOC, DOCX, and TXT files are supported. After upload, you will
                    see an early read on what your experience may already prove.
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="resume-upload-drop-zone"
                  >
                    <span className="resume-upload-icon" aria-hidden>+</span>
                    <strong>Drag & drop your file here</strong>
                    <span>or choose file</span>
                    <small>PDF, DOCX, DOC, or TXT (max 10MB)</small>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onClick={() => {
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    onChange={(e) => handleFileSelection(e.currentTarget.files?.[0] ?? null)}
                    className="sr-only"
                  />

                  <div className="upload-next-checklist">
                    <h4>What happens next</h4>
                    {["We review your resume", "Highlight your strengths", "Identify gaps and keywords", "Recommend next best steps"].map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>

                  <div className="app-soft-band px-4 py-3 text-sm text-[var(--color-text-primary)]">
                    <span className="font-semibold">
                      {selectedFile ? selectedFile.name : "No file selected"}
                    </span>
                    <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                      {selectedFile
                        ? "Ready to review for strengths, gaps, and transferable signals."
                        : "Resume upload imports your current experience and can enrich your Master Career Profile when signed in."}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void uploadSelectedFile()}
                    disabled={uploading || !selectedFile}
                    className="app-button-primary w-full px-5 py-2.5"
                  >
                    {uploading ? "Uploading..." : resumeAvailable ? "Replace resume" : "Upload resume"}
                  </button>

                  {resumeAvailable && (
                    <button
                      type="button"
                      onClick={() => {
                        setReplaceMode(false);
                        setSelectedFile(null);
                        setWarning(null);
                      }}
                      className="app-button-secondary w-full justify-center"
                    >
                      Keep current resume
                    </button>
                  )}

                  {uploading && (
                    <LoadingIndicator
                      variant="inline"
                      message={"Reviewing the experience in your resume..."}
                    />
                  )}
                  {extractedFileName && !uploading && (
                    <p className="text-xs font-semibold text-emerald-700">
                      Reviewed {extractedFileName}. Check the insight preview before continuing.
                    </p>
                  )}
                  {warning && <p className="text-xs text-orange-700">{warning}</p>}
                </div>
              </>
            )}
          </div>
        </div>

        {resumeAvailable && (
          <PostUploadInsightPreview
            preview={insightPreview}
            onApply={continueToJob}
          />
        )}

        <div className="app-work-panel p-5 sm:p-6">
          <div>
            <label className="block text-sm font-black text-[var(--color-text-primary)]">
              Extracted or pasted resume text
            </label>
              <textarea
                ref={textareaRef}
                defaultValue={value}
                onChange={(e) => {
                  onChange(e.target.value);
                if (tooShort && e.target.value.trim().length >= 50) {
                  setTooShort(false);
                }
                }}
                rows={16}
                readOnly={!resumeAvailable && !hasUploadedResume}
                className="app-textarea-mono mt-3 min-h-[28rem] read-only:bg-[#f9f4ee] read-only:text-[var(--color-text-muted)]"
                placeholder="Uploaded resume text will appear here for review."
              />
            {tooShort && (
              <p className="text-xs text-orange-700">
                Add a little more resume detail before continuing.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={continueToJob}
          className="app-button-primary"
        >
          {resumeAvailable ? "Continue" : "Next"}
        </button>
      </div>
    </section>
  );
}

type UploadInsightPreview = {
  strengths: string[];
  employerValue: string[];
  frictionPoints: string[];
};

function PostUploadInsightPreview({
  preview,
  onApply
}: {
  preview: UploadInsightPreview;
  onApply: () => void;
}) {
  return (
    <section className="app-feature-panel upload-insight-preview space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="app-kicker">Step 2 of 3</p>
          <h3 className="mt-2 text-2xl app-heading">We&apos;ve reviewed your experience.</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
            Here&apos;s what Career Ladder noticed before you choose your next step.
            These are early signals from your resume, not final claims.
          </p>
        </div>
        <span className="upload-insight-status">Resume reviewed</span>
      </div>

      <div className="upload-insight-flow">
        <InsightColumn title="Strengths we found" items={preview.strengths} tone="strength" />
        <InsightColumn title="Experience employers may value" items={preview.employerValue} tone="value" />
        <InsightColumn title="Possible friction points" items={preview.frictionPoints} tone="risk" />
      </div>

      <div className="rounded-[24px] bg-white p-4 shadow-[var(--shadow-inset-soft)]">
        <p className="app-kicker">Step 3 of 3</p>
        <h4 className="mt-2 text-lg app-heading">Choose the next move this resume should power.</h4>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <NextStepCard
            title="Plan My Career"
            body="Use these signals to explore roles where your existing experience may already translate."
            href="/career-coach"
          />
          <NextStepCard
            title="Apply For A Position"
            body="Paste a job posting next so Career Ladder can compare this evidence against real recruiter expectations."
            onClick={onApply}
            primary
          />
          <NextStepCard
            title="Prepare For An Interview"
            body="Use your resume evidence to prepare stronger examples once you choose a target role."
            onClick={onApply}
          />
        </div>
      </div>
    </section>
  );
}

function InsightColumn({
  title,
  items,
  tone
}: {
  title: string;
  items: string[];
  tone: "strength" | "value" | "risk";
}) {
  const toneClass =
    tone === "risk"
      ? "border-orange-200 bg-orange-50/70"
      : tone === "value"
        ? "border-purple-200 bg-purple-50/70"
        : "border-emerald-200 bg-emerald-50/70";
  return (
    <article className={`rounded-[24px] border px-4 py-4 ${toneClass}`}>
      <h4 className="text-sm font-black text-[var(--color-text-primary)]">{title}</h4>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-6 text-[var(--color-text-muted)]">
            <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2f80ed]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function NextStepCard({
  title,
  body,
  href,
  onClick,
  primary = false
}: {
  title: string;
  body: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
}) {
  const className = primary
    ? "rounded-[20px] bg-[var(--color-accent-purple)] px-4 py-4 text-left text-white shadow-[0_18px_46px_rgba(107,80,255,0.22)]"
    : "rounded-[20px] border border-[var(--color-border)] bg-white px-4 py-4 text-left shadow-[var(--shadow-inset-soft)]";
  const content = (
    <>
      <strong className={primary ? "block text-base font-black text-white" : "block text-base font-black text-[var(--color-text-primary)]"}>
        {title}
      </strong>
      <span className={primary ? "mt-2 block text-sm leading-6 text-white/78" : "mt-2 block text-sm leading-6 text-[var(--color-text-muted)]"}>
        {body}
      </span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function buildUploadInsightPreview(text: string): UploadInsightPreview {
  if (text.trim().length < 50) {
    return {
      strengths: [
        "Your resume may contain useful experience signals once more detail is available.",
        "Career Ladder can look for responsibility, service, coordination, and communication evidence."
      ],
      employerValue: [
        "This could reveal transferable skills once the resume includes concrete examples."
      ],
      frictionPoints: [
        "We may want to clarify your strongest responsibilities.",
        "Your resume may need more role-specific examples."
      ]
    };
  }

  const extraction = extractTransferableSkillProfile(text);
  const strengths = [
    ...extraction.professionalFunctions.map((item) => item.functionName),
    ...extraction.explicitSkills.map((item) => item.skill)
  ];
  const employerValue = [
    ...extraction.implicitSkills.map((item) => item.skill),
    ...extraction.transferableSkills
  ];
  const frictionPoints = extraction.recruiterConcerns.map(
    (item) => `We may want to clarify: ${item}`
  );

  return {
    strengths: takeOrFallback(strengths, [
      "Customer-facing or service experience may be present.",
      "Communication and follow-through may be worth strengthening.",
      "Your resume suggests practical responsibility that may need clearer framing."
    ], 5),
    employerValue: takeOrFallback(employerValue, [
      "Relationship building",
      "Problem solving",
      "Process ownership",
      "Communication experience"
    ], 5),
    frictionPoints: takeOrFallback(frictionPoints, [
      "Your resume may not clearly show measurable results.",
      "Some roles may expect specific tools or credentials.",
      "Your experience may need stronger role-specific positioning.",
      "Interview stories may need clearer examples."
    ], 4)
  };
}

function takeOrFallback(values: string[], fallback: string[], limit: number): string[] {
  const cleaned = values
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const unique: string[] = [];
  for (const value of cleaned) {
    if (unique.some((item) => item.toLowerCase() === value.toLowerCase())) continue;
    unique.push(value);
  }
  return (unique.length ? unique : fallback).slice(0, limit);
}




