# Career discovery foundations

Implemented foundation: 2026-05-26

## Goal

Career Ladder now has a lightweight foundation for users who do not yet know what role they want.

This is distinct from the job-specific flow:

```text
I know the role -> paste target role/posting -> choose service
```

Career discovery supports:

```text
I do not know what I should do -> explore strengths, interests, preferences, and realistic adjacent paths
```

## Product philosophy

Career discovery should be conversational and practical, not fake psychometrics.

It should not become:

- a Myers-Briggs clone
- a giant personality quiz
- a promise engine
- generic motivational career advice

It should help users notice:

- interests
- strengths
- work preferences
- energy patterns
- structure versus ambiguity tolerance
- people-facing versus focused work preferences
- realistic adjacent paths

## Phase 1 UX

The goal-first onboarding flow now includes:

```text
Discover Career Direction
```

It asks lightweight prompts about:

- interests
- strengths
- work preferences
- energy and lifestyle patterns

The result becomes current-background context for the Career Pathway flow, where users can continue exploring possible target roles.

## Profile integration

The server API supports:

```text
POST /api/career-profile
action: careerDiscovery
```

This stores discovery notes, interests, goals, and inferred broad skills in the Master Career Profile for signed-in users.

## Career transition strategy

Career discovery and pathway analysis should increasingly explain why transitions are realistic.

High-value transition families:

- retail to customer success
- hospitality to operations
- journalism to marketing
- service industry to account management
- trades to project coordination

The explanation should focus on transferable proof:

- customer retention
- conflict resolution
- operational follow-through
- stakeholder communication
- reporting
- prioritization
- handoffs
- workflow discipline

## Student and workforce-transition strategy

Career discovery should support:

- students
- laid-off workers
- career changers
- burned out professionals
- workers returning after a gap
- people with informal or under-framed experience

The product should still feel professional-grade and lifelong, not student-only.

## What was intentionally deferred

- no role recommendation engine
- no labor-market API integration
- no course recommendation marketplace
- no school account system
- no teacher dashboard
- no psychometric scoring
- no new monetization model

## Future improvements

- connect discovery notes directly into pathway suggestions
- build a lightweight adjacent-role recommendation layer
- add low-cost and fastest-path comparison per transition
- let users save multiple possible paths
- add guidance counselor and teacher workflows later

## Validation

- `npm.cmd run typecheck`: PASS
- `npm.cmd run build`: PASS
- `/?step=intake`: returned `200` in local production smoke testing
- `/profile`: returned an anonymous auth redirect, confirming profile memory is account-backed
