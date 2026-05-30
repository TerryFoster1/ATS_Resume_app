import { inspectResumeStructure, type StructuredResume } from "@/lib/resumeStructure";
import {
  extractTransferableSkillProfile,
  transferableExtractionToProfileNotes,
  transferableExtractionToProfileSkills
} from "@/lib/transferableSkillExtraction";

export type CareerProfileSource = "resume_import" | "manual" | "first_resume" | "career_discovery";

export type CareerProfileExperience = {
  id: string;
  title?: string;
  organization?: string;
  location?: string;
  dateRange?: string;
  bullets: string[];
  source: CareerProfileSource;
  sourceLabel?: string;
  createdAt: string;
  updatedAt: string;
};

export type CareerProfileNote = {
  id: string;
  label: string;
  detail: string;
  source: CareerProfileSource;
  createdAt: string;
};

export type ResumeImportRecord = {
  id: string;
  fileName?: string;
  importedAt: string;
  textPreview: string;
  roleCount: number;
  skillCount: number;
};

export type MasterCareerProfile = {
  workExperience: CareerProfileExperience[];
  volunteerExperience: CareerProfileExperience[];
  education: CareerProfileNote[];
  certifications: CareerProfileNote[];
  awards: CareerProfileNote[];
  projects: CareerProfileExperience[];
  extracurriculars: CareerProfileExperience[];
  skills: string[];
  achievements: CareerProfileNote[];
  interests: string[];
  careerGoals: string[];
  resumeImports: ResumeImportRecord[];
  discoveryNotes: CareerProfileNote[];
  updatedAt?: string;
};

export type ProfileMemoryRow = {
  work_history?: unknown;
  volunteer_experience?: unknown;
  education?: unknown;
  certifications?: unknown;
  awards?: unknown;
  projects?: unknown;
  extracurriculars?: unknown;
  skills?: unknown;
  achievements?: unknown;
  interests?: unknown;
  career_goals?: unknown;
  resume_imports?: unknown;
  discovery_notes?: unknown;
  updated_at?: string | null;
};

export type ResumeProfileImport = {
  fileName?: string;
  resumeText: string;
  structured?: StructuredResume;
};

export const EMPTY_MASTER_CAREER_PROFILE: MasterCareerProfile = {
  workExperience: [],
  volunteerExperience: [],
  education: [],
  certifications: [],
  awards: [],
  projects: [],
  extracurriculars: [],
  skills: [],
  achievements: [],
  interests: [],
  careerGoals: [],
  resumeImports: [],
  discoveryNotes: []
};

export function readMasterCareerProfile(row?: ProfileMemoryRow | null): MasterCareerProfile {
  if (!row) return { ...EMPTY_MASTER_CAREER_PROFILE };
  return {
    workExperience: readExperienceArray(row.work_history),
    volunteerExperience: readExperienceArray(row.volunteer_experience),
    education: readNoteArray(row.education),
    certifications: readNoteArray(row.certifications),
    awards: readNoteArray(row.awards),
    projects: readExperienceArray(row.projects),
    extracurriculars: readExperienceArray(row.extracurriculars),
    skills: readStringArray(row.skills),
    achievements: readNoteArray(row.achievements),
    interests: readStringArray(row.interests),
    careerGoals: readStringArray(row.career_goals),
    resumeImports: readResumeImports(row.resume_imports),
    discoveryNotes: readNoteArray(row.discovery_notes),
    updatedAt: row.updated_at ?? undefined
  };
}

export function profileToMemoryPatch(profile: MasterCareerProfile) {
  return {
    work_history: profile.workExperience,
    volunteer_experience: profile.volunteerExperience,
    education: profile.education,
    certifications: profile.certifications,
    awards: profile.awards,
    projects: profile.projects,
    extracurriculars: profile.extracurriculars,
    skills: profile.skills,
    achievements: profile.achievements,
    interests: profile.interests,
    career_goals: profile.careerGoals,
    resume_imports: profile.resumeImports,
    discovery_notes: profile.discoveryNotes,
    updated_at: new Date().toISOString()
  };
}

