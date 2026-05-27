import { NextResponse } from "next/server";
import { z } from "zod";
import {
  APPLICATION_STATUSES,
  applyOpportunityTrackingToSnapshot,
  mergeOpportunityTracking,
  readOpportunityTracking
} from "@/lib/opportunityTracking";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TextField = z.string().trim().max(400).nullable().optional();

const TrackingBody = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  recruiterName: TextField,
  recruiterEmail: TextField,
  recruiterPhone: TextField,
  followUpDate: TextField,
  note: z.string().trim().max(1200).nullable().optional(),
  interviewRounds: z
    .array(
      z.object({
        id: z.string().trim().max(120).optional(),
        label: z.string().trim().min(1).max(160),
        date: TextField,
        status: TextField,
        notes: z.string().trim().max(800).nullable().optional()
      })
    )
    .max(12)
    .optional(),
  interviewers: z
    .array(
      z.object({
        id: z.string().trim().max(120).optional(),
        name: TextField,
        role: TextField,
        email: TextField,
        notes: z.string().trim().max(800).nullable().optional()
      })
    )
    .max(12)
    .optional(),
  offer: z
    .object({
      salary: TextField,
      bonus: TextField,
      workModel: TextField,
      pto: TextField,
      benefits: z.string().trim().max(1000).nullable().optional(),
      title: TextField,
      growthOpportunity: z.string().trim().max(1000).nullable().optional(),
      commute: TextField,
      equity: TextField,
      careerGrowthPotential: z.string().trim().max(1000).nullable().optional(),
      notes: z.string().trim().max(1200).nullable().optional()
    })
    .optional()
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await loadOwnedOutput(await params);
  if ("response" in result) return result.response;
  return NextResponse.json(
    { tracking: readOpportunityTracking(result.output.analysis_snapshot) },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const parsed = TrackingBody.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid tracking payload." }, { status: 400 });
  }

  const result = await loadOwnedOutput(await params);
  if ("response" in result) return result.response;

  const existing = readOpportunityTracking(result.output.analysis_snapshot);
  const tracking = mergeOpportunityTracking(existing, parsed.data);
  const nextSnapshot = applyOpportunityTrackingToSnapshot(result.output.analysis_snapshot, tracking);

  const { error } = await result.admin
    .from("generated_outputs")
    .update({ analysis_snapshot: nextSnapshot })
    .eq("id", result.output.id)
    .eq("user_id", result.userId);

  if (error) {
    console.error("[opportunity-tracking] Update failed", {
      outputId: result.output.id,
      userId: result.userId,
      error
    });
    return NextResponse.json({ error: "Could not update this opportunity." }, { status: 500 });
  }

  return NextResponse.json({ tracking });
}

async function loadOwnedOutput({ id }: { id: string }) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return { response: NextResponse.json({ error: "Auth is not configured." }, { status: 503 }) };
  }
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous === true || !user.email) {
    return { response: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return {
      response: NextResponse.json({ error: "Account storage is not configured." }, { status: 503 })
    };
  }

  const { data: output, error } = await admin
    .from("generated_outputs")
    .select("id, user_id, analysis_snapshot")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !output) {
    return { response: NextResponse.json({ error: "Saved output not found." }, { status: 404 }) };
  }

  return { admin, output, userId: user.id };
}
