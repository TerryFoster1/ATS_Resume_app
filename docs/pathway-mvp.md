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

In the goal-first workflow, users can now choose:

```text
Explore a Career Path
```

The orchestration flow asks users to choose the pathway service before requesting role details. This keeps the experience from feeling like a generic form and frames it as a career guidance service.

The pathway flow accepts:

- target role / job title
- optional company
- optional full job posting
- optional resume upload as the primary experience signal
- optional additional context text as a secondary signal

Resume upload is not required, but it is strongly encouraged. The resume gives Career Ladder real evidence for transferable strengths and likely gaps. The additional text area is only for context the resume may not explain, such as career changes, outdated resumes, or unlisted freelance work.

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
- optional `analysis_snapshot.jobContext.resumeText`
- optional `analysis_snapshot.jobContext.resumeFileName`

This keeps dashboard and saved-output reopening compatible with existing persistence.

Resume evidence is intentionally stored in `analysis_snapshot.jobContext` for opportunity-only records rather than `resume_text`. That prevents saved pathway records from rendering a resume document panel before the user has generated an actual tailored resume.

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

## Service Positioning

The pathway MVP should feel like a lightweight career intelligence service:

- free preview: high-level role expectations and one transferable insight
- premium unlock: personalized gap analysis and path recommendations for 1 credit

The UI should describe the value as unlocking a personalized pathway analysis, not simply spending a credit.

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
- Lint: NOT RUNNABLE without configuration. `npm.cmd run lint` opens Next.js' interactive ESLint setup prompt.

Smoke checks:

- Existing home, intake, and resume routes still render.
- Anonymous pathway opportunity creation returns `401 Sign in required`, matching the existing account-backed saved opportunity model.
- Build output includes `POST /api/outputs/[id]/pathway`.

## Production-readiness QA pass - 2026-05-26

Validated on commit `ed702a6` plus documentation-only QA fixes.

### Intent workflow checks

Local production checks confirmed:

- `/?step=intake` renders the role/posting intake screen.
- `/?step=intent` falls back safely to intake when no saved browser job context exists.
- `/?step=resume` still renders the old resume-first path.
- Company-only input is not sufficient to continue; the UI copy asks for a target role or enough of the job posting.
- Current background input is available for pathway context.

### Career Pathway checks

Anonymous API checks:

- `POST /api/opportunities` with `intent: "careerPathway"` returns `401 Sign in required`.
- `POST /api/outputs/fake-id/pathway` returns `401 Sign in required`.

Expected behavior:

- Signed-in users create a saved opportunity record.
- The saved output page displays the free pathway preview instead of blank resume/cover panels.
- Unlocking full pathway analysis costs 1 credit.
- Reopening an already-unlocked pathway returns the stored full analysis and should not consume another credit.
- Users without credits are routed through the existing pricing/checkout flow.

### Existing workflow checks

The build output still includes existing routes for:

- resume generation APIs
- interview prep
- mock interview
- unlock/export APIs
- checkout APIs
- dashboard and saved outputs

No Stripe, auth, middleware, resume generation, cover letter generation, or credit product logic was changed.

### Fixes made during QA

- Updated stale planning copy in `docs/intent-first-workflow.md` that still described Career Pathway as a disabled placeholder.

### Remaining known limitations

- Full signed-in credit-consumption verification was not run in this local documentation QA pass.
- Pathway records still reuse `generated_outputs` and `analysis_snapshot`; a first-class opportunities schema remains future work.
- The full pathway analysis depends on Anthropic availability and the existing server-side LLM configuration.

### Production deployment checklist

- Verify signed-in user with 0 credits sees the existing pricing path from pathway unlock.
- Verify signed-in user with credits can unlock full pathway analysis.
- Refresh saved output and confirm the unlocked pathway does not consume another credit.
- Confirm dashboard card shows `Pathway preview` or `Pathway unlocked`.

## Production deployment record - 2026-05-26

Application commit deployed: `ad0fc48456e1e9d71d6fd5a618471a1bd0d7a8c5`

Production URL: `https://www.careerladder.ca`

Deployment status:

- Vercel production deployment: Ready
- Deployment URL: `https://ats-resume-hmwgx7ml4-terryfoster1s-projects.vercel.app`

Validation:

- `npm.cmd run build`: PASS
- `npm.cmd run typecheck`: PASS after rerunning separately from the build
- `npm.cmd run lint`: NOT RUNNABLE without interactive ESLint setup

Production smoke evidence:

- `/?step=intake` returned `200`.
- `/?step=resume` returned `200`.
- `/pricing` returned `200`.
- `/auth` returned `200`.
- `/dashboard` redirected anonymous traffic to `/auth?next=/dashboard`.
- Vercel logs showed `/api/account/status` returning `200` during the smoke window.

Pathway-specific follow-up still recommended:

- Use a signed-in QA account with known credits to unlock a pathway analysis in production.
- Confirm refresh and dashboard reopen do not consume another credit.
- Confirm a 0-credit signed-in account sees the existing pricing path from pathway unlock.

## Goal-first UX refinement - 2026-05-26

The pathway entry point now appears as `Explore a Career Path` in the first service-selection screen.

UX decisions:

- The user chooses the pathway service before seeing role and experience fields.
- Role/company/posting context explains that the posting is used to compare experience against real hiring expectations.
- Resume upload is strongly encouraged as the primary experience signal.
- Additional context is secondary and intended for career-change notes, outdated resume caveats, or unlisted experience.

Storage behavior:

- Uploaded resume evidence for opportunity-only pathway records is stored in `analysis_snapshot.jobContext`.
- It is not stored as generated `resume_text`, so saved pathway records do not show a resume panel until an actual resume is generated.

Validation:

- `npm.cmd run build`: PASS
- `npm.cmd run typecheck`: PASS
- Local production checks confirmed the goal-first entry and old resume-first route still return `200`.
