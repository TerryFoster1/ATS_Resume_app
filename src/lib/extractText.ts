// Extract plain text from uploaded resumes.
// Server-only: uses pdf-parse (PDF) and mammoth (DOCX).

// pdf-parse ships a test fixture runner that trips up Next's bundler if we
// import from "pdf-parse" directly. Using the internal entry avoids it.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (
  data: Buffer
) => Promise<{ text: string; numpages: number }>;

import mammoth from "mammoth";

export interface ExtractResult {
  text: string;
  warning?: string;
}

export async function extractPdf(buffer: Buffer): Promise<ExtractResult> {
  const res = await pdfParse(buffer);
  const text = normalizeWhitespace(res.text ?? "");
  return withWarning(text);
}

export async function extractDocx(buffer: Buffer): Promise<ExtractResult> {
  const res = await mammoth.extractRawText({ buffer });
  const text = normalizeWhitespace(res.value ?? "");
  return withWarning(text);
}

export function extractTextFile(buffer: Buffer): ExtractResult {
  const text = normalizeWhitespace(buffer.toString("utf8"));
  return withWarning(text);
}

export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function withWarning(text: string): ExtractResult {
  const result: ExtractResult = { text };
  // Heuristic checks that the extracted text is reviewable.
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 80) {
    result.warning =
      "The extracted text looks short. If this doesn't look like your resume, paste it in manually.";
  } else if (!/\n/.test(text)) {
    result.warning =
      "The extracted text has no line breaks — the original file may have been scanned as an image. Review it below and edit if needed.";
  } else if (/[\uFFFD]/.test(text)) {
    result.warning =
      "Some characters could not be decoded. Review the text below and clean it up before continuing.";
  }
  return result;
}
