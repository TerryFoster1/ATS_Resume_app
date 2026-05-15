"use client";

import { useRef, useState } from "react";
import LoadingIndicator from "@/components/LoadingIndicator";
import StepIndicator from "@/components/StepIndicator";
import { DocumentStackGraphic } from "@/components/VisualDecor";

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

      const res = await fetch("/api/parse-resume", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Parse failed");

      const data = (await res.json()) as { text?: string; warning?: string };
      const text = typeof data.text === "string" ? data.text : "";
      if (!text.trim()) throw new Error("No text extracted");

      onChange(text);
      if (textareaRef.current) textareaRef.current.value = text;
      setExtractedFileName(file.name);
      setHasUploadedResume(true);
      setTooShort(false);
      if (data.warning) setWarning(data.warning);
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
                <p className="app-kicker">Step one</p>
                <h2 className="mt-2 text-3xl app-heading">Bring in your resume</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--color-text-primary)]/74">
                  Upload your resume file. We extract the text into an editable
                  review space before the job match.
                </p>
              </div>
              <DocumentStackGraphic className="mx-auto" />
            </div>
          </div>

          <div className="app-consult-card p-5 sm:p-6">
            <div className="mb-5">
              <p className="app-section-label">Upload module</p>
              <h3 className="mt-2 text-xl app-heading">
                Choose a resume file
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                PDF, DOC, DOCX, and TXT files are supported. Click Upload after
                choosing a file so the extracted text appears below.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="app-button-secondary px-5 py-2.5"
                >
                  Choose file
                </button>
              </div>

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

              <div className="app-soft-band px-4 py-3 text-sm text-[var(--color-text-primary)]">
                <span className="font-semibold">
                  {selectedFile ? selectedFile.name : "No file selected"}
                </span>
                <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                  {selectedFile
                    ? "Ready to upload and extract."
                    : "Resume upload is required for this first version."}
                </span>
              </div>

              <button
                type="button"
                onClick={() => void uploadSelectedFile()}
                disabled={uploading || !selectedFile}
                className="app-button-primary w-full px-5 py-2.5"
              >
                {uploading ? "Uploading..." : "Upload resume"}
              </button>

              {uploading && (
                <LoadingIndicator
                  variant="inline"
                  message={"Extracting text from your file\u2026"}
                />
              )}
              {extractedFileName && !uploading && (
                <p className="text-xs font-semibold text-emerald-700">
                  Extracted text from {extractedFileName}. Review it before continuing.
                </p>
              )}
              {warning && <p className="text-xs text-orange-700">{warning}</p>}
            </div>
          </div>
        </div>

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
                readOnly={!hasUploadedResume}
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
          Next
        </button>
      </div>
    </section>
  );
}


