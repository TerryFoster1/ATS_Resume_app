import {
  buildCareerGenerationContextFromProfile,
  type CareerGenerationContext,
  type CareerGenerationJobTarget,
  type CareerGenerationWorkflow,
  type SavedOpportunityContext
} from "@/lib/careerGenerationContext";
import { getMasterCareerProfile } from "@/lib/careerProfileStorage";

export async function buildCareerGenerationContext(args: {
  userId?: string | null;
  workflowType: CareerGenerationWorkflow;
  uploadedResumeFallback?: string | null;
  jobTarget?: CareerGenerationJobTarget;
  jobDescription?: string | null;
  careerGoal?: string | null;
  savedOpportunityContext?: SavedOpportunityContext;
}): Promise<CareerGenerationContext> {
  const profile = args.userId ? await getMasterCareerProfile(args.userId) : null;
  return buildCareerGenerationContextFromProfile({
    workflowType: args.workflowType,
    profile,
    uploadedResumeFallback: args.uploadedResumeFallback,
    jobTarget: args.jobTarget,
    jobDescription: args.jobDescription,
    careerGoal: args.careerGoal,
    savedOpportunityContext: args.savedOpportunityContext
  });
}
