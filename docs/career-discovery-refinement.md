# Career Discovery Refinement

## Direction

Career discovery should feel conversational, practical, and confidence-building. It should not feel like a personality quiz or a school worksheet.

## Current Approach

The current goal-first onboarding includes a career discovery path that asks about:

- Interests
- Strengths
- Work preferences
- Energy and environment
- Ambition, income, lifestyle, learning, and transition constraints

The result becomes context for pathway exploration and can be saved to the Master Career Profile for authenticated users.

## Current Refinements

- Added live, lightweight pattern reads to the discovery flow.
- The flow now looks for relational, operational, analytical communication, work-environment, and progression motives.
- The experience stays framed as practical guidance rather than a personality test.
- Added a standalone Career Coach MVP at `/career-coach` for users who do not know what they want, need a transition, or are balancing income, lifestyle, learning, and timeline constraints.
- Added early transition logic in the discovery flow so users can see plausible directions before they already know the target role.
- Career Coach now explains why a path could be realistic, what recruiters will want proof of, likely challenges, AI disruption risk, and how existing experience can translate into target-role language.

## Career Coach MVP

The Career Coach flow asks conversational questions about:

- current experience
- interests
- work preferences
- lifestyle goals
- ambition and timeline
- learning tolerance
- budget constraints
- education

It returns top career matches with:

- why the path may fit
- broad salary expectations
- day-in-the-life summary
- AI disruption risk
- typical credentials
- fastest path
- lowest-cost path
- hiring outlook
- recruiter expectations
- likely challenges
- why the transition could be realistic
- transferable strengths
- likely recruiter concerns

Salary language remains intentionally broad and should be verified against current local market data before a user makes a major decision.

## Intelligence Quality Sprint - 2026-05-29

The latest refinement keeps Career Coach lightweight but makes its reasoning more recruiter-aware.

Implementation decisions:

- Reused the shared transferable-skill helper instead of adding another AI workflow or module.
- Expanded deterministic career signals for chef/kitchen, hospitality, retail, journalism, trades, teaching, school/community, side-hustle, and volunteer experience.
- Added explainability fields so recommendations show the mapped professional function, example evidence, recruiter language, and likely objections.
- Added career-match output sections for recruiter expectations, likely challenges, AI disruption risk, and why the path could be realistic.
- Kept salary language broad and cautious. Live salary data remains deferred.

The intended user moment is:

```text
I did not realize that experience could count that way.
```

Rather than:

```text
This is a generic career quiz result.
```

## Refinement Principles

- Ask about real patterns, not abstract identity labels.
- Translate plain-language answers into recruiter-readable strengths.
- Support uncertain users, students, laid-off workers, career changers, and burned out professionals.
- Avoid false certainty or psychometric claims.
- Explain why a recommendation was made, especially when Career Ladder infers a transferable skill or adjacent career.
- Keep recommendations grounded in evidence the user actually provided.

## Future Expansion

- Adaptive follow-up questions
- Suggested adjacent roles
- Explainable transferable skill maps
- Pathway comparisons grounded in the Master Career Profile
- Contextual learning recommendations when real gaps are identified

## Validation

- `npm.cmd run build`: passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd audit`: passed with 0 vulnerabilities.
- Local smoke covered homepage, Career Coach, intake, resume-first, pricing, career discovery, career transition, application tracking, dashboard redirect, profile redirect, admin redirect, sitemap, anonymous promo-code API access, and anonymous admin API access.
- `npm.cmd run lint` is not configured for this project and prompts for interactive ESLint setup, so it was not completed in this pass.
