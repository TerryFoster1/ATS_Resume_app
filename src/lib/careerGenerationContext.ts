import type { MasterCareerProfile, CareerProfileExperience, CareerProfileNote } from "@/lib/masterCareerProfile";
import { hasMeaningfulProfile } from "@/lib/masterCareerProfile";
import {
  extractTransferableSkillProfile,
  formatTransferableExtractionForPrompt,
  type TransferableSkillExtraction
} from "@/lib/transferableSkillExtraction";

export type CareerGenerationWorkflow =
  | "careerCoach"
  | "careerPathway"
  | "resume"
  | "coverLetter"
  | "interviewPrep"
  | "mockInterview";

export type CareerGenerationJobTarget = {
  title?: string | null;
  companyName?: string | null;
};

export type SavedOpportunityContext = {
  outputId?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
  sourceJobDescription?: string | null;
  generatedResumeText?: string | null;
  generatedCoverLetterText?: string | null;
  analysisSnapshot?: unknown;
};

export type CareerGenerationContext = {
  workflowType: CareerGenerationWorkflow;
  masterProfileMarkdown: string;
  structuredProfile: MasterCareerProfile | null;
  uploadedResumeFallback: string;
  candidateContextText: string;
  jobTarget: CareerGenerationJobTarget;
  jobDescription: string;
  transferableSkills: string[];
  professionalFunctions: string[];
  careerGoals: string[];
  savedOpportunityContext?: SavedOpportunityContext;
  generationRules: string[];
  userFacts: string[];
  inferredSkills: string[];
  profileWarnings: string[];
  usedMasterProfile: boolean;
  transferableExtraction: TransferableSkillExtraction;
};

export function buildCareerGenerationContextFromProfile(args: {
  workflowType: CareerGenerationWorkflow;
  profile: MasterCareerProfile | null;
  uploadedResumeFallback?: string | null;
  jobTarget?: CareerGenerationJobTarget;
  jobDescription?: string | null;
  careerGoal?: string | null;
  savedOpportunityContext?: SavedOpportunityContext;
}): CareerGenerationContext {
  const uploadedResumeFallback = clean(args.uploadedResumeFallback);
  const jobDescription = clean(args.jobDescription);
  const jobTarget = {
    title: clean(args.jobTarget?.title),
    companyName: clean(args.jobTarget?.companyName)
  };
  const usedMasterProfile = hasMeaningfulProfile(args.profile);
  const relevanceText = [
    jobTarget.title,
    jobTarget.companyName,
    jobDescription,
    args.careerGoal,
    args.savedOpportunityContext?.jobTitle,
    args.savedOpportunityContext?.companyName,
    args.savedOpportunityContext?.sourceJobDescription
  ].filter(Boolean).join("\n");
  const masterProfileMarkdown = usedMasterProfile
    ? formatMasterProfileMarkdown(args.profile, { relevanceText, workflowType: args.workflowType })
    : "";
  const profileEvidenceText = [
    masterProfileMarkdown,
    args.savedOpportunityContext ? formatSavedOpportunityContext(args.savedOpportunityContext) : "",
    uploadedResumeFallback ? `# Uploaded Resume Fallback\n${uploadedResumeFallback}` : ""
  ].filter(Boolean).join("\n\n");
  const extraction = extractTransferableSkillProfile(
    [profileEvidenceText, jobDescription, jobTarget.title].filter(Boolean).join("\n"),
    jobTarget.title || null
  );
  const profileWarnings = buildProfileWarnings({
    profile: args.profile,
    usedMasterProfile,
    uploadedResumeFallback,
    savedOpportunityContext: args.savedOpportunityContext
  });
  const generationRules = buildGenerationRules(args.workflowType);

  return {
    workflowType: args.workflowType,
    masterProfileMarkdown,
    structuredProfile: args.profile,
    uploadedResumeFallback,
    candidateContextText: profileEvidenceText || uploadedResumeFallback,
    jobTarget,
    jobDescription,
    transferableSkills: extraction.transferableSkills,
    professionalFunctions: extraction.professionalFunctions.map((item) => item.functionName),
    careerGoals: dedupeStrings([
      ...(args.profile?.careerGoals ?? []),
      clean(args.careerGoal)
    ]),
    savedOpportunityContext: args.savedOpportunityContext,
    generationRules,
    userFacts: extractUserFacts(args.profile),
    inferredSkills: extraction.implicitSkills.map((item) => `${item.skill}: ${item.whyRecruitersCare}`),
    profileWarnings,
    usedMasterProfile,
    transferableExtraction: extraction
  };
}

