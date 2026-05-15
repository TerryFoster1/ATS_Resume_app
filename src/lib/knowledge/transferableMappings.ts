// Transferable-experience mappings.
//
// These are the explicit "X satisfies Y" rules from handoff §14 — used by
// the decision-enforcement layer to upgrade MISSING → MATCH/PARTIAL when
// the resume's evidence is in the source bucket and the JD's requirement
// is in the target bucket.
//
// Format: every rule has a target (what the JD asks for) and a list of
// sources (what the resume can show that satisfies it). The matcher can
// also use lib/knowledge/skillClusters.ts; this file captures the higher-
// confidence direct mappings that are too specific to fit a cluster.

import type { ClusterId } from "./skillClusters";

export interface TransferableRule {
  // Cluster the JD requirement belongs to.
  jdCluster: ClusterId;
  // Clusters the resume evidence can belong to that should satisfy this
  // requirement.
  resumeClustersAccepted: ClusterId[];
  // Strength of the mapping. STRONG → MATCH; MODERATE → PARTIAL.
  strength: "STRONG" | "MODERATE";
  // Human-readable explanation surfaced as the reasoning string.
  rationale: string;
}

export const TRANSFERABLE_RULES: TransferableRule[] = [
  {
    jdCluster: "CLIENT_FACING",
    resumeClustersAccepted: ["CLIENT_FACING", "ACCOUNT_GROWTH", "TECHNICAL_SUPPORT"],
    strength: "STRONG",
    rationale:
      "Customer service, sales, account management, and customer support are direct client-facing functions."
  },
  {
    jdCluster: "ACCOUNT_GROWTH",
    resumeClustersAccepted: ["ACCOUNT_GROWTH", "CLIENT_FACING", "CRM_PIPELINE"],
    strength: "STRONG",
    rationale:
      "Sales, account management, CRM-driven follow-ups, and revenue-supporting work are transferable to business development and account growth."
  },
  {
    jdCluster: "SALES_ENABLEMENT",
    resumeClustersAccepted: ["SALES_ENABLEMENT", "WRITING_COMMUNICATION"],
    strength: "MODERATE",
    rationale:
      "Producing sales materials, pitch decks, partner resources, or onboarding materials maps to sales enablement."
  },
  {
    jdCluster: "PROJECT_MANAGEMENT",
    resumeClustersAccepted: ["PROJECT_MANAGEMENT", "OPERATIONS"],
    strength: "STRONG",
    rationale:
      "Coordinating multiple clients, vendors, timelines, orders, or installations is concurrent project management."
  },
  {
    jdCluster: "CRM_PIPELINE",
    resumeClustersAccepted: ["CRM_PIPELINE", "ACCOUNT_GROWTH", "CLIENT_FACING"],
    strength: "MODERATE",
    rationale:
      "Use of any customer database, lead tracker, or pipeline tool is transferable CRM experience."
  },
  {
    jdCluster: "PROFITABILITY",
    resumeClustersAccepted: ["PROFITABILITY", "OPERATIONS", "ACCOUNT_GROWTH"],
    strength: "MODERATE",
    rationale:
      "Budget tracking, pricing, scope management, and revenue contribution are evidence of commercial ownership."
  },
  {
    jdCluster: "PEOPLE_LEADERSHIP",
    resumeClustersAccepted: ["PEOPLE_LEADERSHIP"],
    strength: "STRONG",
    rationale:
      "People leadership requires direct evidence — supervising, training, or managing reports."
  },
  {
    jdCluster: "DATA_ANALYSIS",
    resumeClustersAccepted: ["DATA_ANALYSIS"],
    strength: "STRONG",
    rationale:
      "Reporting, dashboards, KPI tracking, or analytics tooling counts as data analysis evidence."
  },
  {
    jdCluster: "WRITING_COMMUNICATION",
    resumeClustersAccepted: ["WRITING_COMMUNICATION", "SALES_ENABLEMENT"],
    strength: "MODERATE",
    rationale:
      "Any written deliverables — emails, proposals, copy, documentation — count as written communication evidence."
  }
];

// Look up rules whose target matches `jdCluster`.
export function rulesFor(jdCluster: ClusterId): TransferableRule[] {
  return TRANSFERABLE_RULES.filter((r) => r.jdCluster === jdCluster);
}

// Format the rules table for inclusion in an LLM prompt. Compact form.
export function formatTransferableRulesForPrompt(): string {
  return TRANSFERABLE_RULES.map(
    (r) =>
      `- JD ${r.jdCluster} ← resume {${r.resumeClustersAccepted.join(", ")}} (${r.strength}): ${r.rationale}`
  ).join("\n");
}
