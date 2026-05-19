import type { AnalysisResult, FollowUp } from "./types";
import { createAdminSupabaseClient } from "./supabase/server";

export type GeneratedOutputInsert = {
  userId: string;
  jobTitle?: string;
  companyName?: string;
  resumeText: string;
  coverLetterText: string;
  sourceJobDescription: string;
  analysisSummary?: string;
  clarificationAnswers: FollowUp[];
  analysis?: AnalysisResult;
};

export async function ensureUserProfile(args: {
  userId: string;
  email?: string | null;
  name?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) return;
  await supabase.from("profiles").upsert(
    {
      id: args.userId,
      email: args.email ?? null,
      name: args.name ?? null
    },
    { onConflict: "id" }
  );
}

export async function saveGeneratedOutput(input: GeneratedOutputInsert) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("Supabase admin client is not configured.");
  const { data, error } = await supabase
    .from("generated_outputs")
    .insert({
      user_id: input.userId,
      job_title: input.jobTitle ?? "Tailored application",
      company_name: input.companyName ?? null,
      resume_text: input.resumeText,
      cover_letter_text: input.coverLetterText,
      source_job_description: input.sourceJobDescription,
      analysis_summary: input.analysisSummary ?? null,
      clarification_answers: input.clarificationAnswers,
      analysis_snapshot: input.analysis ?? null
    })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function setOutputEntitlement(args: {
  outputId: string;
  userId: string;
  resumeUnlocked?: boolean;
  coverLetterUnlocked?: boolean;
}) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("Supabase admin client is not configured.");
  const patch: Record<string, unknown> = {};
  if (typeof args.resumeUnlocked === "boolean") {
    patch.resume_unlocked = args.resumeUnlocked;
  }
  if (typeof args.coverLetterUnlocked === "boolean") {
    patch.cover_letter_unlocked = args.coverLetterUnlocked;
  }
  const { error } = await supabase
    .from("generated_outputs")
    .update(patch)
    .eq("id", args.outputId)
    .eq("user_id", args.userId);
  if (error) throw error;
}

export async function getCreditBalance(userId: string): Promise<number> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) return 0;
  const { data } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();
  return typeof data?.credits === "number" ? data.credits : 0;
}

export async function addCredits(userId: string, amount: number, reason: string) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("Supabase admin client is not configured.");
  await supabase.from("credit_ledger").insert({
    user_id: userId,
    delta: Math.abs(amount),
    reason
  });
}

export async function fulfillCreditPurchase(args: {
  userId: string;
  pack: "5" | "10";
  stripeCheckoutSessionId: string;
  stripeCustomerId?: string | null;
  stripePaymentIntentId?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("Supabase admin client is not configured.");

  console.log("[credits] Starting credit purchase fulfillment", {
    userId: args.userId,
    pack: args.pack,
    stripeCheckoutSessionId: args.stripeCheckoutSessionId
  });

  const { error: ensureProfileError } = await supabase.from("profiles").upsert(
    { id: args.userId },
    { onConflict: "id" }
  );
  if (ensureProfileError) {
    console.error("[credits] Could not ensure profile before fulfillment", {
      userId: args.userId,
      code: ensureProfileError.code,
      message: ensureProfileError.message
    });
    throw ensureProfileError;
  }

  return fulfillCreditPurchaseDirect(args);
}

async function fulfillCreditPurchaseDirect(args: {
  userId: string;
  pack: "5" | "10";
  stripeCheckoutSessionId: string;
  stripeCustomerId?: string | null;
  stripePaymentIntentId?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("Supabase admin client is not configured.");
  const credits = args.pack === "10" ? 10 : 5;

  const { data: existingLedger, error: existingLedgerError } = await supabase
    .from("credit_ledger")
    .select("id")
    .eq("stripe_checkout_session_id", args.stripeCheckoutSessionId)
    .maybeSingle();
  if (existingLedgerError) throw existingLedgerError;
  if (existingLedger) {
    console.log("[credits] Duplicate direct fulfillment skipped", {
      userId: args.userId,
      stripeCheckoutSessionId: args.stripeCheckoutSessionId
    });
    return { status: "duplicate" as const };
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    { id: args.userId },
    { onConflict: "id" }
  );
  if (profileError) throw profileError;

  const { data: profile, error: balanceError } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", args.userId)
    .single();
  if (balanceError) throw balanceError;
  const currentCredits = typeof profile?.credits === "number" ? profile.credits : 0;

  const { error: ledgerError } = await supabase.from("credit_ledger").insert({
    user_id: args.userId,
    delta: credits,
    reason: `stripe_credit_pack_${args.pack}`,
    stripe_checkout_session_id: args.stripeCheckoutSessionId
  });
  if (ledgerError) {
    if (ledgerError.code === "23505") return { status: "duplicate" as const };
    throw ledgerError;
  }

  const profilePatch: Record<string, unknown> = {
    credits: currentCredits + credits,
    updated_at: new Date().toISOString()
  };
  if (args.stripeCustomerId) profilePatch.stripe_customer_id = args.stripeCustomerId;

  const { error: updateProfileError } = await supabase
    .from("profiles")
    .update(profilePatch)
    .eq("id", args.userId);
  if (updateProfileError) throw updateProfileError;

  const { error: purchaseError } = await supabase.from("purchases").upsert(
    {
      user_id: args.userId,
      stripe_checkout_session_id: args.stripeCheckoutSessionId,
      stripe_customer_id: args.stripeCustomerId ?? null,
      stripe_payment_intent_id: args.stripePaymentIntentId ?? null,
      pack: args.pack,
      status: "completed"
    },
    { onConflict: "stripe_checkout_session_id" }
  );
  if (purchaseError) throw purchaseError;

  console.log("[credits] Credit purchase fulfilled through direct fallback", {
    userId: args.userId,
    stripeCheckoutSessionId: args.stripeCheckoutSessionId,
    credits
  });
  return { status: "fulfilled" as const, credits };
}

export async function consumeCredits(userId: string, amount: number, reason: string) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("Supabase admin client is not configured.");
  const currentCredits = await getCreditBalance(userId);
  if (currentCredits < amount) {
    return { status: "insufficient_credits" as const, credits: currentCredits };
  }
  const { error: ledgerError } = await supabase.from("credit_ledger").insert({
    user_id: userId,
    delta: -Math.abs(amount),
    reason
  });
  if (ledgerError) throw ledgerError;
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ credits: currentCredits - Math.abs(amount) })
    .eq("id", userId);
  if (profileError) throw profileError;
  return { status: "consumed" as const, credits: currentCredits - Math.abs(amount) };
}
