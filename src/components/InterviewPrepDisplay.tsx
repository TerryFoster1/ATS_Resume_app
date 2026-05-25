"use client";

type InterviewPrepDisplayProps = {
  text: string;
};

type PrepBlock =
  | { type: "heading"; text: string }
  | { type: "bullet"; text: string }
  | { type: "paragraph"; text: string };

export default function InterviewPrepDisplay({ text }: InterviewPrepDisplayProps) {
  const blocks = formatInterviewPrep(text);
  if (blocks.length === 0) return null;

  return (
    <div className="interview-prep-display">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h4 key={`${index}-${block.text}`} className="interview-prep-heading">
              {block.text}
            </h4>
          );
        }
        if (block.type === "bullet") {
          return (
            <p key={`${index}-${block.text}`} className="interview-prep-bullet">
              <span aria-hidden />
              <span>{block.text}</span>
            </p>
          );
        }
        return (
          <p key={`${index}-${block.text}`} className="interview-prep-paragraph">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

function formatInterviewPrep(text: string): PrepBlock[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cleaned = line.replace(/^\s*#{1,4}\s*/, "").trim();
      if (isBullet(cleaned)) {
        return {
          type: "bullet",
          text: cleaned.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim()
        };
      }
      if (isHeading(cleaned)) {
        return {
          type: "heading",
          text: cleaned.replace(/[:\s]+$/, "")
        };
      }
      return { type: "paragraph", text: cleaned };
    });
}

function isBullet(line: string) {
  return /^\s*(?:[-*•]|\d+[.)])\s+/.test(line);
}

function isHeading(line: string) {
  if (line.length > 90) return false;
  if (/:\s*$/.test(line)) return true;
  const lower = line.toLowerCase();
  return /^(likely|screening|behavioral|behavioural|role-specific|weak|missing|star|what to prepare|preparation|questions|answer guidance)/.test(lower);
}
