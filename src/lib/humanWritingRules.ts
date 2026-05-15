export const BANNED_AI_PHRASES = [
  "proven record",
  "proven track record",
  "known for",
  "results-driven",
  "results driven",
  "dynamic professional",
  "passionate about",
  "seasoned professional",
  "highly motivated",
  "detail-oriented professional",
  "detail oriented professional",
  "at the intersection of",
  "intersection of",
  "uniquely positioned",
  "brings hands-on experience",
  "consumer-facing businesses",
  "cross-functional stakeholder coordination",
  "holds post-graduate credentials",
  "fast-paced environments",
  "not just",
  "not only",
  "not about",
  "that's not",
  "that is not",
  "more than"
];

export const HUMAN_WRITING_RULES = `Human writing rules:
- Sound like a strong candidate and a skilled resume strategist wrote this, not an AI system.
- Use confident, believable, recruiter-friendly language.
- Vary sentence rhythm, sentence length, and bullet openings.
- Avoid robotic sentence patterns and repeated openings across bullets.
- Avoid keyword stuffing. Use job language naturally only where it is supported by evidence.
- Avoid generic filler and inflated claims.
- Do not copy full job-posting sentences.
- Do not use em dashes anywhere. Replace em dashes with commas or periods.
- Avoid these phrases: ${BANNED_AI_PHRASES.join(", ")}.
- Avoid comparative marketing phrasing such as "not X, but Y", "not just X", "more than X", and "that's not X, it's Y".
- Convert aggressive job-ad language into recruiter-friendly wording.
- Prefer "help clients stay on track", "guide next steps", "maintain client momentum", "keep implementation moving", and "support follow-through" over phrases like "holding clients accountable", "pressure", "hustle", "grind", or "relentless".
- If no metric is provided, use credible qualitative impact without inventing numbers.`;
