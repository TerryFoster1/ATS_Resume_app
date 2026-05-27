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
