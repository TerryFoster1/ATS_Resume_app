import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserProfile, saveGeneratedOutput } from "@/lib/accountStorage";
import { buildApplicationTitle, inferJobMeta } from "@/lib/applicationMeta";
import { resolveProfileFirstResumeText } from "@/lib/careerProfileStorage";
import { composeJobContextText } from "@/lib/intentWorkflow";
import { buildPathwayPreview } from "@/lib/pathway";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const Body = z
  .object({
    targetRole: z.string().trim().min(2).max(120).optional(),
    companyName: z.string().trim().max(120).optional(),
    jobPosting: z.string().trim().max(20000).optional(),
    currentBackground: z.string().trim().max(12000).optional(),
    resumeText: z.string().trim().max(30000).optional(),
    resumeFileName: z.string().trim().max(180).optional(),
    intent: z.enum(["interviewPrep", "mockInterview", "careerPathway"])
  })
  .refine(
    (value) =>
      Boolean(value.targetRole?.trim()) || Boolean(value.jobPosting && value.jobPosting.trim().length >= 20),
    "Provide a target role or enough of the job posting."
  );

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 503 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous === true || !user.email) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid opportunity payload." }, { status: 400 });
  }

  await ensureUserProfile({
    userId: user.id,
    email: user.email,
    name: typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null
  });

  const inferredMeta = inferJobMeta(
    composeJobContextText({
      targetRole: parsed.data.targetRole ?? "",
      companyName: parsed.data.companyName,
      currentBackground: parsed.data.currentBackground,
      jobPosting: parsed.data.jobPosting,
      resumeText: parsed.data.resumeText,
      resumeFileName: parsed.data.resumeFileName
    })
  );
  const jobTitle = parsed.data.targetRole?.trim() || inferredMeta.jobTitle || "Untitled application";
  const companyName = parsed.data.companyName?.trim() || inferredMeta.companyName;
  const profileResume = await resolveProfileFirstResumeText({
    userId: user.id,
    uploadedResumeText: parsed.data.resumeText?.trim() || ""
  });
  const resumeContextText = profileResume.resumeText.trim() || parsed.data.resumeText?.trim() || "";
  const contextText = composeJobContextText({
    targetRole: jobTitle === "Untitled application" ? "" : jobTitle,
    companyName,
    currentBackground: parsed.data.currentBackground,
    jobPosting: parsed.data.jobPosting,
    resumeText: resumeContextText,
    resumeFileName: parsed.data.resumeFileName
  });
  const title = buildApplicationTitle({
    jobTitle,
    companyName
  });

  const saved = await saveGeneratedOutput({
    userId: user.id,
    jobTitle,
    companyName,
    resumeText: "",
    coverLetterText: "",
    sourceJobDescription: contextText,
    analysisSummary: `Job-context opportunity created for ${parsed.data.intent}.`,
    clarificationAnswers: [],
    analysis: {
      applicationStatus: "Draft",
      workflowIntent: parsed.data.intent,
      opportunityOnly: true,
      applicationTitle: title,
      jobContext: {
        targetRole: jobTitle === "Untitled application" ? null : jobTitle,
        companyName: companyName ?? null,
        hasFullPosting: Boolean(parsed.data.jobPosting?.trim()),
        hasCurrentBackground: Boolean(parsed.data.currentBackground?.trim()),
        hasResumeContext: Boolean(resumeContextText),
        resumeFileName: parsed.data.resumeFileName?.trim() || null,
        resumeText: resumeContextText || null,
        usedMasterCareerProfile: profileResume.usedProfile,
        currentBackground: parsed.data.currentBackground?.trim() || null
      },
      pathway:
        parsed.data.intent === "careerPathway"
          ? buildPathwayPreview({
              targetRole: jobTitle,
              companyName,
              jobPosting: parsed.data.jobPosting,
              currentBackground: parsed.data.currentBackground,
              resumeText: resumeContextText
            })
          : undefined
    }
  });

  return NextResponse.json({ id: saved.id, title });
}
