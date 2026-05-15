// Hard-requirement tool mappings.
//
// When a JD names a specific tool/platform that the resume doesn't list,
// the matcher should generate CLARIFY (handoff §15 + §16) — not MISSING.
//
// This file lists known tools by category so the matcher can produce a
// useful clarification question like:
//   "Have you used Salesforce, HubSpot, Zoho, Pipedrive, or another CRM?"
// instead of just:
//   "Have you used Salesforce?"

export interface ToolCategory {
  id: string;
  label: string;
  // Synonyms for the category itself ("CRM", "customer database").
  categorySignals: string[];
  // Specific tools in this category.
  tools: string[];
}

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: "crm",
    label: "CRM",
    categorySignals: ["crm", "customer database", "contact database"],
    tools: [
      "Salesforce",
      "HubSpot",
      "Zoho",
      "Pipedrive",
      "Jobber",
      "ServiceTitan",
      "Airtable",
      "Monday.com",
      "Microsoft Dynamics",
      "Zendesk Sell"
    ]
  },
  {
    id: "marketing_automation",
    label: "Marketing Automation",
    categorySignals: ["marketing automation", "email marketing"],
    tools: ["Mailchimp", "Klaviyo", "ActiveCampaign", "Constant Contact", "Marketo"]
  },
  {
    id: "project_management",
    label: "Project Management",
    categorySignals: ["project management software", "task management"],
    tools: ["Asana", "Jira", "Trello", "Monday.com", "ClickUp", "Notion", "Basecamp"]
  },
  {
    id: "data_bi",
    label: "Data / BI",
    categorySignals: ["business intelligence", "bi tool", "data visualization"],
    tools: ["Tableau", "Power BI", "Looker", "Google Data Studio", "Sigma", "Mode"]
  },
  {
    id: "data_query",
    label: "Database / Query",
    categorySignals: ["database", "query language"],
    tools: ["SQL", "Postgres", "MySQL", "BigQuery", "Snowflake", "Redshift"]
  },
  {
    id: "analytics",
    label: "Analytics",
    categorySignals: ["web analytics", "product analytics"],
    tools: ["Google Analytics", "Mixpanel", "Amplitude", "Heap", "Adobe Analytics"]
  },
  {
    id: "design",
    label: "Design",
    categorySignals: ["design software"],
    tools: ["Figma", "Sketch", "Adobe XD", "Photoshop", "Illustrator", "Canva"]
  },
  {
    id: "communications",
    label: "Communications",
    categorySignals: ["team communications", "messaging platform"],
    tools: ["Slack", "Microsoft Teams", "Zoom", "Google Meet"]
  },
  {
    id: "office",
    label: "Office Suite",
    categorySignals: [
      "office suite",
      "microsoft office",
      "google workspace",
      "common productivity tools",
      "productivity tools"
    ],
    tools: [
      "Microsoft Excel",
      "Microsoft Word",
      "Microsoft PowerPoint",
      "Google Sheets",
      "Google Docs",
      "Google Slides"
    ]
  }
];

// Find which category a given input belongs to.
//
// Three lookup strategies tried in order:
//   1. Match by category id ("crm", "design", ...).
//   2. Exact tool-name match (case-insensitive).
//   3. Scan the input as free text — find a tool name or category signal
//      anywhere in it.
//
// Returns undefined if nothing matches.
export function findToolCategory(input: string): ToolCategory | undefined {
  const raw = input.trim();
  if (!raw) return undefined;
  const lower = raw.toLowerCase();

  // 1. By category id.
  const byId = TOOL_CATEGORIES.find((c) => c.id.toLowerCase() === lower);
  if (byId) return byId;

  // 2. Exact tool-name match.
  const byTool = TOOL_CATEGORIES.find((cat) =>
    cat.tools.some((x) => x.toLowerCase() === lower)
  );
  if (byTool) return byTool;

  // 3. Free-text scan — any tool name or category signal appears in input.
  return TOOL_CATEGORIES.find(
    (cat) =>
      cat.tools.some((t) => lower.includes(t.toLowerCase())) ||
      cat.categorySignals.some((s) => lower.includes(s.toLowerCase()))
  );
}

// Given a tool name OR category id, return sibling tools useful in a
// clarification question. For a tool name, excludes the tool itself.
// For a category id, returns all tools in the category.
export function siblingTools(toolOrCategoryId: string, max = 5): string[] {
  const cat = findToolCategory(toolOrCategoryId);
  if (!cat) return [];
  const lower = toolOrCategoryId.toLowerCase();
  return cat.tools
    .filter((t) => t.toLowerCase() !== lower)
    .slice(0, max);
}

// Build a clarification question for a missing named tool, using sibling
// tools from the same category when available.
//
// Accepts either a tool name (e.g., "Salesforce") or a category id
// (e.g., "crm"). For the category-id form the question is phrased
// generically ("Which CRM have you used — Salesforce, HubSpot, ...?").
export function clarifyToolQuestion(toolOrCategoryId: string): string {
  const cat = findToolCategory(toolOrCategoryId);
  const sibs = siblingTools(toolOrCategoryId, 4);

  // Was the input a category id (vs. a specific tool)? If yes, ask
  // generically.
  const isCategoryId =
    cat?.id.toLowerCase() === toolOrCategoryId.toLowerCase();

  if (isCategoryId && cat) {
    return `Which ${cat.label} have you used — ${cat.tools
      .slice(0, 4)
      .join(", ")}, or another?`;
  }

  if (sibs.length > 0) {
    return `Have you used ${toolOrCategoryId} specifically, or another ${
      cat?.label ?? "comparable system"
    } such as ${sibs.join(", ")}?`;
  }
  return `Have you used ${toolOrCategoryId}, or a comparable system you can name?`;
}
