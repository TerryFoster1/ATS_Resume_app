# Opportunity Workspace MVP

## Goal

Saved applications should feel like active opportunity workspaces. The user should be able to reopen a role and see materials, prep, status, recruiter notes, interviews, follow-ups, and offer context in one place.

## Current Implementation

- Saved output pages include an opportunity tracking panel.
- Data persists in `analysis_snapshot.opportunityTracking`.
- Dashboard cards show the current status, follow-up date, and whether offer details have been captured.
- Legacy records normalize safely into the new `Interested` status.

## Production Safety

No migration was required. The implementation does not touch auth, Stripe, credits, middleware, generation, unlocks, or saved-output ownership.

## Deferred

- Calendar integrations.
- Reminder notifications.
- Kanban board views.
- Recruiter contact import.
- Opportunity analytics.
- Browser extension ingestion.
