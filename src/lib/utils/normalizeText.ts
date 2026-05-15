// Text normalisation helpers shared across the analysis pipeline.

// Collapse whitespace and remove zero-width characters that PDF parsers
// sometimes leave in extracted text. Does NOT change the case of letters or
// strip punctuation — matchers handle that themselves.
export function normalizeText(s: string): string {
  return s
    .replace(/\u00a0/g, " ")
    .replace(/\u200b/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Lower-case + strip non-alphanumeric. Used for forgiving substring matches.
export function loose(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

// Split a body of text into "bullet-ish" lines — the unit a resume bullet
// or a JD requirement typically occupies.
export function splitLines(s: string): string[] {
  return s
    .split(/\n+/)
    .map((line) => line.replace(/^[\s•\-*·●◦▪]+/, "").trim())
    .filter((line) => line.length > 0);
}

// Quick word count.
export function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

// Return true if `needle` appears in `hay` as either a substring or a
// whole-word match. For short tokens (≤3 chars) only whole-word matches
// count; otherwise substring is enough.
export function containsTerm(hay: string, needle: string): boolean {
  const term = needle.trim().toLowerCase();
  if (!term) return false;
  const lowered = hay.toLowerCase();
  if (term.length <= 3) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegex(term)}([^a-z0-9]|$)`, "i").test(
      lowered
    );
  }
  return lowered.includes(term);
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