export function extractProfileFromResumeImport(input: ResumeProfileImport): MasterCareerProfile {
  const structured = input.structured ?? inspectResumeStructure(input.resumeText).structured;
  const now = new Date().toISOString();
  const importId = stableId(`resume:${input.fileName ?? "upload"}:${input.resumeText.slice(0, 400)}`);
  const extraction = extractTransferableSkillProfile(input.resumeText);
  const workExperience = structured.roles.map((role, index) => ({
    id: stableId(`${importId}:role:${role.header}:${index}`),
    title: role.title,
    organization: role.company,
    location: role.location,
    dateRange: role.dateRange,
    bullets: role.bullets,
    source: "resume_import" as const,
    sourceLabel: input.fileName,
    createdAt: now,
    updatedAt: now
  }));

  return {
    ...EMPTY_MASTER_CAREER_PROFILE,
    workExperience,
    education: structured.education.map((entry, index) => noteFromText(entry, "Education", "resume_import", now, `${importId}:edu:${index}`)),
    skills: dedupeStrings([
      ...structured.skills,
      ...transferableExtractionToProfileSkills(extraction)
    ]),
    resumeImports: [
      {
        id: importId,
        fileName: input.fileName,
        importedAt: now,
        textPreview: input.resumeText.replace(/\s+/g, " ").trim().slice(0, 360),
        roleCount: structured.roles.length,
        skillCount: structured.skills.length
      }
    ],
    discoveryNotes: transferableExtractionToProfileNotes(extraction).map((note, index) =>
      noteFromText(note, "Transferable skill inference", "resume_import", now, `${importId}:transferable:${index}`)
    ),
    updatedAt: now
  };
}

export function mergeMasterCareerProfiles(
  current: MasterCareerProfile,
  incoming: MasterCareerProfile
): MasterCareerProfile {
  return {
    workExperience: mergeExperience(current.workExperience, incoming.workExperience),
    volunteerExperience: mergeExperience(current.volunteerExperience, incoming.volunteerExperience),
    education: mergeNotes(current.education, incoming.education),
    certifications: mergeNotes(current.certifications, incoming.certifications),
    awards: mergeNotes(current.awards, incoming.awards),
    projects: mergeExperience(current.projects, incoming.projects),
    extracurriculars: mergeExperience(current.extracurriculars, incoming.extracurriculars),
    skills: dedupeStrings([...current.skills, ...incoming.skills]),
    achievements: mergeNotes(current.achievements, incoming.achievements),
    interests: dedupeStrings([...current.interests, ...incoming.interests]),
    careerGoals: dedupeStrings([...current.careerGoals, ...incoming.careerGoals]),
    resumeImports: mergeResumeImports(current.resumeImports, incoming.resumeImports),
    discoveryNotes: mergeNotes(current.discoveryNotes, incoming.discoveryNotes),
    updatedAt: new Date().toISOString()
  };
}

export function createManualProfilePatch(args: {
  kind: "work" | "volunteer" | "project" | "education" | "certification" | "award" | "achievement" | "interest" | "careerGoal" | "discoveryNote";
  title?: string;
  organization?: string;
  dateRange?: string;
  detail: string;
}): MasterCareerProfile {
  const now = new Date().toISOString();
  const title = cleanText(args.title) || labelForKind(args.kind);
  const detail = cleanText(args.detail);
  const profile = { ...EMPTY_MASTER_CAREER_PROFILE };
  const extraction = extractTransferableSkillProfile(`${title}\n${detail}`);
  profile.skills = transferableExtractionToProfileSkills(extraction);
  profile.discoveryNotes = transferableExtractionToProfileNotes(extraction).map((note, index) =>
    noteFromText(note, "Transferable skill inference", "manual", now, `manual:${args.kind}:${title}:transferable:${index}:${note}`)
  );

  if (args.kind === "work" || args.kind === "volunteer" || args.kind === "project") {
    const experience: CareerProfileExperience = {
      id: stableId(`${args.kind}:${title}:${args.organization ?? ""}:${detail}`),
      title,
      organization: cleanText(args.organization),
      dateRange: cleanText(args.dateRange),
      bullets: detail ? [detail] : [],
      source: "manual",
      createdAt: now,
      updatedAt: now
    };
    if (args.kind === "work") profile.workExperience = [experience];
    if (args.kind === "volunteer") profile.volunteerExperience = [experience];
    if (args.kind === "project") profile.projects = [experience];
    return profile;
  }

  if (args.kind === "interest") profile.interests = detail ? [detail] : [];
  else if (args.kind === "careerGoal") profile.careerGoals = detail ? [detail] : [];
  else {
    const note = noteFromText(detail, title, "manual", now, `${args.kind}:${title}:${detail}`);
    if (args.kind === "education") profile.education = [note];
    if (args.kind === "certification") profile.certifications = [note];
    if (args.kind === "award") profile.awards = [note];
    if (args.kind === "achievement") profile.achievements = [note];
    if (args.kind === "discoveryNote") profile.discoveryNotes = [note];
  }
  return profile;
}

