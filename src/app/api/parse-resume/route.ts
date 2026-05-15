// POST /api/parse-resume
// Accepts multipart/form-data with a single "file" field (.pdf, .docx, or .txt).
// Returns { text, warning? }.

import { NextResponse } from "next/server";
import { extractDocx, extractPdf, extractTextFile } from "@/lib/extractText";
import { inspectResumeStructure } from "@/lib/resumeStructure";
import type { ParseResumeResponse } from "@/lib/types";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Max 10 MB." },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    const type = file.type;

    const isPdf = type === "application/pdf" || name.endsWith(".pdf");
    const isDocx =
      type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx");
    const isText =
      type === "text/plain" ||
      name.endsWith(".txt") ||
      name.endsWith(".text");

    let result: ParseResumeResponse;
    if (isPdf) {
      result = await extractPdf(buffer);
    } else if (isDocx) {
      result = await extractDocx(buffer);
    } else if (isText) {
      result = extractTextFile(buffer);
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a .pdf, .docx, or .txt." },
        { status: 415 }
      );
    }

    const structure = inspectResumeStructure(result.text);
    if (process.env.NODE_ENV !== "production") {
      console.info("[parse-resume-debug]", {
        fileName: file.name,
        rawTextPreview: result.text.slice(0, 2000),
        detectedSections: structure.sections,
        sectionLineRanges: structure.sectionLineRanges,
        dateRanges: structure.dateRanges,
        roles: structure.roles.map((role) => ({
          title: role.title,
          company: role.company,
          dateRange: role.dateRange,
          bulletCount: role.bullets.length,
          paragraphDescriptionCount: role.descriptionLineCount,
          missingDescriptionReason: role.hasDescriptions
            ? ""
            : "No bullet, sentence, action, or paragraph description lines detected before the next role."
        })),
        education: structure.education
      });
    }
    return NextResponse.json({
      ...result,
      structured: {
        roles: structure.roles.map((role) => ({
          title: role.title,
          company: role.company,
          location: role.location,
          dateRange: role.dateRange,
          bullets: role.bullets
        })),
        education: structure.education,
        skills: structure.skills
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Parse failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
