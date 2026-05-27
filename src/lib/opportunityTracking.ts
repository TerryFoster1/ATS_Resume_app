export const APPLICATION_STATUSES = [
  "Interested",
  "Applied",
  "Screening",
  "Interviewing",
  "Final Interview",
  "Offer",
  "Accepted",
  "Rejected",
  "Archived"
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type OpportunityNote = {
  id: string;
  body: string;
  createdAt: string;
};

export type InterviewRound = {
  id: string;
  label: string;
  date?: string | null;
  status?: string | null;
  notes?: string | null;
};

export type InterviewerInfo = {
  id: string;
  name?: string | null;
  role?: string | null;
  email?: string | null;
  notes?: string | null;
};

export type OfferComparison = {
  salary?: string | null;
  bonus?: string | null;
  workModel?: string | null;
  pto?: string | null;
  benefits?: string | null;
  title?: string | null;
  growthOpportunity?: string | null;
  commute?: string | null;
  equity?: string | null;
  careerGrowthPotential?: string | null;
  notes?: string | null;
};

export type OpportunityTracking = {
  status: ApplicationStatus;
  recruiterName?: string | null;
  recruiterEmail?: string | null;
  recruiterPhone?: string | null;
  followUpDate?: string | null;
  notes: OpportunityNote[];
  interviewRounds: InterviewRound[];
  interviewers: InterviewerInfo[];
  offer: OfferComparison;
  updatedAt?: string | null;
  archivedAt?: string | null;
};

export type OpportunityTrackingInput = {
  status?: string | null;
  recruiterName?: string | null;
  recruiterEmail?: string | null;
  recruiterPhone?: string | null;
  followUpDate?: string | null;
  note?: string | null;
  notes?: OpportunityNote[];
  interviewRounds?: Array<Omit<InterviewRound, "id"> & { id?: string | null }>;
  interviewers?: Array<Omit<InterviewerInfo, "id"> & { id?: string | null }>;
  offer?: OfferComparison;
};

export function normalizeApplicationStatus(value: unknown): ApplicationStatus {
  if (typeof value !== "string") return "Interested";
  const normalized = value.trim().toLowerCase();
  if (normalized === "draft" || normalized === "not_started") return "Interested";
  const match = APPLICATION_STATUSES.find((status) => status.toLowerCase() === normalized);
  return match ?? "Interested";
}

export function readOpportunityTracking(snapshot: unknown): OpportunityTracking {
  const record = isRecord(snapshot) ? snapshot : {};
  const rawTracking = isRecord(record.opportunityTracking) ? record.opportunityTracking : {};
  const status = normalizeApplicationStatus(rawTracking.status ?? record.applicationStatus);
  return {
    status,
    recruiterName: readOptionalString(rawTracking.recruiterName),
    recruiterEmail: readOptionalString(rawTracking.recruiterEmail),
    recruiterPhone: readOptionalString(rawTracking.recruiterPhone),
    followUpDate: readOptionalString(rawTracking.followUpDate),
    notes: readNotes(rawTracking.notes),
    interviewRounds: readInterviewRounds(rawTracking.interviewRounds),
    interviewers: readInterviewers(rawTracking.interviewers),
    offer: readOffer(rawTracking.offer),
    updatedAt: readOptionalString(rawTracking.updatedAt),
    archivedAt: readOptionalString(rawTracking.archivedAt)
  };
}

export function mergeOpportunityTracking(
  existing: OpportunityTracking,
  input: OpportunityTrackingInput
): OpportunityTracking {
  const nextStatus = input.status
    ? normalizeApplicationStatus(input.status)
    : existing.status;
  const now = new Date().toISOString();
  const nextNotes = [...existing.notes];
  const note = input.note?.trim();
  if (note) {
    nextNotes.unshift({
      id: cryptoRandomId("note"),
      body: note.slice(0, 1200),
      createdAt: now
    });
  }

  return {
    status: nextStatus,
    recruiterName: cleanNullable(input.recruiterName, existing.recruiterName),
    recruiterEmail: cleanNullable(input.recruiterEmail, existing.recruiterEmail),
    recruiterPhone: cleanNullable(input.recruiterPhone, existing.recruiterPhone),
    followUpDate: cleanNullable(input.followUpDate, existing.followUpDate),
    notes: input.notes ? readNotes(input.notes) : nextNotes.slice(0, 30),
    interviewRounds: input.interviewRounds
      ? readInterviewRounds(input.interviewRounds)
      : existing.interviewRounds,
    interviewers: input.interviewers ? readInterviewers(input.interviewers) : existing.interviewers,
    offer: input.offer ? readOffer(input.offer) : existing.offer,
    updatedAt: now,
    archivedAt: nextStatus === "Archived" ? existing.archivedAt ?? now : existing.archivedAt ?? null
  };
}

export function applyOpportunityTrackingToSnapshot(
  snapshot: unknown,
  tracking: OpportunityTracking
) {
  const base = isRecord(snapshot) ? snapshot : {};
  return {
    ...base,
    applicationStatus: tracking.status,
    opportunityTracking: tracking
  };
}

export function summarizeOfferReadiness(offer: OfferComparison) {
  const known = [
    offer.salary,
    offer.workModel,
    offer.title,
    offer.growthOpportunity,
    offer.careerGrowthPotential,
    offer.benefits,
    offer.pto
  ].filter((value) => typeof value === "string" && value.trim()).length;
  if (known >= 5) {
    return "Enough details are captured to compare this offer against career fit, compensation, flexibility, and growth.";
  }
  if (known >= 2) {
    return "Some offer details are captured. Add growth, flexibility, and benefits notes before making a decision.";
  }
  return "Add offer details when they arrive. Career Ladder will keep the decision tied to this opportunity.";
}

export function summarizeOfferTradeoffs(offer: OfferComparison): string[] {
  const items: string[] = [];
  if (offer.salary || offer.bonus) {
    items.push("Compensation is captured. Compare it against flexibility, growth, stability, and the cost of accepting the role.");
  }
  if (offer.workModel || offer.commute) {
    items.push("Work model and commute can materially affect sustainability, energy, and long-term performance.");
  }
  if (offer.growthOpportunity || offer.careerGrowthPotential) {
    items.push("Growth notes are important because the best offer is not always the highest immediate salary.");
  }
  if (offer.title) {
    items.push("Title can matter when it changes how future recruiters understand your level and trajectory.");
  }
  if (offer.benefits || offer.pto) {
    items.push("Benefits and PTO are part of total value, especially when comparing stress, recovery, and family needs.");
  }
  return items.length
    ? items.slice(0, 4)
    : [
        "Capture the details you know now, then revisit the offer when salary, flexibility, growth, stability, and lifestyle tradeoffs are clearer."
      ];
}

function readNotes(value: unknown): OpportunityNote[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!isRecord(item)) return null;
      const body = readOptionalString(item.body);
      if (!body) return null;
      return {
        id: readOptionalString(item.id) ?? `note-${index}`,
        body,
        createdAt: readOptionalString(item.createdAt) ?? new Date().toISOString()
      };
    })
    .filter(Boolean)
    .slice(0, 30) as OpportunityNote[];
}

