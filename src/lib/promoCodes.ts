import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type PromoCodeRecord = {
  id: string;
  code: string;
  description?: string | null;
  creditAmount: number;
  freeBetaAccess: boolean;
  active: boolean;
  expiresAt?: string | null;
  maxRedemptions?: number | null;
  redemptionCount: number;
  createdAt: string;
};

export type PromoCodeRedemptionRecord = {
  id: string;
  code: string;
  userId: string;
  creditsGranted: number;
  redeemedAt: string;
};

export function normalizePromoCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
}

export async function listPromoCodes() {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("Supabase admin client is not configured.");
  const { data: codes, error } = await supabase
    .from("promo_codes")
    .select("id, code, description, credit_amount, free_beta_access, active, expires_at, max_redemptions, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const { data: redemptions, error: redemptionError } = await supabase
    .from("promo_code_redemptions")
    .select("id, promo_code_id, user_id, credits_granted, redeemed_at, promo_codes(code)")
    .order("redeemed_at", { ascending: false })
    .limit(100);
  if (redemptionError) throw redemptionError;

  const counts = new Map<string, number>();
  for (const redemption of redemptions ?? []) {
    const promoCodeId = typeof redemption.promo_code_id === "string" ? redemption.promo_code_id : "";
    counts.set(promoCodeId, (counts.get(promoCodeId) ?? 0) + 1);
  }

  return {
    codes: (codes ?? []).map((item): PromoCodeRecord => ({
      id: item.id,
      code: item.code,
      description: item.description,
      creditAmount: item.credit_amount,
      freeBetaAccess: item.free_beta_access,
      active: item.active,
      expiresAt: item.expires_at,
      maxRedemptions: item.max_redemptions,
      redemptionCount: counts.get(item.id) ?? 0,
      createdAt: item.created_at
    })),
    redemptions: (redemptions ?? []).map((item): PromoCodeRedemptionRecord => ({
      id: item.id,
      code: readJoinedCode(item.promo_codes),
      userId: item.user_id,
      creditsGranted: item.credits_granted,
      redeemedAt: item.redeemed_at
    }))
  };
}

export async function createPromoCode(input: {
  code: string;
  description?: string | null;
  creditAmount: number;
  freeBetaAccess?: boolean;
  expiresAt?: string | null;
  maxRedemptions?: number | null;
  createdBy?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("Supabase admin client is not configured.");
  const code = normalizePromoCode(input.code);
  if (!code) throw new Error("Promo code is required.");
  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      code,
      description: input.description ?? null,
      credit_amount: Math.max(0, Math.floor(input.creditAmount)),
      free_beta_access: Boolean(input.freeBetaAccess),
      expires_at: input.expiresAt || null,
      max_redemptions: input.maxRedemptions ? Math.max(1, Math.floor(input.maxRedemptions)) : null,
      created_by: input.createdBy ?? null
    })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function setPromoCodeActive(id: string, active: boolean) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("Supabase admin client is not configured.");
  const { error } = await supabase
    .from("promo_codes")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function redeemPromoCode(userId: string, code: string) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("Supabase admin client is not configured.");
  const normalized = normalizePromoCode(code);
  if (!normalized) return { status: "invalid", creditsGranted: 0 };
  const { data, error } = await supabase.rpc("redeem_promo_code", {
    p_user_id: userId,
    p_code: normalized
  });
  if (error) throw error;
  const first = Array.isArray(data) ? data[0] : null;
  return {
    status: typeof first?.status === "string" ? first.status : "invalid",
    creditsGranted: typeof first?.credits_granted === "number" ? first.credits_granted : 0
  };
}

function readJoinedCode(value: unknown) {
  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === "object" && "code" in first && typeof first.code === "string"
      ? first.code
      : "";
  }
  if (value && typeof value === "object" && "code" in value && typeof value.code === "string") {
    return value.code;
  }
  return "";
}
