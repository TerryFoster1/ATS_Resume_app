// JD keyword derivation.
//
// Used only by the ATS keyword-coverage rule in atsChecker.ts. We don't
// run a separate LLM call to extract keywords anymore — the analysis
// pipeline already produced JobRequirement[] with importance tags, so we
// simply project those into the small {required, preferred} structure
// the ATS rule expects.
//
// Resume-sized tokens only: anything > 60 chars or ending in a period
// (probably a sentence) is filtered out. Lower-case and dedupe so
// containment checks in atsChecker behave consistently.

import type { JdKeywords, JobRequirement } from "./types";
import { getCluster } from "./knowledge/skillClusters";

export function deriveJdKeywords(
  requirements: JobRequirement[]
): JdKeywords {
  const required = new Set<string>();
  const preferred = new Set<string>();
  for (const r of requirements) {
    const t = r.text.trim();
    if (!t || t.length > 60) continue;
    // Drop full-sentence requirements — the ATS rule wants tokens, not
    // sentences. A trailing period is the easiest signal.
    if (/[.!?]$/.test(t)) continue;
    // Skip RESPONSIBILITY / TRANSFERABLE — these are duties, not the
    // candidate-side prerequisites the ATS rule is looking for.
    if (r.intent === "RESPONSIBILITY" || r.intent === "TRANSFERABLE") {
      continue;
    }
    if (shouldSkipKeywordRequirement(r)) {
      continue;
    }
    const terms = keywordTermsForRequirement(r);
    if (terms.length === 0) continue;
    if (r.intent === "PREFERRED" || r.importance === "LOW") {
      terms.forEach((term) => preferred.add(term));
    } else {
      terms.forEach((term) => required.add(term));
    }
  }
  return {
    required: [...required].slice(0, 25),
    preferred: [...preferred].slice(0, 15)
  };
}

function shouldSkipKeywordRequirement(r: JobRequirement): boolean {
  if (r.kind === "EXPERIENCE_YEARS" || r.kind === "SOFT_SKILL") return true;
  return /\b(driver'?s license|driving licence|valid license|valid licence|willingness to travel|able to travel|travel as required|fluent english|time management|organizational skills?)\b/i.test(
    r.text
  );
}

function keywordTermsForRequirement(r: JobRequirement): string[] {
  if (r.kind === "TOOL" || r.kind === "CERTIFICATION") {
    return compactTerms(r.text);
  }

  const clusterTerms = r.skillClusters
    .map((id) => getCluster(id)?.label)
    .filter((label): label is string => Boolean(label))
    .flatMap((label) => label.split("/").map((part) => part.trim()))
    .map(normalizeKeyword)
    .filter(Boolean);

  const compact = compactTerms(r.text);
  return [...new Set([...clusterTerms, ...compact])].slice(0, 3);
}

function compactTerms(text: string): string[] {
  const explicitTools = text.match(
    /\b(?:Salesforce|HubSpot|Microsoft Office|Google Workspace|Microsoft Excel|Excel|Word|PowerPoint|Google Sheets|SQL|Tableau|Power BI|Adobe [A-Za-z]+)\b/gi
  );
  if (explicitTools?.length) {
    return [...new Set(explicitTools.map(normalizeKeyword))];
  }

  const cleaned = normalizeKeyword(
    text
      .replace(/\b\d+\s*(?:-|–|—|to)?\s*\d*\+?\s*years?\s+(?:of\s+)?/gi, "")
      .replace(/\b(?:excellent|strong|proven|ability to|experience with|experience in|proficiency with|common)\b/gi, "")
      .replace(/\b(?:in a related field or equivalent professional experience|as required|required)\b/gi, "")
  );

  if (!cleaned || cleaned.length > 40) return [];
  return [cleaned];
}

function normalizeKeyword(text: string): string {
  return text
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
