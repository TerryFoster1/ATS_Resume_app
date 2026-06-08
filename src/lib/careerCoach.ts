import {
  buildRecruiterConcernNotes,
  inferDiscoveryInsights,
  inferTransitionRecommendations,
  inferTransferableSkillSignals,
  recommendLowCostLearning
} from "@/lib/careerIntelligence";
import {
  extractTransferableSkillProfile,
  type TransferableSkillExtraction
} from "@/lib/transferableSkillExtraction";

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
  aiDisruptionRisk: string;
  recruiterExpectations: string[];
  likelyChallenges: string[];
  whyRealistic: string[];
  professionalFunctions: string[];
  fitEvaluation: string[];
  transferableStrengths: string[];
  likelyRecruiterConcerns: string[];
};

type CareerCoachReasoningPipeline = {
  strengths: string[];
  interests: string[];
  workPreferences: string[];
  ambitionAndConstraints: string[];
  extraction: TransferableSkillExtraction;
  professionalFunctions: string[];
};

const CAREER_MATCHES: Array<{
  title: string;
  patterns: RegExp[];
  salaryExpectation: string;
  dayInLife: string;
  typicalCredentials: string[];
  hiringOutlook: string;
  aiDisruptionRisk: string;
  recruiterExpectations: string[];
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
    aiDisruptionRisk:
      "Moderate. Tools may automate admin work, but people still need judgment, handoffs, prioritization, and on-the-ground coordination.",
    recruiterExpectations: [
      "Proof you can keep moving pieces organized",
      "Examples of follow-through when priorities changed",
      "Comfort documenting status, blockers, and next steps"
    ],
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
    aiDisruptionRisk:
      "Moderate. Simple support may be automated, but relationship judgment, adoption coaching, renewal risk, and escalation handling still matter.",
    recruiterExpectations: [
      "Evidence of trust-building and service recovery",
      "Follow-up discipline and clear account notes",
      "Ability to explain problems without sounding defensive"
    ],
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
    aiDisruptionRisk:
      "Moderate. Automation can help with notes and sequences, but client trust, internal coordination, and judgment remain human differentiators.",
    recruiterExpectations: [
      "Commercial awareness and client-facing polish",
      "Examples of keeping promises and managing expectations",
      "Comfort coordinating internal answers for external people"
    ],
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
    aiDisruptionRisk:
      "Moderate-low for people with strong coordination judgment. Tools can track tasks, but humans still surface risks, negotiate tradeoffs, and communicate context.",
    recruiterExpectations: [
      "Proof of timelines, handoffs, and status updates",
      "Examples of spotting blockers early",
      "Clear communication with multiple stakeholders"
    ],
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
    aiDisruptionRisk:
      "Higher for generic content production, lower when the person can show audience insight, stakeholder judgment, research, and business context.",
    recruiterExpectations: [
      "A portfolio that shows audience and goal, not only writing quality",
      "Basic analytics or performance awareness",
      "Ability to work with feedback and business constraints"
    ],
    concerns: ["Recruiters may ask about business impact", "May need analytics or campaign evidence"]
  },
  {
    title: "Training or Enablement Coordinator",
    patterns: [/teach|coach|mentor|train|onboard|explain|support|education|team lead|documentation/i],
    salaryExpectation: "Often entry to mid-level; stronger compensation comes with product, customer, or internal enablement scope.",
    dayInLife:
      "Creating simple learning materials, helping people adopt processes, answering repeat questions, and turning messy knowledge into usable guidance.",
    typicalCredentials: ["Training examples", "Documentation samples", "Comfort explaining workflows"],
    hiringOutlook:
      "Realistic when the user can prove they help others learn, improve, or follow a process more confidently.",
    aiDisruptionRisk:
      "Moderate. AI can draft materials, but humans still diagnose confusion, build trust, adapt explanations, and reinforce adoption.",
    recruiterExpectations: [
      "Evidence that people learned or improved because of your support",
      "Clear documentation or process examples",
      "Patience, structure, and communication maturity"
    ],
    concerns: ["May need examples beyond informal helping", "May need proof of business or adult-learner context"]
  }
];

