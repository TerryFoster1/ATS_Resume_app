# Career Pathway MVP

Implemented: 2026-05-26

## Goal

Create a lightweight, useful, recruiter-aware Career Pathway flow without building a giant career ontology, migration-heavy schema, or labor-market intelligence system.

The MVP is meant to validate:

- user interest
- conversion potential
- SEO acquisition potential
- appetite for personalized career guidance

## User Flow

In the intent-first workflow, users can now choose:

```text
Career Pathway
```

The intake screen accepts:

- target role / job title
- optional company
- optional full job posting
- optional current background / experience text

Resume upload is not required.

## Architecture Decisions

### Existing opportunity model reused

Career Pathway records use the existing `generated_outputs` table to avoid a migration.

The saved record stores:

- empty resume text
- empty cover letter text
- source job context
- `analysis_snapshot.workflowIntent = "careerPathway"`
- `analysis_snapshot.opportunityOnly = true`
- `analysis_snapshot.pathway`

This keeps dashboard and saved-output reopening compatible with existing persistence.

### Pathway logic

Pathway helpers live in:

```text
src/lib/pathway.ts
```

The MVP has two layers:

- deterministic free preview
- AI-generated unlocked analysis

The AI prompt is structured and constrained to avoid:

- fake salary promises
- unrealistic "instant career change" claims
- hallucinated experience
- giant motivational text dumps

## Free vs Locked Sections

Free preview:

- high-level role overview
- common requirements
- one transferable strength insight

Locked / premium:

- typical requirements
- transferable strengths
- likely skill gaps
- fastest path recommendations
- lowest-cost path recommendations
- suggested next steps

## Monetization Logic

Unlocking the personalized pathway analysis uses the existing credit architecture:

```text
1 credit
```

Endpoint:

```text
POST /api/outputs/[id]/pathway
```

The route:

- requires signed-in Supabase user
- checks existing saved output ownership
- returns existing full pathway without charging again
- checks credit balance
- consumes exactly 1 credit when generating the full analysis
- stores the result in `analysis_snapshot.pathway`

No Stripe products, prices, checkout routes, or webhook logic were changed.

## Saved Opportunity Behavior

Saved pathway records:

- reopen from the dashboard
- show no blank resume or cover letter panels
- show pathway preview or unlocked status
- can coexist with interview prep and mock interview state

Dashboard cards now surface pathway status:

- not started
- preview
- unlocked

## Future Expansion Ideas

- Add dedicated pathway SEO pages such as:
  - `/career-pathways/how-to-become-an-account-manager`
  - `/career-transitions/chef-to-operations-manager`
  - `/career-transitions/journalism-to-marketing`
- Add lightweight role templates for common jobs.
- Let users add a resume later for stronger personalized gap comparison.
- Add optional course/certification recommendations.
- Add clear affiliate disclosure if course recommendations are monetized later.

## Intentionally Deferred

- database migration for a first-class opportunities table
- full career ontology
- labor-market API integration
- live salary data
- affiliate links
- course marketplace
- complex progression analytics
- new Stripe pricing or products

## Validation

Commands run from `src`:

```powershell
npm.cmd run build
npm.cmd run typecheck
```

Results:

- Build: PASS
- Typecheck: PASS

Smoke checks:

- Existing home, intake, and resume routes still render.
- Anonymous pathway opportunity creation returns `401 Sign in required`, matching the existing account-backed saved opportunity model.
- Build output includes `POST /api/outputs/[id]/pathway`.
