// Role/title mappings used to position resume experience for a target job
// without renaming official titles (handoff §20).
//
// Pattern: keep the official title, add a positioning subtitle that uses
// target-role language when supported by evidence.
//
// Example:
//   actual title:     "Customer Service Representative"
//   target context:   account management role
//   positioning line: "Client Relationship Management | Account Support |
//                      CRM-Based Customer Operations"
//
// The rewrite engine reads this catalogue to suggest positioning lines.
// It must NOT rename the title itself.

import type { ClusterId } from "./skillClusters";

export interface RolePositioningPattern {
  // Loose match against the actual job title (lowercased substring).
  titlePattern: string;
  // Cluster IDs the role typically demonstrates evidence for.
  typicalClusters: ClusterId[];
  // Phrasing fragments suitable for a positioning subtitle. The rewrite
  // engine picks 2-3 that are supported by both the resume evidence and the
  // target JD's clusters.
  positioningFragments: string[];
}

export const ROLE_POSITIONING_PATTERNS: RolePositioningPattern[] = [
  {
    titlePattern: "customer service",
    typicalClusters: ["CLIENT_FACING", "TECHNICAL_SUPPORT", "CRM_PIPELINE"],
    positioningFragments: [
      "Client Relationship Management",
      "Account Support",
      "Customer Operations",
      "CRM-Based Customer Operations",
      "Issue Resolution",
      "Stakeholder Communication"
    ]
  },
  {
    titlePattern: "sales",
    typicalClusters: [
      "ACCOUNT_GROWTH",
      "CLIENT_FACING",
      "CRM_PIPELINE",
      "PROFITABILITY"
    ],
    positioningFragments: [
      "Consultative Sales",
      "Client Relationship Management",
      "Account Growth",
      "Pipeline Ownership",
      "Revenue Contribution",
      "New Business Development"
    ]
  },
  {
    titlePattern: "account",
    typicalClusters: [
      "ACCOUNT_GROWTH",
      "CLIENT_FACING",
      "CRM_PIPELINE",
      "PROJECT_MANAGEMENT"
    ],
    positioningFragments: [
      "Account Management",
      "Client Retention",
      "Renewals & Expansion",
      "Cross-Functional Coordination",
      "Pipeline Management"
    ]
  },
  {
    titlePattern: "project",
    typicalClusters: ["PROJECT_MANAGEMENT", "OPERATIONS"],
    positioningFragments: [
      "Concurrent Project Delivery",
      "Cross-Functional Coordination",
      "Vendor & Timeline Management",
      "Workflow Ownership"
    ]
  },
  {
    titlePattern: "operations",
    typicalClusters: ["OPERATIONS", "PROJECT_MANAGEMENT", "PROFITABILITY"],
    positioningFragments: [
      "Operations Coordination",
      "Vendor Management",
      "Process Improvement",
      "Cost Control"
    ]
  },
  {
    titlePattern: "manager",
    typicalClusters: ["PEOPLE_LEADERSHIP", "PROJECT_MANAGEMENT", "OPERATIONS"],
    positioningFragments: [
      "People Leadership",
      "Cross-Functional Coordination",
      "Performance Ownership"
    ]
  },
  {
    titlePattern: "coordinator",
    typicalClusters: ["PROJECT_MANAGEMENT", "OPERATIONS", "CLIENT_FACING"],
    positioningFragments: [
      "Workflow Coordination",
      "Cross-Functional Liaison",
      "Stakeholder Communication"
    ]
  },
  {
    titlePattern: "specialist",
    typicalClusters: ["WRITING_COMMUNICATION", "SALES_ENABLEMENT"],
    positioningFragments: ["Subject-Matter Specialist", "Cross-Functional Support"]
  },
  {
    titlePattern: "consultant",
    typicalClusters: ["CLIENT_FACING", "ACCOUNT_GROWTH"],
    positioningFragments: [
      "Consultative Sales",
      "Client Advisory",
      "Solution Discovery"
    ]
  },
  {
    titlePattern: "support",
    typicalClusters: ["TECHNICAL_SUPPORT", "CLIENT_FACING"],
    positioningFragments: [
      "Technical Support",
      "Issue Resolution",
      "Customer Advocacy"
    ]
  }
];

export function findPositioningPatterns(
  title: string
): RolePositioningPattern[] {
  const t = title.toLowerCase();
  return ROLE_POSITIONING_PATTERNS.filter((p) => t.includes(p.titlePattern));
}