export function generateCareerCoachMatches(input: CareerCoachInput): CareerMatch[] {
  const pipeline = buildCareerCoachReasoningPipeline(input);
  const text = Object.values(input).join("\n");
  const insights = inferDiscoveryInsights({
    interests: input.interests,
    strengths: input.currentExperience,
    preferences: input.workPreferences,
    energy: input.lifestyleGoals,
    ambition: input.ambition
  });
  const signals = inferTransferableSkillSignals(text);
  const transitionRecommendations = inferTransitionRecommendations(text);
  const scored = CAREER_MATCHES.map((match) => ({
    match,
    score:
      match.patterns.reduce((total, pattern) => total + (pattern.test(text) ? 2 : 0), 0) +
      signals.filter((signal) => signal.adjacentCareers.some((career) =>
        careerMatchesTitle(career, match.title)
      )).length * 2 +
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
    const transition = transitionRecommendations.find((item) => careerMatchesTitle(item.title, match.title));
    return {
      title: match.title,
      whyItFits: buildWhyItFits(match.title, relevantSignals, input),
      salaryExpectation: match.salaryExpectation,
      dayInLife: match.dayInLife,
      typicalCredentials: match.typicalCredentials,
      fastestPath: [
        transition?.firstMove ?? "Translate current experience into the target role's operating language.",
        "Prepare two proof stories that show ownership, judgment, and follow-through in the target role's language.",
        "Tailor one resume version around this path before applying broadly, then practice explaining the transition out loud."
      ],
      lowestCostPath: learning,
      hiringOutlook: match.hiringOutlook,
      aiDisruptionRisk: match.aiDisruptionRisk,
      recruiterExpectations: match.recruiterExpectations,
      likelyChallenges: [
        transition?.likelyGap,
        "The transition becomes weaker if the resume repeats old task language instead of showing the professional function behind the work.",
        "Recruiters may need a simple explanation for why this move is realistic now."
      ].filter((value): value is string => Boolean(value)).slice(0, 4),
      whyRealistic: [
        transition?.whyRealistic,
        ...relevantSignals.map((signal) => `${signal.source}: ${signal.recruiterLanguage}`)
      ].filter((value): value is string => Boolean(value)).slice(0, 4),
      professionalFunctions: pipeline.professionalFunctions.slice(0, 5),
      fitEvaluation: buildFitEvaluation(match.title, pipeline, match.salaryExpectation),
      transferableStrengths: relevantSignals.map((signal) => `${signal.mapsTo}: ${signal.why}`),
      likelyRecruiterConcerns: [
        ...match.concerns,
        ...buildRecruiterConcernNotes(relevantSignals, match.title)
      ].slice(0, 4)
    };
  });
}

export function buildCareerCoachReasoningPipeline(input: CareerCoachInput): CareerCoachReasoningPipeline {
  const text = Object.values(input).join("\n");
  const extraction = extractTransferableSkillProfile(text);
  return {
    strengths: splitSignals(input.currentExperience),
    interests: splitSignals(input.interests),
    workPreferences: splitSignals(input.workPreferences),
    ambitionAndConstraints: splitSignals([
      input.lifestyleGoals,
      input.ambition,
      input.timeline,
      input.financialConstraints,
      input.learningTolerance,
      input.education
    ].filter(Boolean).join("\n")),
    extraction,
    professionalFunctions: extraction.professionalFunctions.map((item) => item.functionName)
  };
}

function buildFitEvaluation(
  title: string,
  pipeline: CareerCoachReasoningPipeline,
  salaryExpectation: string
): string[] {
  const functions = pipeline.professionalFunctions.slice(0, 3);
  const constraints = pipeline.ambitionAndConstraints.slice(0, 2);
  return [
    functions.length
      ? `Fit: ${title} is worth testing because your evidence points toward ${functions.join(", ")}.`
      : `Fit: ${title} is worth testing if you can prove communication, ownership, and follow-through.`,
    `Effort: The first lift is language and proof, then role-specific tools or terminology where gaps are real.`,
    `Cost: Start with free proof-building, informational interviews, and tool sandboxes before paying for programs.`,
    constraints.length
      ? `Constraints: ${constraints.join(" ")}`
      : `Timeline: Treat this as a staged transition, not a single resume edit.`,
    `Salary: ${salaryExpectation}`,
    `Risk: The biggest risk is sounding like a keyword match. The stronger move is to explain what you actually did, why it maps, and where you are still closing gaps.`
  ];
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
      ? `${signal.source} may map toward ${title} because it can contain ${signal.mapsTo}. ${signal.why} The opportunity is not to pretend the old role was the same job, but to show the employer the responsibility pattern underneath it.`
      : `${title} may fit if you can prove communication, ownership, practical judgment, and follow-through with concrete examples.`,
    constraint
      ? `Your stated constraints matter too: ${constraint.slice(0, 180)}. A good path should fit the life you are trying to build, not just the title.`
      : "The next step is proving the overlap with concrete examples, not broad claims."
  ].join(" ");
}

function careerMatchesTitle(candidate: string, title: string): boolean {
  const left = normalizeCareerWords(candidate);
  const right = normalizeCareerWords(title);
  if (!left.length || !right.length) return false;
  return left.some((word) => right.includes(word)) || right.some((word) => left.includes(word));
}

function normalizeCareerWords(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !["associate", "assistant", "coordinator", "manager", "specialist"].includes(word));
}
function splitSignals(value: string): string[] {
  return value
    .split(/[.;\n]+/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length >= 8)
    .slice(0, 6);
}