export function formatCareerGenerationContextForPrompt(context: CareerGenerationContext): string {
  return [
    "CAREER GENERATION CONTEXT",
    `Workflow: ${context.workflowType}`,
    context.jobTarget.title ? `Target role: ${context.jobTarget.title}` : "Target role: not specified",
    context.jobTarget.companyName ? `Company: ${context.jobTarget.companyName}` : "",
    context.usedMasterProfile
      ? "Source-of-truth rule: Prefer the latest Master Career Profile. Use uploaded resume content only as enrichment or fallback evidence."
      : "Source-of-truth rule: No meaningful Master Career Profile is available, so use uploaded/session evidence cautiously.",
    context.profileWarnings.length ? section("Profile warnings", context.profileWarnings) : "",
    section("Generation rules", context.generationRules),
    context.masterProfileMarkdown,
    context.uploadedResumeFallback && !context.usedMasterProfile
      ? section("Uploaded resume/session evidence", [clip(context.uploadedResumeFallback, 8000)])
      : "",
    context.uploadedResumeFallback && context.usedMasterProfile
      ? section("Uploaded resume fallback/enrichment", [clip(context.uploadedResumeFallback, 5000)])
      : "",
    context.savedOpportunityContext ? formatSavedOpportunityContext(context.savedOpportunityContext) : "",
    context.transferableSkills.length ? section("Transferable skills", context.transferableSkills) : "",
    context.professionalFunctions.length ? section("Professional functions", context.professionalFunctions) : "",
    context.inferredSkills.length ? section("Inferred skills with caution", context.inferredSkills) : "",
    `TRANSFERABLE SKILL EXTRACTION\n${formatTransferableExtractionForPrompt(context.transferableExtraction)}`
  ].filter(Boolean).join("\n\n").slice(0, 60000);
}

export function formatMasterProfileMarkdown(
  rawProfile: MasterCareerProfile | null,
  options?: { relevanceText?: string; workflowType?: CareerGenerationWorkflow }
): string {
  if (!hasMeaningfulProfile(rawProfile)) return "";
  const profile = rawProfile as MasterCareerProfile;
  const relevanceText = clean(options?.relevanceText).toLowerCase();
  const relevantWork = filterExperiences(profile.workExperience, relevanceText, 8);
  const relevantVolunteer = filterExperiences(profile.volunteerExperience, relevanceText, 5);
  const relevantProjects = filterExperiences(profile.projects, relevanceText, 6);
  const relevantExtracurriculars = filterExperiences(profile.extracurriculars, relevanceText, 5);
  const relevantNotes = filterNotes(profile.discoveryNotes, relevanceText, 10);
  const extraction = extractTransferableSkillProfile(profileToPlainText(profile), relevanceText || null);

  return [
    "# Master Career Profile",
    profile.updatedAt ? `Last updated: ${profile.updatedAt}` : "",
    markdownSection("Personal Information", []),
    markdownSection("Career Goals", profile.careerGoals),
    markdownSection("Core Identity", buildCoreIdentity(profile, extraction)),
    markdownSection("Work Experience", relevantWork.flatMap(formatExperienceMarkdown)),
    markdownSection("Education", profile.education.map(formatNoteMarkdown)),
    markdownSection("Certifications", profile.certifications.map(formatNoteMarkdown)),
    markdownSection("Skills", profile.skills),
    markdownSection("Tools & Software", filterByKeywords(profile.skills, /tool|software|crm|salesforce|hubspot|excel|sheet|platform|system|analytics|meta|google/i)),
    markdownSection("Equipment / Physical Tools", filterByKeywords(profile.skills, /equipment|machin|tool|vehicle|forklift|kitchen|safety|materials/i)),
    markdownSection("Projects", relevantProjects.flatMap(formatExperienceMarkdown)),
    markdownSection("Volunteer Experience", [
      ...relevantVolunteer.flatMap(formatExperienceMarkdown),
      ...relevantExtracurriculars.flatMap(formatExperienceMarkdown)
    ]),
    markdownSection("Awards", [...profile.awards, ...profile.achievements].map(formatNoteMarkdown)),
    markdownSection("Languages", filterByKeywords(profile.skills, /language|bilingual|french|spanish|english|arabic|hindi|mandarin|cantonese/i)),
    markdownSection("Interests", profile.interests),
    markdownSection("Transferable Skills", extraction.transferableSkills),
    markdownSection("Professional Functions", extraction.professionalFunctions.map((item) => `${item.functionName}: ${item.recruiterLanguage}`)),
    markdownSection("Recruiter Positioning Notes", [
      ...relevantNotes.map(formatNoteMarkdown),
      ...extraction.evidenceNotes,
      ...extraction.recruiterConcerns.map((item) => `Recruiter concern to prepare for: ${item}`)
    ])
  ].filter(Boolean).join("\n\n").slice(0, 45000);
}

