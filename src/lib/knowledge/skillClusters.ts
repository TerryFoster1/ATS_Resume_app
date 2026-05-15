// Semantic skill clusters.
//
// Source of truth: handoff §14.
//
// A "cluster" is a named bucket of semantically equivalent or
// transferable terms. The analysis engine uses clusters in two places:
//
//   1. interpretRequirements: when the JD says "client-facing experience",
//      we tag the requirement with the CLIENT_FACING cluster.
//   2. extractResumeEvidence: when a resume bullet mentions "managed
//      customer accounts", we tag that evidence with the CLIENT_FACING and
//      ACCOUNT_GROWTH clusters.
//
// matchRequirements then asks "does any evidence share a cluster with this
// requirement?" — that's the semantic / transferable bridge that prevents
// the false negatives the previous keyword-matching engine produced
// (e.g. flagging "2-3 years client-facing experience" as MISSING when
// the resume showed 10+ years of customer service and sales).
//
// The terms below are deliberate and conservative. The LLM is allowed to
// recognise additional synonyms during interpretation, but anything in the
// keywords list here triggers the cluster automatically — these are
// "always counts" terms.

export type ClusterId =
  | "CLIENT_FACING"
  | "ACCOUNT_GROWTH"
  | "SALES_ENABLEMENT"
  | "PROJECT_MANAGEMENT"
  | "PROFITABILITY"
  | "CRM_PIPELINE"
  | "OPERATIONS"
  | "PEOPLE_LEADERSHIP"
  | "DATA_ANALYSIS"
  | "WRITING_COMMUNICATION"
  | "TECHNICAL_SUPPORT";

export interface SkillCluster {
  id: ClusterId;
  label: string;
  // What this cluster covers — used to prompt the LLM during requirement
  // interpretation and evidence extraction.
  description: string;
  // Resume-side phrases. Presence of any of these is enough for the
  // evidence to belong to this cluster.
  resumeSignals: string[];
  // JD-side phrases. Presence of any of these is enough for the requirement
  // to map to this cluster.
  jdSignals: string[];
}

