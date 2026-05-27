import {
  composeProfileResumeSource,
  createManualProfilePatch,
  extractProfileFromResumeImport,
  hasMeaningfulProfile,
  mergeMasterCareerProfiles,
  profileToMemoryPatch,
  readMasterCareerProfile,
  type MasterCareerProfile,
  type ResumeProfileImport
} from "@/lib/masterCareerProfile";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const PROFILE_COLUMNS = [
  "work_history",
  "volunteer_experience",
  "education",
  "certifications",
  "awards",
  "projects",
  "extracurriculars",
  "skills",
  "achievements",
  "interests",
  "career_goals",
  "resume_imports",
  "discovery_notes",
  "updated_at"
].join(", ");

export async function getMasterCareerProfile(userId: string): Promise<MasterCareerProfile | null> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profile_memory")
    .select(PROFILE_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.warn("[career-profile] Could not read profile memory", {
      userId,
      code: error.code,
      message: error.message
    });
    return null;
  }
  return readMasterCareerProfile(data as Parameters<typeof readMasterCareerProfile>[0]);
}

export async function mergeIntoMasterCareerProfile(
  userId: string,
  incoming: MasterCareerProfile
): Promise<MasterCareerProfile | null> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) return null;
  const current = (await getMasterCareerProfile(userId)) ?? readMasterCareerProfile(null);
  const merged = mergeMasterCareerProfiles(current, incoming);
  const patch = profileToMemoryPatch(merged);
  const { error } = await supabase.from("profile_memory").upsert(
    {
      user_id: userId,
      ...patch
    },
    { onConflict: "user_id" }
  );
  if (error) {
    console.warn("[career-profile] Could not update profile memory", {
      userId,
      code: error.code,
      message: error.message
    });
    return null;
  }
  return merged;
}

export async function saveMasterCareerProfile(
  userId: string,
  profile: MasterCareerProfile
): Promise<MasterCareerProfile | null> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) return null;
  const patch = profileToMemoryPatch(profile);
  const { error } = await supabase.from("profile_memory").upsert(
    {
      user_id: userId,
      ...patch
    },
    { onConflict: "user_id" }
  );
  if (error) {
    console.warn("[career-profile] Could not save profile memory", {
      userId,
      code: error.code,
      message: error.message
    });
    return null;
  }
  return { ...profile, updatedAt: patch.updated_at };
}

export async function importResumeIntoMasterProfile(
  userId: string,
  input: ResumeProfileImport
): Promise<MasterCareerProfile | null> {
  return mergeIntoMasterCareerProfile(userId, extractProfileFromResumeImport(input));
}

export async function addManualProfileEntry(
  userId: string,
  input: Parameters<typeof createManualProfilePatch>[0]
): Promise<MasterCareerProfile | null> {
  return mergeIntoMasterCareerProfile(userId, createManualProfilePatch(input));
}

export async function updateManualProfileEntry(
  userId: string,
  input: Parameters<typeof createManualProfilePatch>[0] & { entryId: string }
): Promise<MasterCareerProfile | null> {
  const current = await getMasterCareerProfile(userId);
  if (!current) return null;
  const patch = createManualProfilePatch(input);
  const replacement =
    patch.workExperience[0] ??
    patch.volunteerExperience[0] ??
    patch.projects[0] ??
    patch.education[0] ??
    patch.certifications[0] ??
    patch.awards[0] ??
    patch.achievements[0] ??
    patch.discoveryNotes[0] ??
    null;

  const next: MasterCareerProfile = {
    ...current,
    workExperience: current.workExperience.map((item) =>
      item.id === input.entryId && patch.workExperience[0]
        ? { ...patch.workExperience[0], id: item.id, createdAt: item.createdAt }
        : item
    ),
    volunteerExperience: current.volunteerExperience.map((item) =>
      item.id === input.entryId && patch.volunteerExperience[0]
        ? { ...patch.volunteerExperience[0], id: item.id, createdAt: item.createdAt }
        : item
    ),
    projects: current.projects.map((item) =>
      item.id === input.entryId && patch.projects[0]
        ? { ...patch.projects[0], id: item.id, createdAt: item.createdAt }
        : item
    ),
    education: current.education.map((item) =>
      item.id === input.entryId && replacement && patch.education[0]
        ? { ...patch.education[0], id: item.id, createdAt: item.createdAt }
        : item
    ),
    certifications: current.certifications.map((item) =>
      item.id === input.entryId && replacement && patch.certifications[0]
        ? { ...patch.certifications[0], id: item.id, createdAt: item.createdAt }
        : item
    ),
    awards: current.awards.map((item) =>
      item.id === input.entryId && replacement && patch.awards[0]
        ? { ...patch.awards[0], id: item.id, createdAt: item.createdAt }
        : item
    ),
    achievements: current.achievements.map((item) =>
      item.id === input.entryId && replacement && patch.achievements[0]
        ? { ...patch.achievements[0], id: item.id, createdAt: item.createdAt }
        : item
    ),
    discoveryNotes: current.discoveryNotes.map((item) =>
      item.id === input.entryId && replacement && patch.discoveryNotes[0]
        ? { ...patch.discoveryNotes[0], id: item.id, createdAt: item.createdAt }
        : item
    ),
    interests: input.kind === "interest"
      ? current.interests.map((item, index) => index === Number(input.entryId.replace("interest-", "")) ? input.detail : item)
      : current.interests,
    careerGoals: input.kind === "careerGoal"
      ? current.careerGoals.map((item, index) => index === Number(input.entryId.replace("careerGoal-", "")) ? input.detail : item)
      : current.careerGoals
  };
  return saveMasterCareerProfile(userId, next);
}

export async function resolveProfileFirstResumeText(args: {
  userId?: string | null;
  uploadedResumeText: string;
}): Promise<{ resumeText: string; usedProfile: boolean }> {
  if (!args.userId) {
    return { resumeText: args.uploadedResumeText, usedProfile: false };
  }
  const profile = await getMasterCareerProfile(args.userId);
  if (!hasMeaningfulProfile(profile)) {
    return { resumeText: args.uploadedResumeText, usedProfile: false };
  }
  return {
    resumeText: composeProfileResumeSource({
      profile,
      uploadedResumeText: args.uploadedResumeText
    }),
    usedProfile: true
  };
}
