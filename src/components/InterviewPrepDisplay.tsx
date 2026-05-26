"use client";

type InterviewPrepDisplayProps = {
  text: string;
};

type PrepLine = {
  label?: string;
  text: string;
};

type PrepSection = {
  title: string;
  lines: PrepLine[];
};

const DEFAULT_SECTION = "Interview prep notes";

export default function InterviewPrepDisplay({ text }: InterviewPrepDisplayProps) {
  const sections = parseInterviewPrep(text);
  if (sections.length === 0) return null;

  const likely = sections.find((section) => isLikelySection(section.title));
  const rest = sections.filter((section) => section !== likely);

  return (
    <div className="interview-prep-display">
      {likely && (
        <section className="interview-prep-feature">
          <div>
            <p className="app-kicker">Most likely to appear</p>
            <h4>{likely.title}</h4>
          </div>
          <PrepLines lines={likely.lines} featured />
        </section>
      )}

      <div className="interview-prep-section-grid">
        {rest.map((section) => (
          <section
            key={section.title}
            className={isStarSection(section.title) ? "interview-prep-section is-star" : "interview-prep-section"}
          >
            <h4>{section.title}</h4>
            <PrepLines lines={section.lines} />
          </section>
        ))}
      </div>
    </div>
  );
}

function PrepLines({ lines, featured = false }: { lines: PrepLine[]; featured?: boolean }) {
  return (
    <div className="interview-prep-lines">
      {lines.map((line, index) => {
        const isQuestion = isQuestionLine(line);
        return (
          <article
            key={`${index}-${line.label ?? ""}-${line.text.slice(0, 40)}`}
            className={[
              "interview-prep-line",
              isQuestion ? "is-question" : "",
              featured ? "is-featured" : "",
              isStarLabel(line.label) ? "is-star-line" : ""
            ].filter(Boolean).join(" ")}
          >
            {line.label && <span>{line.label}</span>}
            <p>{line.text}</p>
          </article>
        );
      })}
    </div>
  );
}

function parseInterviewPrep(text: string): PrepSection[] {
  const sections: PrepSection[] = [];
  let current: PrepSection | null = null;

  for (const rawLine of text.split("\n")) {
    const line = cleanLine(rawLine);
    if (!line) continue;
    if (/^recruiter-style interview prep$/i.test(line)) continue;

    if (isSectionHeading(line)) {
      current = { title: normalizeTitle(line), lines: [] };
      sections.push(current);
      continue;
    }

    if (!current) {
      current = { title: DEFAULT_SECTION, lines: [] };
      sections.push(current);
    }

    current.lines.push(parsePrepLine(line));
  }

  return sections
    .map((section) => ({
      ...section,
      lines: mergeQuestionContinuations(section.lines)
    }))
    .filter((section) => section.lines.length > 0);
}

function cleanLine(line: string) {
  return line
    .replace(/^\s*#{1,4}\s*/, "")
    .replace(/^\s*(?:[-*]|\u2022)\s*/, "")
    .trim();
}

function isSectionHeading(line: string) {
  if (line.length > 92) return false;
  const normalized = line.toLowerCase().replace(/[:\s]+$/, "");
  return [
    "most likely to appear",
    "likely screening questions",
    "screening questions",
    "behavioural questions",
    "behavioral questions",
    "role-specific questions",
    "role specific questions",
    "technical or operational questions",
    "technical/operational questions",
    "questions about gaps or risk areas",
    "weak-area prep",
    "weak area prep",
    "star guidance",
    "what they are evaluating",
    "how to position your experience",
    "what to prepare",
    "what to prepare before the interview",
    "strong closing points"
  ].includes(normalized);
}

function normalizeTitle(line: string) {
  return line.replace(/[:\s]+$/, "");
}

function parsePrepLine(line: string): PrepLine {
  const numbered = line.match(/^\d+[.)]\s*(.+)$/);
  const withoutNumber = numbered ? numbered[1].trim() : line;
  const labeled = withoutNumber.match(/^([A-Za-z][A-Za-z /-]{2,34}):\s*(.*)$/);
  if (labeled) {
    const label = titleCase(labeled[1].trim());
    const text = labeled[2].trim();
    return { label, text: text || label };
  }
  return { text: withoutNumber };
}

function mergeQuestionContinuations(lines: PrepLine[]) {
  const merged: PrepLine[] = [];
  for (const line of lines) {
    if (line.label || isQuestionLine(line) || merged.length === 0) {
      merged.push(line);
      continue;
    }
    merged.push(line);
  }
  return merged;
}

function isQuestionLine(line: PrepLine) {
  return line.label?.toLowerCase() === "question" || /\?$/.test(line.text);
}

function isLikelySection(title: string) {
  return /most likely/i.test(title);
}

function isStarSection(title: string) {
  return /behaviou?r|star/i.test(title);
}

function isStarLabel(label?: string) {
  return Boolean(label && /^(Situation|Task|Action|Result)$/i.test(label));
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