function buildGenerationRules(workflowType: CareerGenerationWorkflow): string[] {
  const shared = [
    "Never fabricate experience, employers, credentials, tools, dates, metrics, or outcomes.",
    "Treat inferred skills as hypotheses grounded in evidence, not as confirmed credentials.",
    "Use cautious language for inferences: your profile suggests, this may support, or if accurate this can be positioned as.",
    "Prefer current Master Career Profile evidence over older uploaded resume wording when they conflict.",
    "Use uploaded resume content as enrichment or fallback, not as the permanent source of truth for signed-in users."
  ];
  if (workflowType === "resume" || workflowType === "coverLetter") {
    return [
      ...shared,
      "Select only role-relevant evidence and preserve high-value signals.",
      "Avoid under-leveling the candidate when profile evidence supports stronger recruiter-readable positioning.",
      "Do not include irrelevant profile content just because it exists."
    ];
  }
  if (workflowType === "interviewPrep" || workflowType === "mockInterview") {
    return [
      ...shared,
      "Ask questions based on the role, the user's actual profile evidence, likely recruiter concerns, and missing proof.",
      "Only reference named profile evidence when it is relevant to the target role."
    ];
  }
  return [
    ...shared,
    "Identify transferable skills before recommending upskilling.",
    "Explain why recommendations are grounded in user evidence."
  ];
}

function buildProfileWarnings(args: {
  profile: MasterCareerProfile | null;
  usedMasterProfile: boolean;
  uploadedResumeFallback: string;
  savedOpportunityContext?: SavedOpportunityContext;
}): string[] {
  const warnings: string[] = [];
  if (!args.usedMasterProfile) {
    warnings.push("No meaningful Master Career Profile is available yet; output should rely on uploaded/session evidence and avoid overconfident personalization.");
  }
  if (args.profile?.updatedAt) {
    const ageMs = Date.now() - new Date(args.profile.updatedAt).getTime();
    if (Number.isFinite(ageMs) && ageMs > 1000 * 60 * 60 * 24 * 120) {
      warnings.push("The Master Career Profile has not been updated recently; ask the user to refresh profile evidence if output quality seems thin.");
    }
  }
  if (args.usedMasterProfile && args.uploadedResumeFallback) {
    warnings.push("Uploaded resume content is available as enrichment; resolve conflicts in favor of the Master Career Profile unless the upload provides newer specific evidence.");
  }
  if (args.savedOpportunityContext?.outputId) {
    warnings.push("This workflow may be attached to a saved output. Preserve the original saved result and do not silently regenerate paid content.");
  }
  if (args.profile && !args.profile.workExperience.length && !args.profile.projects.length && !args.profile.volunteerExperience.length) {
    warnings.push("Profile has limited experience entries; emphasize clarification, transferable evidence, and cautious positioning.");
  }
  return warnings;
}

function formatSavedOpportunityContext(value: SavedOpportunityContext): string {
  return [
    "# Saved Opportunity Context",
    value.outputId ? `Output ID: ${value.outputId}` : "",
    value.jobTitle ? `Saved role: ${value.jobTitle}` : "",
    value.companyName ? `Saved company: ${value.companyName}` : "",
    value.sourceJobDescription ? `Saved job description:\n${clip(value.sourceJobDescription, 5000)}` : "",
    value.generatedResumeText ? `Original saved resume output:\n${clip(value.generatedResumeText, 4000)}` : "",
    value.generatedCoverLetterText ? `Original saved cover letter output:\n${clip(value.generatedCoverLetterText, 2500)}` : ""
  ].filter(Boolean).join("\n");
}

