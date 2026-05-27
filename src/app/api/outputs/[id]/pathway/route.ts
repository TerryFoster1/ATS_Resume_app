import { NextResponse } from "next/server";
import { consumeCredits, getCreditBalance } from "@/lib/accountStorage";
import { generatePathwayAnalysis, readPathwaySnapshot } from "@/lib/pathway";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Account storage is not configured." }, { status: 503 });
  }

  const { data: output, error: outputError } = await admin
    .from("generated_outputs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (outputError || !output) {
    return NextResponse.json({ error: "Saved output not found." }, { status: 404 });
  }

  const existing = readPathwaySnapshot(output.analysis_snapshot);
  if (existing?.full) {
    return NextResponse.json({ pathway: existing, alreadyGenerated: true });
  }

  const credits = await getCreditBalance(user.id);
  if (credits < 1) {
    return NextResponse.json(
      { error: "Not enough credits to unlock personalized pathway analysis." },
      { status: 402 }
    );
  }

  const snapshot = isRecord(output.analysis_snapshot) ? output.analysis_snapshot : {};
  const jobContext = isRecord(snapshot.jobContext) ? snapshot.jobContext : {};
  try {
    const full = await generatePathwayAnalysis({
      targetRole: output.job_title ?? "Untitled application",
      companyName: output.company_name,
      jobPosting: output.source_job_description,
      resumeText:
        typeof jobContext.resumeText === "string"
          ? jobContext.resumeText
          : output.resume_text,
      currentBackground:
        typeof jobContext.currentBackground === "string"
          ? jobContext.currentBackground
          : readCurrentBackground(output.source_job_description)
    });
    const nextPathway = {
      ...(existing ?? {
        status: "preview",
        roleOverview: "Career pathway preview for this target role.",
        commonRequirements: [],
        transferableInsight: "Unlock the full analysis for a personalized gap and next-step plan.",
        generatedAt: new Date().toISOString()
      }),
      status: "completed",
      full,
      unlockedAt: new Date().toISOString()
    };
    const creditResult = await consumeCredits(user.id, 1, "unlock_pathway_analysis");
    if (creditResult.status === "insufficient_credits") {
      return NextResponse.json(
        { error: "Not enough credits to unlock personalized pathway analysis." },
        { status: 402 }
      );
    }
    const { error: updateError } = await admin
      .from("generated_outputs")
      .update({
        analysis_snapshot: {
          ...snapshot,
          pathway: nextPathway
        }
      })
      .eq("id", id)
      .eq("user_id", user.id);
    if (updateError) throw updateError;
    return NextResponse.json({ pathway: nextPathway });
  } catch (error) {
    console.error("[pathway] Generation failed", {
      outputId: id,
      userId: user.id,
      error
    });
    return NextResponse.json(
      { error: "Pathway analysis failed. Please contact support if a credit was used." },
      { status: 500 }
    );
  }
}

function readCurrentBackground(value?: string | null) {
  if (!value) return "";
  const match = value.match(/(?:^|\n)current background:\s*\n([\s\S]*?)(?:\n\s*job posting:|$)/i);
  return match?.[1]?.trim() ?? "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