function readInterviewRounds(value: unknown): InterviewRound[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!isRecord(item)) return null;
      const label = readOptionalString(item.label);
      if (!label) return null;
      return {
        id: readOptionalString(item.id) ?? `round-${index}`,
        label,
        date: readOptionalString(item.date),
        status: readOptionalString(item.status),
        notes: readOptionalString(item.notes)
      };
    })
    .filter(Boolean)
    .slice(0, 12) as InterviewRound[];
}

function readInterviewers(value: unknown): InterviewerInfo[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!isRecord(item)) return null;
      const name = readOptionalString(item.name);
      const role = readOptionalString(item.role);
      if (!name && !role) return null;
      return {
        id: readOptionalString(item.id) ?? `interviewer-${index}`,
        name,
        role,
        email: readOptionalString(item.email),
        notes: readOptionalString(item.notes)
      };
    })
    .filter(Boolean)
    .slice(0, 12) as InterviewerInfo[];
}

function readOffer(value: unknown): OfferComparison {
  if (!isRecord(value)) return {};
  return {
    salary: readOptionalString(value.salary),
    bonus: readOptionalString(value.bonus),
    workModel: readOptionalString(value.workModel),
    pto: readOptionalString(value.pto),
    benefits: readOptionalString(value.benefits),
    title: readOptionalString(value.title),
    growthOpportunity: readOptionalString(value.growthOpportunity),
    commute: readOptionalString(value.commute),
    equity: readOptionalString(value.equity),
    careerGrowthPotential: readOptionalString(value.careerGrowthPotential),
    notes: readOptionalString(value.notes)
  };
}

function cleanNullable(next: string | null | undefined, fallback: string | null | undefined) {
  if (typeof next !== "string") return fallback ?? null;
  const clean = next.trim();
  return clean ? clean.slice(0, 400) : null;
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cryptoRandomId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
