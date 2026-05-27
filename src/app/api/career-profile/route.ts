import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addManualProfileEntry,
  getMasterCareerProfile,
  mergeIntoMasterCareerProfile,
  updateManualProfileEntry
} from "@/lib/careerProfileStorage";
import {
  buildCareerDiscoveryProfile,
  buildFirstResumeProfile
} from "@/lib/masterCareerProfile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ManualEntryBody = z.object({
  action: z.literal("addEntry"),
  kind: z.enum([
    "work",
    "volunteer",
    "project",
    "education",
    "certification",
    "award",
    "achievement",
    "interest",
    "careerGoal",
    "discoveryNote"
  ]),
  title: z.string().trim().max(120).optional(),
  organization: z.string().trim().max(120).optional(),
  dateRange: z.string().trim().max(80).optional(),
  detail: z.string().trim().min(2).max(2500)
});

const UpdateEntryBody = z.object({
  action: z.literal("updateEntry"),
  entryId: z.string().trim().min(1).max(120),
  kind: z.enum([
    "work",
    "volunteer",
    "project",
    "education",
    "certification",
    "award",
    "achievement",
    "interest",
    "careerGoal",
    "discoveryNote"
  ]),
  title: z.string().trim().max(120).optional(),
  organization: z.string().trim().max(120).optional(),
  dateRange: z.string().trim().max(80).optional(),
  detail: z.string().trim().min(2).max(2500)
});

const FirstResumeBody = z.object({
  action: z.literal("firstResumeDiscovery"),
  responsibilities: z.string().trim().max(2500).optional(),
  helpingExperience: z.string().trim().max(2500).optional(),
  recognition: z.string().trim().max(2500).optional(),
  schoolCommunity: z.string().trim().max(2500).optional(),
  goals: z.string().trim().max(1500).optional()
});

const DiscoveryBody = z.object({
  action: z.literal("careerDiscovery"),
  interests: z.string().trim().max(2000).optional(),
  strengths: z.string().trim().max(2000).optional(),
  workPreferences: z.string().trim().max(2000).optional(),
  energyPatterns: z.string().trim().max(2000).optional(),
  goals: z.string().trim().max(1500).optional()
});

const Body = z.discriminatedUnion("action", [ManualEntryBody, UpdateEntryBody, FirstResumeBody, DiscoveryBody]);

export async function GET() {
  const access = await requireUser();
  if ("response" in access) return access.response;
  const profile = await getMasterCareerProfile(access.userId);
  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile payload." }, { status: 400 });
  }

  if (parsed.data.action === "addEntry") {
    const profile = await addManualProfileEntry(access.userId, parsed.data);
    if (!profile) {
      return NextResponse.json({ error: "Could not update profile." }, { status: 500 });
    }
    return NextResponse.json({ profile });
  }

  if (parsed.data.action === "updateEntry") {
    const profile = await updateManualProfileEntry(access.userId, parsed.data);
    if (!profile) {
      return NextResponse.json({ error: "Could not update profile entry." }, { status: 500 });
    }
    return NextResponse.json({ profile });
  }

  if (parsed.data.action === "firstResumeDiscovery") {
    const { profile: incoming, resumeText } = buildFirstResumeProfile(parsed.data);
    const profile = await mergeIntoMasterCareerProfile(access.userId, incoming);
    if (!profile) {
      return NextResponse.json({ error: "Could not update profile." }, { status: 500 });
    }
    return NextResponse.json({ profile, resumeText });
  }

  const profile = await mergeIntoMasterCareerProfile(
    access.userId,
    buildCareerDiscoveryProfile(parsed.data)
  );
  if (!profile) {
    return NextResponse.json({ error: "Could not update profile." }, { status: 500 });
  }
  return NextResponse.json({ profile });
}

async function requireUser(): Promise<{ userId: string } | { response: NextResponse }> {
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
  return { userId: user.id };
}
