import type { RequirementIntent } from "./requirementIntentInterpreter";

export type RequirementIntentFixture = {
  jobText: string;
  expectedIntent: RequirementIntent;
  shouldAsk: boolean;
  expectedQuestionSignal?: string;
};

export const REQUIREMENT_INTENT_FIXTURES: RequirementIntentFixture[] = [
  {
    jobText: "Support brand strategy and build brand equity using consumer and market insights.",
    expectedIntent: "analytics_or_reporting",
    shouldAsk: true,
    expectedQuestionSignal: "insights"
  },
  {
    jobText: "Onboard and train clients using a proven script and framework.",
    expectedIntent: "customer_or_client_management",
    shouldAsk: true,
    expectedQuestionSignal: "onboarded"
  },
  {
    jobText: "Keep clean documentation in our CRM and internal systems.",
    expectedIntent: "tool_or_platform",
    shouldAsk: true,
    expectedQuestionSignal: "CRM"
  },
  {
    jobText: "Facebook Manager Experience",
    expectedIntent: "tool_or_platform",
    shouldAsk: true,
    expectedQuestionSignal: "Facebook Ads Manager"
  },
  {
    jobText: "RECODemand is a high-growth advertising + software company helping real estate agents and mortgage brokers scale using a proven webinar lead generation system.",
    expectedIntent: "metadata",
    shouldAsk: false
  },
  {
    jobText: "Track client progress and campaign performance",
    expectedIntent: "analytics_or_reporting",
    shouldAsk: true,
    expectedQuestionSignal: "campaign performance"
  },
  {
    jobText: "Can communicate clearly and confidently.",
    expectedIntent: "communication",
    shouldAsk: true,
    expectedQuestionSignal: "client communication"
  },
  {
    jobText: "Are smart, organized, and proactive.",
    expectedIntent: "workflow_experience",
    shouldAsk: true,
    expectedQuestionSignal: "workflows"
  },
  {
    jobText: "Join EY and help build a better working world.",
    expectedIntent: "company_mission",
    shouldAsk: false
  },
  {
    jobText: "Full-Time Temporary 15-month Contract.",
    expectedIntent: "metadata",
    shouldAsk: false
  },
  {
    jobText: "Mississauga, Ontario, Canada.",
    expectedIntent: "metadata",
    shouldAsk: false
  },
  {
    jobText: "People Leader, VP Product.",
    expectedIntent: "metadata",
    shouldAsk: false
  }
];