export const SKILL_CLUSTERS: SkillCluster[] = [
  {
    id: "CLIENT_FACING",
    label: "Client-Facing",
    description:
      "Direct interaction with customers, clients, accounts, or stakeholders.",
    resumeSignals: [
      "customer service",
      "customer support",
      "client support",
      "client liaison",
      "client communication",
      "stakeholder communication",
      "consultative selling",
      "consultative sales",
      "needs discovery",
      "primary point of contact",
      "post-sale support",
      "relationship management",
      "account management",
      "account support",
      "customer success",
      "handling customer inquiries",
      "resolving customer issues",
      "front desk",
      "front-of-house",
      "guest services",
      "client meetings",
      "customer-facing"
    ],
    jdSignals: [
      "client-facing",
      "customer-facing",
      "direct customer interaction",
      "client communication",
      "customer success",
      "account management",
      "relationship management",
      "primary point of contact",
      "stakeholder management"
    ]
  },
  {
    id: "ACCOUNT_GROWTH",
    label: "Business Development / Account Growth",
    description:
      "Sales, account expansion, lead generation, pipeline ownership, and revenue contribution.",
    resumeSignals: [
      "sales",
      "revenue generation",
      "upsell",
      "upselling",
      "cross-sell",
      "cross-selling",
      "lead generation",
      "prospecting",
      "proposal development",
      "client acquisition",
      "account expansion",
      "pipeline management",
      "follow-up management",
      "closed deals",
      "closing deals",
      "quote development",
      "quoting",
      "managed accounts",
      "supported sales growth",
      "drove revenue",
      "expanded accounts",
      "new business",
      "renewals"
    ],
    jdSignals: [
      "business development",
      "account growth",
      "pipeline support",
      "revenue expansion",
      "sales development",
      "growth ownership",
      "new business",
      "account expansion",
      "drive revenue",
      "grow accounts",
      "upsell",
      "cross-sell"
    ]
  },
  {
    id: "SALES_ENABLEMENT",
    label: "Sales Enablement",
    description:
      "Materials, training, and tooling that help sales or partners sell better.",
    resumeSignals: [
      "sales materials",
      "pitch decks",
      "partner resources",
      "sales funnels",
      "automated funnels",
      "onboarding materials",
      "trained partners",
      "supported sales",
      "customer-facing collateral",
      "product education",
      "sales scripts",
      "marketing/sales assets",
      "marketing collateral",
      "playbooks"
    ],
    jdSignals: [
      "sales enablement",
      "partner enablement",
      "revenue support",
      "go-to-market",
      "sales collateral",
      "sales operations",
      "sales playbooks"
    ]
  },
  {
    id: "PROJECT_MANAGEMENT",
    label: "Project / Workflow Management",
    description:
      "Coordinating multiple workstreams, deadlines, vendors, or deliverables at once.",
    resumeSignals: [
      "managed multiple clients",
      "managed multiple accounts",
      "coordinated timelines",
      "handled multiple projects",
      "managed custom orders",
      "vendor coordination",
      "installation coordination",
      "operations management",
      "concurrent workflows",
      "cross-functional coordination",
      "delivery management",
      "scheduling",
      "managed deadlines",
      "tracked deliverables",
      "managed orders",
      "project coordination",
      "workflow management"
    ],
    jdSignals: [
      "project management",
      "manage multiple",
      "concurrent projects",
      "workflow coordination",
      "client delivery",
      "operations coordination",
      "cross-functional execution",
      "manage deadlines",
      "manage deliverables"
    ]
  },
  {
    id: "PROFITABILITY",
    label: "Profitability / Business Performance",
    description:
      "Budget, margin, pricing, and commercial outcomes.",
    resumeSignals: [
      "budget tracking",
      "cost control",
      "margin management",
      "pricing",
      "revenue tracking",
      "scope management",
      "operational efficiency",
      "business performance",
      "sales targets",
      "p&l",
      "profit and loss",
      "cost optimization",
      "profitability",
      "commercial ownership"
    ],
    jdSignals: [
      "profitability",
      "margin",
      "business results",
      "financial performance",
      "commercial ownership",
      "budget accountability",
      "p&l",
      "cost control"
    ]
  },
  {
    id: "CRM_PIPELINE",
    label: "CRM / Pipeline",
    description:
      "Use of CRM systems or equivalent tracking systems for customers/leads.",
    resumeSignals: [
      "crm",
      "customer database",
      "lead tracking",
      "follow-up management",
      "pipeline tracking",
      "account tracking",
      "hubspot",
      "salesforce",
      "zoho",
      "pipedrive",
      "airtable",
      "jobber",
      "servicetitan",
      "monday.com",
      "customer records",
      "contact management",
      "spreadsheet for customers",
      "spreadsheet for leads"
    ],
    jdSignals: [
      "crm",
      "pipeline management",
      "account tracking",
      "customer database",
      "sales operations",
      "salesforce",
      "hubspot"
    ]
  },
  {
    id: "OPERATIONS",
    label: "Operations",
    description:
      "Running day-to-day execution: scheduling, inventory, vendors, logistics.",
    resumeSignals: [
      "operations",
      "scheduling",
      "inventory",
      "logistics",
      "vendor management",
      "supplier management",
      "procurement",
      "fulfillment",
      "shipping",
      "receiving"
    ],
    jdSignals: [
      "operations",
      "logistics",
      "vendor management",
      "scheduling",
      "supply chain"
    ]
  },
  {
    id: "PEOPLE_LEADERSHIP",
    label: "People Leadership",
    description:
      "Leading, training, mentoring, or supervising team members.",
    resumeSignals: [
      "managed a team",
      "led a team",
      "supervised",
      "mentored",
      "coached",
      "trained staff",
      "team lead",
      "shift lead",
      "department head",
      "direct reports",
      "people manager"
    ],
    jdSignals: [
      "lead a team",
      "manage a team",
      "people management",
      "supervise",
      "team leadership",
      "direct reports",
      "mentor"
    ]
  },
  {
    id: "DATA_ANALYSIS",
    label: "Data / Reporting",
    description:
      "Pulling, analysing, and reporting on data to drive decisions.",
    resumeSignals: [
      "reporting",
      "dashboards",
      "data analysis",
      "analytics",
      "kpi tracking",
      "metrics",
      "sql",
      "google analytics",
      "tableau",
      "power bi",
      "excel pivot",
      "spreadsheet analysis"
    ],
    jdSignals: [
      "data analysis",
      "reporting",
      "analytics",
      "dashboards",
      "kpis",
      "sql",
      "tableau",
      "power bi"
    ]
  },
  {
    id: "WRITING_COMMUNICATION",
    label: "Writing / Communication",
    description:
      "Producing written materials — emails, copy, proposals, documentation.",
    resumeSignals: [
      "wrote",
      "writing",
      "copywriting",
      "documentation",
      "proposals",
      "emails",
      "newsletters",
      "blog posts",
      "internal communications",
      "external communications"
    ],
    jdSignals: [
      "writing",
      "written communication",
      "copywriting",
      "documentation",
      "proposals",
      "communication skills"
    ]
  },
  {
    id: "TECHNICAL_SUPPORT",
    label: "Technical Support / Troubleshooting",
    description:
      "Diagnosing and resolving technical issues for users or systems.",
    resumeSignals: [
      "troubleshooting",
      "technical support",
      "help desk",
      "tier 1 support",
      "tier 2 support",
      "incident resolution",
      "diagnosed",
      "resolved technical"
    ],
    jdSignals: [
      "technical support",
      "troubleshooting",
      "help desk",
      "incident resolution"
    ]
  }
];

const CLUSTERS_BY_ID = new Map(SKILL_CLUSTERS.map((c) => [c.id, c]));

export function getCluster(id: ClusterId): SkillCluster | undefined {
  return CLUSTERS_BY_ID.get(id);
}

// Lower-cased signal lookup. Used by deterministic helpers that scan
// resume/JD text for cluster matches without invoking the LLM.
export function findClustersInText(
  text: string,
  side: "resume" | "jd"
): ClusterId[] {
  const lowered = text.toLowerCase();
  const hit: ClusterId[] = [];
  for (const cluster of SKILL_CLUSTERS) {
    const signals = side === "resume" ? cluster.resumeSignals : cluster.jdSignals;
    if (signals.some((s) => lowered.includes(s))) {
      hit.push(cluster.id);
    }
  }
  return hit;
}

// Cluster catalogue formatted for inclusion in LLM prompts. Compact form so
// it doesn't dominate the prompt budget.
export function formatClustersForPrompt(): string {
  return SKILL_CLUSTERS.map(
    (c) => `- ${c.id}: ${c.description}`
  ).join("\n");
}
