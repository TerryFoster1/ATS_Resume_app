# Career Transition Intelligence

## Goal

Career Ladder should help users understand how real experience can translate into credible adjacent careers without exaggerating or inventing proof.

## Current Implementation

- Added a lightweight transferable-skill signal helper in `src/lib/careerIntelligence.ts`.
- Pathway previews can now fall back to shared transition signals instead of only local text matching.
- Career discovery and first-resume flows surface plain-language interpretations that show users why their experience may matter.
- Career Coach uses the same transition signals to recommend realistic adjacent paths.
- Transferable-skill signals now store recruiter language, evidence examples, adjacent careers, confidence level, and recruiter concerns.
- Career discovery can surface early transition ideas before the user already knows the target job.
- Pathway analysis receives detected transferable-skill signals and adjacent-transition logic as structured context.

## Recruiter-Aware Principles

- Explain why an experience maps to a role function.
- Separate true skill gaps from communication or evidence gaps.
- Use careful language when inference is involved.
- Avoid fake title inflation or invented metrics.
- Treat transition logic as current experience -> transferable functions -> adjacent careers -> gap analysis -> upskilling.
- Distinguish evidence gaps from actual ability gaps.

## Transition Examples

- Chef or kitchen experience can support operations management, inventory control, vendor coordination, workforce scheduling, staff training, quality control, and process optimization.
- Hospitality experience can support client management, service delivery, stakeholder communication, service recovery, and account support.
- Retail experience can support customer success, escalation handling, account support, and team coordination.
- Journalism or writing experience can support content strategy, research, messaging, and marketing coordination.
- Trades experience can support project coordination, vendor management, scheduling, stakeholder updates, and quality assurance.

## Intelligence Quality Sprint - 2026-05-29

The latest pass focused on making transferable-skill translation feel like Career Ladder's core intelligence rather than a small helper.

Changes:

- Expanded common transition patterns with richer explanations and evidence examples.
- Added `explainSkillMapping` for grounded "why this maps" language.
- Added `buildRecruiterConcernNotes` so outputs can name what hiring teams may doubt.
- Added `inferTransitionRecommendations` for easiest, fastest, highest-income, and lowest-risk adjacent path framing.
- Updated Career Coach to display recruiter expectations, likely challenges, AI disruption risk, and concrete transition logic.
- Updated Pathway generation prompts to include transferable signals and recruiter concerns directly.

Guardrails:

- Do not fabricate experience.
- Do not inflate titles.
- Use language such as "may support", "likely overlaps", and "can be framed as".
- Require evidence examples before leaning heavily on an inferred skill.

## Deferred

- User-confirmed inferred skill tags in the Master Career Profile.
- Role-to-role transition map UI.
- Deeper generated explanations per profile item.
- Career transition landing-page expansion by vertical.
- Live labor-market salary data.

## Validation

Build, typecheck, audit, and local route smoke checks passed after the transition-intelligence helper was added.