function extractUserFacts(profile: MasterCareerProfile | null): string[] {
  if (!profile) return [];
  return dedupeStrings([
    ...profile.workExperience.flatMap((item) => [item.title, item.organization, ...item.bullets]),
    ...profile.volunteerExperience.flatMap((item) => [item.title, item.organization, ...item.bullets]),
    ...profile.projects.flatMap((item) => [item.title, item.organization, ...item.bullets]),
    ...profile.education.map((item) => item.detail),
    ...profile.certifications.map((item) => item.detail),
    ...profile.awards.map((item) => item.detail),
    ...profile.achievements.map((item) => item.detail),
    ...profile.skills,
    ...profile.careerGoals
  ]).slice(0, 80);
}

function profileToPlainText(profile: MasterCareerProfile): string {
  return [
    ...profile.workExperience.flatMap(formatExperienceMarkdown),
    ...profile.volunteerExperience.flatMap(formatExperienceMarkdown),
    ...profile.projects.flatMap(formatExperienceMarkdown),
    ...profile.extracurriculars.flatMap(formatExperienceMarkdown),
    ...profile.skills,
    ...profile.careerGoals,
    ...profile.discoveryNotes.map(formatNoteMarkdown)
  ].join("\n");
}

function buildCoreIdentity(profile: MasterCareerProfile, extraction: TransferableSkillExtraction): string[] {
  return dedupeStrings([
    ...profile.careerGoals.slice(0, 3),
    ...extraction.professionalFunctions.slice(0, 5).map((item) => item.recruiterLanguage),
    ...extraction.evidenceNotes.slice(0, 4)
  ]);
}

function filterExperiences(items: CareerProfileExperience[], relevanceText: string, max: number): CareerProfileExperience[] {
  if (!items.length) return [];
  const scored = items.map((item, index) => ({ item, index, score: scoreText(formatExperienceMarkdown(item).join(" "), relevanceText) }));
  const relevant = scored.filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || a.index - b.index);
  return (relevant.length ? relevant : scored).slice(0, max).map((entry) => entry.item);
}

function filterNotes(items: CareerProfileNote[], relevanceText: string, max: number): CareerProfileNote[] {
  if (!items.length) return [];
  const scored = items.map((item, index) => ({ item, index, score: scoreText(`${item.label} ${item.detail}`, relevanceText) }));
  const relevant = scored.filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || a.index - b.index);
  return (relevant.length ? relevant : scored).slice(0, max).map((entry) => entry.item);
}

function scoreText(text: string, relevanceText: string): number {
  if (!relevanceText) return 1;
  const textLower = text.toLowerCase();
  return keywordSet(relevanceText).reduce((score, word) => score + (textLower.includes(word) ? 1 : 0), 0);
}

function keywordSet(value: string): string[] {
  return [...new Set(value.toLowerCase().match(/[a-z0-9+#.]{4,}/g) ?? [])].slice(0, 80);
}

function formatExperienceMarkdown(item: CareerProfileExperience): string[] {
  const title = [item.title, item.organization, item.dateRange].filter(Boolean).join(" | ") || "Experience";
  return [`## ${title}`, ...item.bullets.map((bullet) => `- ${bullet}`)];
}

function formatNoteMarkdown(item: CareerProfileNote): string {
  return item.label ? `${item.label}: ${item.detail}` : item.detail;
}

function markdownSection(title: string, items: string[]): string {
  const cleanItems = dedupeStrings(items).filter(Boolean);
  if (!cleanItems.length) return "";
  return [`# ${title}`, ...cleanItems.map((item) => item.startsWith("#") || item.startsWith("-") ? item : `- ${item}`)].join("\n");
}

function section(title: string, items: string[]): string {
  const cleanItems = dedupeStrings(items).filter(Boolean);
  if (!cleanItems.length) return "";
  return `${title}:\n${cleanItems.map((item) => `- ${item}`).join("\n")}`;
}

function filterByKeywords(values: string[], pattern: RegExp): string[] {
  return values.filter((value) => pattern.test(value));
}

function dedupeStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = clean(raw);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function clean(value?: string | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function clip(text: string, max: number): string {
  const cleanText = text.trim();
  if (cleanText.length <= max) return cleanText;
  return `${cleanText.slice(0, max)}\n[Truncated for CareerGenerationContext]`;
}

