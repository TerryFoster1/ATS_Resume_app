import {
  inferDiscoveryInsights,
  inferTransferableSkillSignals,
  recommendLowCostLearning
} from "@/lib/careerIntelligence";

export type CareerCoachInput = {
  currentExperience: string;
  interests: string;
  workPreferences: string;
  lifestyleGoals: string;
  ambition: string;
  learningTolerance: string;
  timeline: string;
  financialConstraints: string;
  education: string;
};

export type CareerMatch = {
  title: string;
  whyItFits: string;
  salaryExpectation: string;
  dayInLife: string;
  typicalCredentials: string[];
  fastestPath: string[];
  lowestCostPath: string[];
  hiringOutlook: string;
  transferableStrengths: string[];
  likelyRecruiterConcerns: string[];
};

const CAREER_MATCHES: Array<{
  title: string;
  patterns: RegExp[];
  salaryExpectation: string;
  dayInLife: string;
  typicalCredentials: string[];
  hiringOutlook: string;
  concerns: string[];
}> = [
  {
    title: "Operations Coordinator",
    patterns: [/operations|organize|schedule|inventory|process|logistics|chef|kitchen|hospitality|trades|coordinat/i],
    salaryExpectation: "Often mid-entry to mid-level; varies heavily by region, industry, and scope.",
    dayInLife:
      "Coordinating timelines, handoffs, vendors, internal updates, documentation, and the small details that keep work moving.",
    typicalCredentials: ["Spreadsheet confidence", "Process documentation", "Project or operations terminology"],
    hiringOutlook:
      "Good transition target when the user can show coordination, follow-through, and calm problem solving under constraints.",
    concerns: ["May need clearer business-tool evidence", "May need examples of documentation or stakeholder updates"]
  },
  {
    title: "Customer Success Associate",
    patterns: [/customer|client|support|retail|service|relationship|help|account|onboarding|hospitality/i],
    salaryExpectation: "Often entry to mid-level with growth tied to account ownership, retention, and SaaS context.",
    dayInLife:
      "Helping customers adopt a product, resolving issues, documenting account context, spotting risks, and supporting renewals or expansion.",
    typicalCredentials: ["CRM familiarity", "Customer communication examples", "Basic SaaS or product adoption language"],
    hiringOutlook:
      "Realistic for people with strong service, escalation, communication, and follow-through evidence.",
    concerns: ["Recruiters may ask about CRM use", "Business-to-business customer examples may be limited"]
  },
  {
    title: "Account Coordinator",
    patterns: [/sales|account|client|hospitality|retail|relationship|follow.?up|communication|service/i],
    salaryExpectation: "Often entry to mid-level; compensation may include variable or bonus components depending on industry.",
    dayInLife:
      "Supporting client communication, tracking deliverables, preparing updates, coordinating internal responses, and keeping relationships warm.",
    typicalCredentials: ["Client communication", "Follow-up tracking", "Comfort with account notes or CRM"],
    hiringOutlook:
      "A strong adjacent path for service-heavy backgrounds when the user can show trust-building and reliable follow-through.",
    concerns: ["Need proof of commercial awareness", "May need examples beyond one-time customer interactions"]
  },
  {
    title: "Project Coordinator",
    patterns: [/project|deadline|plan|timeline|trades|construction|event|organize|coordinate|documentation/i],
    salaryExpectation: "Often entry to mid-level, with growth into project management as scope and ownership increase.",
    dayInLife:
      "Tracking tasks, updating stakeholders, organizing timelines, preparing notes, and making sure blockers are visible early.",
    typicalCredentials: ["Project terminology", "Status update examples", "Optional CAPM or Agile basics"],
    hiringOutlook:
      "Credible when the user has evidence of sequencing work, coordinating people, or keeping complex tasks on track.",
    concerns: ["May need formal project vocabulary", "May need proof of documentation and stakeholder communication"]
  },
  {
    title: "Content Marketing Coordinator",
    patterns: [/write|journalism|content|social|marketing|research|editor|story|communication|creative/i],
    salaryExpectation: "Usually entry to mid-level; stronger ranges require portfolio proof and performance context.",
    dayInLife:
      "Researching audiences, drafting content, coordinating publishing, reviewing performance, and turning ideas into clear messaging.",
    typicalCredentials: ["Writing samples", "Basic analytics", "Campaign or channel awareness"],
    hiringOutlook:
      "Realistic for journalism, writing, education, or communications backgrounds with portfolio examples.",
    concerns: ["Recruiters may ask about business impact", "May need analytics or campaign evidence"]
  }
];

export function generateCareerCoachMatches(input: CareerCoachInput): CareerMatch[] {
  const text = Object.values(input).join("\n");
  const insights = inferDiscoveryInsights({
    interests: input.interests,
    strengths: input.currentExperience,
    preferences: input.workPreferences,
    energy: input.lifestyleGoals,
    ambition: input.ambition
  });
  const signals = inferTransferableSkillSignals(text);
  const scored = CAREER_MATCHES.map((match) => ({
    match,
    score:
      match.patterns.reduce((total, pattern) => total + (pattern.test(text) ? 2 : 0), 0) +
      insights.filter((insight) =>
        insight.possibleDirections.some((direction) =>
          match.title.toLowerCase().includes(direction.split(" ")[0]?.toLowerCase() ?? "")
        )
      ).length
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return scored.map(({ match }) => {
    const relevantSignals = signals.slice(0, 2);
    const learning = recommendLowCostLearning(match.title, match.typicalCredentials);
    return {
      title: match.title,
      whyItFits: buildWhyItFits(match.title, relevantSignals, input),
      salaryExpectation: match.salaryExpectation,
      dayInLife: match.dayInLife,
      typicalCredentials: match.typicalCredentials,
      fastestPath: [
        "Translate current experience into the target role's operating language.",
        "Prepare two proof stories that show ownership, judgment, and follow-through.",
        "Tailor one resume version around this path before applying broadly."
      ],
      lowestCostPath: learning,
      hiringOutlook: match.hiringOutlook,
      transferableStrengths: relevantSignals.map((signal) => `${signal.mapsTo}: ${signal.why}`),
      likelyRecruiterConcerns: [
        ...match.concerns,
        ...relevantSignals.map((signal) => signal.recruiterConcern).filter((value): value is string => Boolean(value))
      ].slice(0, 4)
    };
  });
}

function buildWhyItFits(
  title: string,
  signals: ReturnType<typeof inferTransferableSkillSignals>,
  input: CareerCoachInput
) {
  const signal = signals[0];
  const constraint = input.lifestyleGoals || input.ambition || input.timeline;
  return [
    signal
      ? `${signal.source} can map toward ${title} because it may already involve ${signal.mapsTo}.`
      : `${title} may fit because it rewards communication, ownership, and practical follow-through.`,
    constraint
      ? `Your stated constraints matter too: ${constraint.slice(0, 180)}`
      : "The next step is proving the overlap with concrete examples, not broad claims."
  ].join(" ");
}
