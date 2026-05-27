# Offer Comparison MVP

## Purpose

Offer comparison should help users make thoughtful career decisions without pretending Career Ladder can predict exact outcomes. The MVP captures structured offer details inside each opportunity workspace.

## Captured Fields

- Salary
- Bonus
- Work model
- PTO
- Benefits
- Title
- Growth opportunity
- Commute
- Equity
- Career growth potential
- Notes

## Product Philosophy

Offer comparison is strategic, not deterministic. The UX nudges users to consider growth, flexibility, title trajectory, commute, and long-term fit alongside compensation.

## Implementation

- Offer details are stored in `analysis_snapshot.opportunityTracking.offer`.
- No new payment products, database migrations, or scoring systems were added.
- The dashboard indicates when offer details are captured.

## Validation

- Build and typecheck passed after implementation.
- The MVP is available inside the saved opportunity workspace and does not affect credit or checkout logic.
- Full side-by-side multi-offer comparison is intentionally deferred.

## Deferred

- Side-by-side multi-offer comparison
- Negotiation scripts
- Compensation benchmarking
- Total compensation calculators
- Long-term career goal weighting

These should remain recruiter-aware and transparent when added.