export function buildFirstResumeProfile(args: {
  responsibilities?: string;
  helpingExperience?: string;
  recognition?: string;
  schoolCommunity?: string;
  goals?: string;
}): { profile: MasterCareerProfile; resumeText: string } {
  const now = new Date().toISOString();
  const sourceText = Object.values(args).filter(Boolean).join("\n");
  const extraction = extractTransferableSkillProfile(sourceText);
  const notes = [
    args.responsibilities && noteFromText(args.responsibilities, "Responsibility and leadership", "first_resume", now, "first-resume:responsibility"),
    args.helpingExperience && noteFromText(args.helpingExperience, "People, service, and teamwork", "first_resume", now, "first-resume:helping"),
    args.recognition && noteFromText(args.recognition, "Recognition and achievements", "first_resume", now, "first-resume:recognition"),
    args.schoolCommunity && noteFromText(args.schoolCommunity, "School, clubs, community, and activities", "first_resume", now, "first-resume:community")
  ].filter(Boolean) as CareerProfileNote[];
  const skills = dedupeStrings([
    ...inferDiscoverySkills(sourceText),
    ...transferableExtractionToProfileSkills(extraction)
  ]);
  const profile: MasterCareerProfile = {
    ...EMPTY_MASTER_CAREER_PROFILE,
    achievements: notes.filter((note) => /recognition|achievement/i.test(note.label)),
    extracurriculars: args.schoolCommunity
      ? [{
          id: stableId(`first-resume:activity:${args.schoolCommunity}`),
          title: "School, community, or extracurricular experience",
          bullets: [args.schoolCommunity],
          source: "first_resume",
          createdAt: now,
          updatedAt: now
        }]
      : [],
    skills,
    careerGoals: args.goals ? [args.goals] : [],
    discoveryNotes: [
      ...notes,
      ...transferableExtractionToProfileNotes(extraction).map((note, index) =>
        noteFromText(note, "Transferable skill inference", "first_resume", now, `first-resume:transferable:${index}:${note}`)
      )
    ],
    updatedAt: now
  };
  const resumeText = [
    "Candidate",
    "",
    "PROFESSIONAL SUMMARY",
    "Emerging professional with experience that can be framed through responsibility, service, teamwork, learning agility, and follow-through.",
    "",
    "KEY SKILLS",
    skills.length ? skills.join(", ") : "Communication, Reliability, Teamwork, Organization, Problem Solving",
    "",
    "EXPERIENCE AND ACTIVITIES",
    ...notes.map((note) => `- ${note.detail}`),
    "",
    args.goals ? "CAREER GOALS" : "",
    args.goals ? `- ${args.goals}` : ""
  ].filter((line) => line !== "").join("\n");
  return { profile, resumeText };
}

