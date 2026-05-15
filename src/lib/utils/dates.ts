// Date and years-of-experience parsing.
//
// Two jobs:
//   1. Convert resume date ranges (e.g. "Jan 2018 – Mar 2024", "2020-Present")
//      to an approximate number of years.
//   2. Parse JD experience requirements (e.g. "2-3 years", "5+ years",
//      "minimum 4 years experience") to a {min,max} pair.
//
// "Approximate" is fine. Both sides round to the nearest reasonable
// integer; the matcher's experience-threshold check is intentionally loose
// (handoff §13 — 10y satisfies 2-3y, etc.).

const MONTH_PATTERN =
  /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)/i;

const MONTH_INDEX: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11
};

export function parseRangeToYears(
  rangeText: string,
  now: Date = new Date()
): number | undefined {
  const text = rangeText.trim();
  if (!text) return undefined;

  // Recognised separators between start and end.
  const sep = /\s*(?:[-–—]|to)\s*/;
  const parts = text.split(sep);
  if (parts.length < 2) {
    // Single date — no range.
    return undefined;
  }
  const start = parseSingleDate(parts[0]);
  const endRaw = parts.slice(1).join(" ").trim().toLowerCase();
  const end =
    /(present|current|now)/.test(endRaw)
      ? { year: now.getFullYear(), month: now.getMonth() }
      : parseSingleDate(parts[1]);

  if (!start || !end) return undefined;
  const months =
    (end.year - start.year) * 12 + (end.month - start.month) + 1;
  if (months <= 0) return undefined;
  // Round up — six months in a role usually rounds to 1y for resume purposes.
  return Math.max(1, Math.round(months / 12));
}

function parseSingleDate(s: string): { year: number; month: number } | undefined {
  const text = s.trim().toLowerCase();
  if (!text) return undefined;

  // "Jan 2021", "January 2021", "Sept 2021"
  const monthYear = text.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{4})\b/i
  );
  if (monthYear) {
    const month = MONTH_INDEX[monthYear[1].toLowerCase()] ?? 0;
    return { year: parseInt(monthYear[2], 10), month };
  }

  // "01/2021", "1/2021"
  const slash = text.match(/\b(0?[1-9]|1[0-2])\/(\d{4})\b/);
  if (slash) {
    return { year: parseInt(slash[2], 10), month: parseInt(slash[1], 10) - 1 };
  }

  // Bare year "2021"
  const year = text.match(/\b(19|20)\d{2}\b/);
  if (year) {
    return { year: parseInt(year[0], 10), month: 0 };
  }

  return undefined;
}

// Sum the years across multiple non-overlapping role ranges. Used to compute
// "years of <function>" from the resume.
//
// `ranges` should be parsed already (number of years each). Caller is
// responsible for de-duplication and overlap handling — we just sum and
// cap at 50.
export function sumYears(ranges: number[]): number {
  const total = ranges.reduce((s, n) => s + n, 0);
  return Math.min(50, Math.max(0, total));
}

// Parse a JD years requirement.
//
// Examples:
//   "2-3 years"           → { min: 2, max: 3 }
//   "2 to 3 years"        → { min: 2, max: 3 }
//   "5+ years"            → { min: 5 }
//   "minimum 4 years"     → { min: 4 }
//   "at least 3 years"    → { min: 3 }
//   "3 years experience"  → { min: 3, max: 3 }
//   undefined when nothing parseable
export function parseRequiredYears(
  text: string
): { min?: number; max?: number } | undefined {
  const t = text.toLowerCase();

  // Range: "2-3 years" / "2 to 3 years"
  const range = t.match(
    /\b(\d{1,2})\s*(?:[-–—]|to)\s*(\d{1,2})\s*(?:\+)?\s*(?:yrs?|years)\b/
  );
  if (range) {
    return { min: parseInt(range[1], 10), max: parseInt(range[2], 10) };
  }

  // Plus form: "5+ years"
  const plus = t.match(/\b(\d{1,2})\s*\+\s*(?:yrs?|years)\b/);
  if (plus) {
    return { min: parseInt(plus[1], 10) };
  }

  // Minimum form
  const minimum = t.match(
    /\b(?:minimum|min\.?|at least|over)\s*(\d{1,2})\s*(?:yrs?|years)\b/
  );
  if (minimum) {
    return { min: parseInt(minimum[1], 10) };
  }

  // Bare form: "3 years"
  const bare = t.match(/\b(\d{1,2})\s*(?:yrs?|years)\b/);
  if (bare) {
    const n = parseInt(bare[1], 10);
    return { min: n, max: n };
  }

  return undefined;
}

// Does `candidateYears` satisfy `requirement`?
//
// Per handoff §13: longer related/transferable experience satisfies a
// shorter requirement. So if the requirement is "2-3 years" and the
// candidate has 10 years, it satisfies.
//
// Returns true only when the candidate clearly meets the floor.
export function satisfiesYears(
  candidateYears: number | undefined,
  requirement: { min?: number; max?: number } | undefined
): boolean {
  if (candidateYears === undefined || candidateYears <= 0) return false;
  if (!requirement) return true;
  if (requirement.min !== undefined && candidateYears < requirement.min) {
    return false;
  }
  return true;
}
