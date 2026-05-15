export const ANALYSIS_ARCHITECTURE_FIXTURES = [
  {
    name: "RECODemand role with Terry-style marketing resume",
    jobSignals: [
      "Must-have: Facebook Manager Experience",
      "Keep clean documentation in CRM and internal systems",
      "Track client progress and campaign performance",
      "Onboard and train clients"
    ],
    resumeSignals: [
      "marketing",
      "client communication",
      "social media",
      "analytics",
      "engagement",
      "entrepreneurship",
      "workflow and process exposure",
      "customer-facing communication",
      "content strategy"
    ],
    expected:
      "Semantic fit is not 0. Ask Meta Ads, CRM/documentation, campaign tracking, and onboarding/client follow-up clarification questions."
  },
  {
    name: "Strong semantic fit with missing education years",
    resumeSignals: [
      "client communication",
      "marketing campaigns",
      "analytics and performance tracking",
      "social media management",
      "customer success"
    ],
    structuralIssue: "Education entry has no year.",
    expected:
      "Semantic fit remains non-zero and structural dates are treated as optional ATS readability recommendations."
  },
  {
    name: "Facebook hard requirement outranks structure",
    jobSignal: "Must-have: Facebook Manager Experience",
    resumeSignal: "Social Media Management, Instagram, Facebook, LinkedIn, YouTube",
    expected:
      "Ask a high-priority Meta or Facebook Ads Manager clarification before soft-skill or structure prompts."
  },
  {
    name: "Social media without Meta Ads",
    jobSignal: "Facebook Ads Manager experience",
    resumeSignal: "Social media strategy, content campaigns, audience engagement, and digital marketing.",
    expected:
      "Treat as weak or moderate adjacent evidence and ask whether the candidate has managed Meta or Facebook advertising campaigns."
  },
  {
    name: "Client communication without onboarding keyword",
    jobSignal: "Onboard and train clients using a repeatable process.",
    resumeSignal: "Customer-facing communication, stakeholder updates, training content, and coordination.",
    expected:
      "Ask about onboarding clients, training customers, walking users through workflows, or recurring follow-up processes."
  },
  {
    name: "Analytics without dashboards",
    jobSignal: "Track client progress and campaign performance through dashboards and KPIs.",
    resumeSignal: "Analytics, engagement metrics, reporting, and performance tracking.",
    expected:
      "Ask about campaign performance, dashboards, KPIs, client progress, or reporting metrics."
  },
  {
    name: "CRM operational gap",
    jobSignal: "Keep clean documentation in CRM and internal systems.",
    resumeSignal: "No CRM or pipeline tracking evidence.",
    expected:
      "Ask about CRM records, client notes, follow-up trackers, pipeline updates, or internal documentation."
  },
  {
    name: "Partial analytics evidence",
    jobSignal: "Track client progress and campaign performance.",
    resumeSignal: "Analytics and Performance Tracking.",
    expected:
      "Treat as moderate evidence and ask a depth question only after harder gaps are handled."
  },
  {
    name: "Structural issue only",
    resumeSignal: "Strong role fit evidence, education date missing.",
    expected:
      "Do not lower fit dramatically. Show education date as optional ATS hygiene."
  },
  {
    name: "Unparsable resume",
    resumeSignal: "Random text without experience, education, tools, or responsibilities.",
    expected:
      "Weak fit or parser uncertainty is acceptable because both semantic evidence and structure are absent."
  }
] as const;
