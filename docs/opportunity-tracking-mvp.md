# Opportunity Tracking MVP

## Purpose

Career Ladder now treats saved records as hiring opportunities, not only generated AI outputs. The MVP adds a lightweight opportunity workspace on saved output pages so users can track hiring status, recruiter details, notes, interview rounds, follow-up timing, and offer context without introducing enterprise ATS complexity.

## Implementation Strategy

- Storage is additive and migration-free for this phase.
- Tracking data lives in `generated_outputs.analysis_snapshot.opportunityTracking`.
- `analysis_snapshot.applicationStatus` remains updated for dashboard compatibility.
- Existing saved outputs normalize safely. Legacy `Draft` maps to `Interested`.
- The dashboard reads the same snapshot data so pipeline status is visible without changing existing routes.

## Status Model

Supported statuses:

- Interested
- Applied
- Screening
- Interviewing
- Final Interview
- Offer
- Accepted
- Rejected
- Archived

## Production Safety

This pass did not alter auth, Stripe, credits, middleware, resume generation, cover letter generation, interview prep generation, pathway generation, or saved-output ownership checks.

## Validation

- `npm.cmd run build`: passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd audit`: passed with 0 vulnerabilities.
- Local smoke: `/`, `/?step=intake`, `/?step=resume`, `/pricing`, and `/application-tracking` returned 200.
- Local smoke: `/dashboard` and `/profile` redirected anonymous users to auth.
- Local smoke: unauthenticated `/api/outputs/test-id/tracking` returned 401.

## Deferred

- Calendar reminders
- Email follow-up automation
- Recruiter contact import
- Kanban boards
- Cross-opportunity analytics
- Browser-extension autofill

Those can build on the same opportunity snapshot model later.
