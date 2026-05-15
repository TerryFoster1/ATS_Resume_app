const DATE_TOKEN = String.raw`(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|present|current|\d{4})`;
const MOJIBAKE_EN_DASH = "\u00e2\u20ac\u201c";
const MOJIBAKE_EM_DASH = "\u00e2\u20ac\u201d";
const DATE_RANGE_DASH = new RegExp(
  `\\b(${DATE_TOKEN})(?:\\s+\\d{4})?\\s*(?:-|\\u2013|${MOJIBAKE_EN_DASH})\\s*(${DATE_TOKEN})(?:\\s+\\d{4})?\\b`,
  "gi"
);
const DASH_RUN = new RegExp(`(?:\\u2013|\\u2014|\\u2015|${MOJIBAKE_EN_DASH}|${MOJIBAKE_EM_DASH}|-)+`, "g");
const UNSAFE_DASH = new RegExp(`(?:\\u2014|\\u2015|${MOJIBAKE_EM_DASH})`);

export function sanitizeGeneratedText(text: string): string {
  if (!text) return "";
  const protectedRanges: string[] = [];
  const withProtectedRanges = text.replace(DATE_RANGE_DASH, (match) => {
    const token = `@@ATS_DATE_RANGE_${protectedRanges.length}@@`;
    protectedRanges.push(match.replace(DASH_RUN, " - ").replace(/\s+/g, " "));
    return token;
  });

  const cleaned = withProtectedRanges
    .replace(new RegExp(`\\s*(?:\\u2014|\\u2015|${MOJIBAKE_EM_DASH})\\s*`, "g"), ", ")
    .replace(new RegExp(`\\s*(?:\\u2013|${MOJIBAKE_EN_DASH})\\s*`, "g"), ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+,/g, ",")
    .replace(/,\s+/g, ", ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  return protectedRanges.reduce(
    (result, range, index) => result.replace(`@@ATS_DATE_RANGE_${index}@@`, range),
    cleaned
  );
}

export function hasUnsafeDash(text: string): boolean {
  return UNSAFE_DASH.test(text);
}