export function buildCareerDiscoveryProfile(args: {
  interests?: string;
  strengths?: string;
  workPreferences?: string;
  energyPatterns?: string;
  goals?: string;
}): MasterCareerProfile {
  const now = new Date().toISOString();
  const profile = { ...EMPTY_MASTER_CAREER_PROFILE };
  const sourceText = Object.values(args).filter(Boolean).join("\n");
  const extraction = extractTransferableSkillProfile(sourceText);
  profile.interests = splitList(args.interests);
  profile.careerGoals = splitList(args.goals);
  profile.skills = dedupeStrings([
    ...inferDiscoverySkills(`${args.strengths ?? ""} ${args.workPreferences ?? ""}`),
    ...transferableExtractionToProfileSkills(extraction)
  ]);
  profile.discoveryNotes = [
    args.strengths && noteFromText(args.strengths, "Strengths to explore", "career_discovery", now, "discovery:strengths"),
    args.workPreferences && noteFromText(args.workPreferences, "Work preferences", "career_discovery", now, "discovery:preferences"),
    args.energyPatterns && noteFromText(args.energyPatterns, "Energy and environment", "career_discovery", now, "discovery:energy"),
    ...transferableExtractionToProfileNotes(extraction).map((note, index) =>
      noteFromText(note, "Transferable skill inference", "career_discovery", now, `discovery:transferable:${index}:${note}`)
    )
  ].filter(Boolean) as CareerProfileNote[];
  profile.updatedAt = now;
  return profile;
}

export function composeProfileResumeSource(args: {
  profile: MasterCareerProfile | null;
  uploadedResumeText: string;
}): string {
  if (!args.profile || !hasMeaningfulProfile(args.profile)) return args.uploadedResumeText;
  const profileText = [
    "MASTER CAREER PROFILE",
    "",
    section("Work experience", args.profile.workExperience.flatMap(formatExperience)),
    section("Volunteer and extracurricular experience", [
      ...args.profile.volunteerExperience.flatMap(formatExperience),
      ...args.profile.extracurriculars.flatMap(formatExperience)
    ]),
    section("Projects", args.profile.projects.flatMap(formatExperience)),
    section("Education", args.profile.education.map((item) => item.detail)),
    section("Certifications", args.profile.certifications.map((item) => item.detail)),
    section("Awards and achievements", [
      ...args.profile.awards.map((item) => item.detail),
      ...args.profile.achievements.map((item) => item.detail)
    ]),
    section("Skills", args.profile.skills),
    section("Career goals", args.profile.careerGoals),
    section("Career intelligence notes", args.profile.discoveryNotes.map((item) => `${item.label}: ${item.detail}`)),
    "",
    args.uploadedResumeText.trim() ? "LATEST UPLOADED RESUME OR SESSION RESUME" : "",
    args.uploadedResumeText.trim()
  ].filter(Boolean).join("\n");
  return profileText.slice(0, 50000);
}

export function hasMeaningfulProfile(profile: MasterCareerProfile | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.workExperience.length ||
    profile.volunteerExperience.length ||
    profile.education.length ||
    profile.certifications.length ||
    profile.projects.length ||
    profile.extracurriculars.length ||
    profile.skills.length ||
    profile.achievements.length ||
    profile.careerGoals.length ||
    profile.discoveryNotes.length
  );
}

function formatExperience(item: CareerProfileExperience): string[] {
  const heading = [item.title, item.organization, item.dateRange].filter(Boolean).join(" | ");
  return [heading || "Experience", ...item.bullets.map((bullet) => `- ${bullet}`)];
}

function section(title: string, lines: string[]): string {
  const clean = lines.map(cleanText).filter(Boolean);
  if (!clean.length) return "";
  return `${title.toUpperCase()}\n${clean.join("\n")}`;
}

function noteFromText(
  detail: string,
  label: string,
  source: CareerProfileSource,
  now: string,
  seed: string
): CareerProfileNote {
  return {
    id: stableId(seed),
    label,
    detail: cleanText(detail),
    source,
    createdAt: now
  };
}

function mergeExperience(current: CareerProfileExperience[], incoming: CareerProfileExperience[]) {
  const map = new Map<string, CareerProfileExperience>();
  for (const item of [...current, ...incoming]) {
    if (!item || !item.id) continue;
    const key = experienceKey(item);
    const existing = map.get(key);
    map.set(key, existing ? { ...existing, bullets: dedupeStrings([...existing.bullets, ...item.bullets]), updatedAt: item.updatedAt } : item);
  }
  return [...map.values()];
}

