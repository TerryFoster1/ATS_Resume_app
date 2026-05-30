# Transferable Skill Intelligence

## Core Principle

Career Ladder should infer professional functions behind real experience without fabricating claims. The system should help users understand how their work can translate into recruiter-readable language.

## Examples

- Chef to operations: inventory planning, vendor coordination, workflow control, quality standards, scheduling, team leadership.
- Retail to customer success: escalation handling, relationship management, retention instincts, coaching, service recovery.
- Hospitality to account management: client service, expectation management, follow-through, communication under pressure.
- Journalism to content strategy: audience analysis, deadlines, interviewing, research, editorial planning.
- Trades to project coordination: sequencing, safety, documentation, vendor coordination, site communication.

## Guardrails

Use careful language:

- "Your experience may support..."
- "This likely overlaps with..."
- "This can be framed as..."
- "If accurate, this could support..."

Do not inflate titles, invent tools, or claim formal experience the user did not provide.

## Platform Touchpoints

- Master Career Profile stores facts and future inferred skill mappings.
- Resume generation can select relevant inferred functions for target roles.
- Pathway analysis can identify adjacent careers based on skill overlap.
- Interview prep can warn where the user needs examples to prove the transition.
- Opportunity tracking can preserve recruiter concerns discovered during the process.

## Implementation Update - 2026-05-30

Career Ladder now has a dedicated transferable-skill extraction layer:

```text
src/lib/transferableSkillExtraction.ts
```

It separates:

- explicit skills: what the user says directly
- implicit skills: what recruiters may infer from evidence
- professional functions: operations, relationship management, leadership, project coordination, analytical communication, service recovery
- adjacent careers
- recruiter concerns
- evidence notes

The Master Career Profile stores this intelligence without a schema migration:

- inferred skill labels are added to `skills`
- explainable inference notes are added to `discoveryNotes`

This keeps the profile additive and backward-compatible while making future outputs more persistent and profile-aware.

Current consumers:

- resume import enrichment
- manual profile entries
- My First Resume
- Career Discovery
- Career Coach
- Career Pathways
- Interview Prep
- Mock Interviews

The core rule remains: inference must be grounded in user evidence and explain why the mapping is plausible.
