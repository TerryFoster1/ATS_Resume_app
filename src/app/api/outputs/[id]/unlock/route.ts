import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeCredits, setOutputEntitlement } from "@/lib/accountStorage";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const Body = z.object({
  target: z.enum(["resume", "coverLetter"])
});

export async function POST(
  request: Request,
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
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (user.is_anonymous === true || !user.email) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid unlock target." }, { status: 400 });
  }

  const { data: output } = await supabase
    .from("generated_outputs")
    .select("id, resume_unlocked, cover_letter_unlocked")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!output) {
    return NextResponse.json({ error: "Saved output not found." }, { status: 404 });
  }
  if (
    (parsed.data.target === "resume" && output.resume_unlocked) ||
    (parsed.data.target === "coverLetter" && output.cover_letter_unlocked)
  ) {
    return NextResponse.json({ ok: true, alreadyUnlocked: true });
  }

  const creditResult = await consumeCredits(
    user.id,
    1,
    parsed.data.target === "resume" ? "unlock_resume_export" : "unlock_cover_letter"
  );
  if (creditResult.status === "insufficient_credits") {
    return NextResponse.json(
      { error: "Not enough credits to unlock this material." },
      { status: 402 }
    );
  }

  await setOutputEntitlement({
    outputId: id,
    userId: user.id,
    resumeUnlocked: parsed.data.target === "resume" ? true : undefined,
    coverLetterUnlocked: parsed.data.target === "coverLetter" ? true : undefined
  });
  return NextResponse.json({ ok: true });
}
