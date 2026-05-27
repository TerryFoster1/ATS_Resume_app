# Offer Comparison Strategy

## Goal

Offer comparison should help users think clearly about tradeoffs without pretending to predict the future.

## Current MVP

The opportunity workspace captures:

- salary
- bonus
- work model
- PTO
- benefits
- title
- commute
- equity
- growth opportunity
- career growth potential
- notes

The UI now shows strategic tradeoff prompts when offer details are entered.

## Philosophy

Career Ladder should frame decisions around:

- total value
- sustainability
- growth
- trajectory
- skill compounding
- stability
- lifestyle fit

It should not make algorithmic claims that one offer is objectively best.

## Deferred

- Side-by-side multi-offer comparison.
- Compensation benchmarking.
- Negotiation guidance.
- Weighted decision preferences.
- Long-term career-goal fit scoring.

## Validation

The offer tradeoff prompts are deterministic client-side guidance and do not touch payments, credits, or generation. Build, typecheck, audit, and route smoke checks passed.
