import { NextResponse } from "next/server";
import { z } from "zod";
import { inferJobMeta } from "@/lib/applicationMeta";
import { ensureUserProfile, saveGeneratedOutput } from "@/lib/accountStorage";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const Body = z.object({
  resumeText: z.string().min(1),
  coverLetterText: z.string().min(1),
  sourceJobDescription: z.string().min(1),
  applicationTitle: z.string().trim().min(1).max(140).optional(),
  analysisSummary: z.string().optional(),
  clarificationAnswers: z.array(z.unknown()).default([]),
  analysis: z.unknown().optional()
});

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 503 });
  }
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (user.is_anonymous === true || !user.email) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid output payload." }, { status: 400 });
  }

  await ensureUserProfile({
    userId: user.id,
    email: user.email,
    name: typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null
  });

  const meta = inferJobMeta(parsed.data.sourceJobDescription);
  const saved = await saveGeneratedOutput({
    userId: user.id,
    jobTitle: parsed.data.applicationTitle ?? buildDefaultApplicationTitle(meta),
    companyName: meta.companyName,
    resumeText: parsed.data.resumeText,
    coverLetterText: parsed.data.coverLetterText,
    sourceJobDescription: parsed.data.sourceJobDescription,
    analysisSummary: parsed.data.analysisSummary,
    clarificationAnswers: parsed.data.clarificationAnswers as never[],
    analysis: parsed.data.analysis as never
  });

  return NextResponse.json(saved);
}

function buildDefaultApplicationTitle(meta: {
  jobTitle?: string;
  companyName?: string;
}) {
  if (meta.jobTitle && meta.companyName) return `${meta.jobTitle} - ${meta.companyName}`;
  if (meta.jobTitle) return meta.jobTitle;
  if (meta.companyName) return `${meta.companyName} Application`;
  return "Untitled application";
}