function mergeNotes(current: CareerProfileNote[], incoming: CareerProfileNote[]) {
  const map = new Map<string, CareerProfileNote>();
  for (const item of [...current, ...incoming]) {
    if (!item || !item.detail) continue;
    map.set(`${item.label}:${item.detail}`.toLowerCase(), item);
  }
  return [...map.values()];
}

function mergeResumeImports(current: ResumeImportRecord[], incoming: ResumeImportRecord[]) {
  const map = new Map<string, ResumeImportRecord>();
  for (const item of [...current, ...incoming]) {
    if (item?.id) map.set(item.id, item);
  }
  return [...map.values()].slice(-20);
}

function readExperienceArray(value: unknown): CareerProfileExperience[] {
  return Array.isArray(value)
    ? value.filter(isRecord).map((item) => ({
        id: typeof item.id === "string" ? item.id : stableId(JSON.stringify(item)),
        title: stringOrUndefined(item.title),
        organization: stringOrUndefined(item.organization),
        location: stringOrUndefined(item.location),
        dateRange: stringOrUndefined(item.dateRange),
        bullets: readStringArray(item.bullets),
        source: readSource(item.source),
        sourceLabel: stringOrUndefined(item.sourceLabel),
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
        updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString()
      }))
    : [];
}

function readNoteArray(value: unknown): CareerProfileNote[] {
  return Array.isArray(value)
    ? value.filter(isRecord).map((item) => ({
        id: typeof item.id === "string" ? item.id : stableId(JSON.stringify(item)),
        label: typeof item.label === "string" ? item.label : "Career note",
        detail: typeof item.detail === "string" ? item.detail : "",
        source: readSource(item.source),
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
      })).filter((item) => item.detail)
    : [];
}

function readResumeImports(value: unknown): ResumeImportRecord[] {
  return Array.isArray(value)
    ? value.filter(isRecord).map((item) => ({
        id: typeof item.id === "string" ? item.id : stableId(JSON.stringify(item)),
        fileName: stringOrUndefined(item.fileName),
        importedAt: typeof item.importedAt === "string" ? item.importedAt : new Date().toISOString(),
        textPreview: typeof item.textPreview === "string" ? item.textPreview : "",
        roleCount: typeof item.roleCount === "number" ? item.roleCount : 0,
        skillCount: typeof item.skillCount === "number" ? item.skillCount : 0
      }))
    : [];
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return dedupeStrings(value.filter((item): item is string => typeof item === "string"));
}

function splitList(value?: string): string[] {
  return dedupeStrings((value ?? "").split(/[,;\n]+/).map(cleanText).filter(Boolean));
}

function inferDiscoverySkills(text: string): string[] {
  const lower = text.toLowerCase();
  const skills = new Set<string>();
  if (/customer|client|people|help|service|classmate|community/.test(lower)) skills.add("Customer and stakeholder communication");
  if (/lead|captain|organize|trusted|responsib|supervis/.test(lower)) skills.add("Leadership and responsibility");
  if (/schedule|coordinate|event|team|project/.test(lower)) skills.add("Coordination and follow-through");
  if (/write|research|content|present|explain/.test(lower)) skills.add("Communication and documentation");
  if (/numbers|data|report|budget|inventory|cash/.test(lower)) skills.add("Reporting and detail management");
  if (/solve|fix|pressure|busy|conflict/.test(lower)) skills.add("Problem solving under pressure");
  return [...skills].slice(0, 10);
}

function labelForKind(kind: Parameters<typeof createManualProfilePatch>[0]["kind"]) {
  return kind.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function experienceKey(item: CareerProfileExperience): string {
  return [item.title, item.organization, item.dateRange, item.bullets.join(" ")].join("|").toLowerCase();
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  return values.map(cleanText).filter((value) => {
    if (!value) return false;
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanText(value?: string | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readSource(value: unknown): CareerProfileSource {
  return value === "manual" || value === "first_resume" || value === "career_discovery" ? value : "resume_import";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stableId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return `profile_${Math.abs(hash).toString(36)}`;
}
