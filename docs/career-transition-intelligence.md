# Career Transition Intelligence

## Goal

Career Ladder should help users understand how real experience can translate into credible adjacent careers without exaggerating or inventing proof.

## Current Implementation

- Added a lightweight transferable-skill signal helper in `src/lib/careerIntelligence.ts`.
- Pathway previews can now fall back to shared transition signals instead of only local text matching.
- Career discovery and first-resume flows surface plain-language interpretations that show users why their experience may matter.

## Recruiter-Aware Principles

- Explain why an experience maps to a role function.
- Separate true skill gaps from communication or evidence gaps.
- Use careful language when inference is involved.
- Avoid fake title inflation or invented metrics.

## Transition Examples

- Hospitality or chef experience can support operations, quality control, service recovery, and workflow coordination.
- Retail experience can support customer success, escalation handling, account support, and team coordination.
- Journalism or writing experience can support content strategy, research, messaging, and marketing coordination.
- Trades experience can support project coordination, scheduling, stakeholder updates, and quality assurance.

## Deferred

- User-confirmed inferred skill tags in the Master Career Profile.
- Role-to-role transition map UI.
- Deeper generated explanations per profile item.
- Career transition landing-page expansion by vertical.

## Validation

Build, typecheck, audit, and local route smoke checks passed after the transition-intelligence helper was added.
