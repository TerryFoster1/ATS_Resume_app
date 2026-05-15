export type WritingLocale = "us_english" | "canadian_uk_english";

export function inferWritingLocaleFromJob(jobPostText: string): WritingLocale {
  const text = jobPostText.toLowerCase();
  if (
    /\b(canada|ontario|toronto|kitchener|waterloo|mississauga|vancouver|calgary|montreal|ottawa|british columbia|alberta|quebec)\b/.test(text)
  ) {
    return "canadian_uk_english";
  }
  if (
    /\b(united states|usa|u\.s\.|new york|california|texas|florida|illinois|washington|seattle|chicago|boston|san francisco|los angeles|remote usa|us-based|us based)\b/.test(text)
  ) {
    return "us_english";
  }
  return "canadian_uk_english";
}

export function localePromptInstruction(locale: WritingLocale): string {
  if (locale === "us_english") {
    return [
      "Use US English spelling and recruiter phrasing.",
      "Prefer spellings such as organization, optimize, analyze, center, behavior, and program where applicable.",
      "Use US resume tone: concise, business-focused, direct, and achievement-oriented."
    ].join("\n");
  }

  return [
    "Use Canadian/UK English spelling and recruiter phrasing.",
    "Prefer spellings such as organisation, optimise, analyse, centre, behaviour, and programme where natural, while preserving official tool names and employer wording.",
    "Use Canadian/UK resume tone: clear, measured, professional, and evidence-led."
  ].join("\n");
}
