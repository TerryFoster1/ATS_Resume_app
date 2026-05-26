# Intent-first workflow

Implementation date: 2026-05-26

## Goal

Career Ladder now has a safe orchestration layer above the existing resume workflow. The app can start with job context first, then let the user choose whether they want resume tailoring, resume plus cover letter, interview prep, mock interview practice, or a future skill-gap pathway.

This was implemented incrementally. The existing resume analysis, generation, saved outputs, auth, Stripe, credit, unlock, dashboard, and production routing systems were preserved.

For the broader long-term product and SEO/AEO/GEO direction, see `docs/product-trajectory.md`.

## New user flow

1. User starts from `/?step=intake`.
2. User enters one or more of:
   - target role / job title
   - company name optional
   - full job posting optional but recommended
3. User chooses an intent:
   - Tailor Resume
   - Resume + Cover Letter
   - Interview Prep
   - Mock Interview
   - Career Pathway
4. Resume intents route into the existing resume upload workflow with the job context preserved.
5. Interview Prep creates a saved opportunity from the job context and opens the saved output page with interview prep generation queued.
6. Mock Interview creates a saved opportunity from the job context and opens the existing interactive mock interview route with question generation queued.

## Files changed

- `src/app/page.tsx`
- `src/app/api/opportunities/route.ts`
- `src/components/JobIntentFlow.tsx`
- `src/components/MockInterviewClient.tsx`
- `src/components/ResumeWizard.tsx`
- `src/components/SavedOutputDocuments.tsx`
- `src/lib/intentWorkflow.ts`
- `src/lib/interviewPrep.ts`
- `src/lib/mockInterview.ts`
- `docs/intent-first-workflow.md`

## Integration approach

### Wizard orchestration

`ResumeWizard` now supports two additional steps:

- `intake`
- `intent`

The old resume-first route remains available:

```text
/?step=resume
```

The new start route is:

```text
/?step=intake
```

### Job context preservation

The new flow stores job context in session storage using:

```text
career-ladder:intent-job-context
```

This lets the app preserve target role, company, and posting through auth redirects for standalone interview prep or mock interview starts.

### Saved opportunity records

Standalone interview prep and mock interview still use the existing `generated_outputs` table to avoid a migration in this phase. The new API route:

```text
POST /api/opportunities
```

creates an account-backed saved opportunity with:

- `job_title`
- `company_name`
- `source_job_description`
- empty `resume_text`
- empty `cover_letter_text`
- `analysis_snapshot.workflowIntent`
- `analysis_snapshot.opportunityOnly = true`
- `analysis_snapshot.applicationStatus = "Draft"`

This keeps dashboard and saved-output reopening compatible with the current persistence model.

### Standalone interview prep

The existing interview prep endpoint is reused:

```text
POST /api/outputs/[id]/interview-prep
```

The prompt now supports job-context-only records. If no resume or cover letter exists yet, it generates role-based recruiter prep and frames candidate-specific examples as stories to prepare, not proven facts.

### Standalone mock interview

The existing mock interview route is reused:

```text
/outputs/[id]/interview
POST /api/outputs/[id]/mock-interview
```

The prompt now supports job-context-only records. If no resume or cover letter exists yet, it asks role-based questions and evaluates answers against the posting instead of assumed background.

## What was intentionally not changed

- No Stripe products or prices changed.
- No checkout flow changed.
- No webhook or credit fulfillment changed.
- No auth provider or Supabase auth behavior changed.
- No dashboard redesign was done.
- No database migration was added.
- No resume analysis or resume generation pipeline was rewritten.
- No cover letter generation pipeline was rewritten.
- No export or unlock entitlement logic was changed.
- Middleware and canonical routing were not changed.

## Credit behavior

This phase reuses existing credit logic:

- Interview prep generation uses the existing 1-credit interview prep endpoint.
- Mock interview generation uses the existing 1-credit mock interview start endpoint.
- Answering mock interview questions and viewing feedback do not consume additional credits.
- If the user lacks credits, the existing pricing redirect behavior is used.

## Validation

Commands run from:

```text
C:\Users\kathr\Documents\Claude CoWork Files\Projects\Apps\ats-resume-app\src
```

### Build

```powershell
npm.cmd run build
```

Result: PASS

Evidence:

```text
✓ Compiled successfully
✓ Generating static pages (25/25)
ƒ /api/opportunities
```

### Typecheck

```powershell
npm.cmd run typecheck
```

Result: PASS after build regenerated `.next/types`.

Note: running typecheck in parallel with a fresh build can fail in this repo because `tsconfig.json` includes `.next/types/**/*.ts` before the build has finished regenerating those files.

### Existing test script

```powershell
npm.cmd run test
```

Result: NOT RUNNABLE in this checkout

Evidence:

```text
error TS5058: The specified path does not exist: 'tsconfig.test.json'.
```

### Local production smoke checks

Started local production server:

```powershell
npm.cmd run start -- -p 3011
```

Checked new intake route:

```powershell
curl.exe -s "http://localhost:3011/?step=intake" --max-time 15 -o intent-intake.html
```

Result: PASS. Initial HTML contains:

```text
Prepare for the jobs you actually want.
Choose what to work on
```

Checked old resume-first route:

```powershell
curl.exe -s "http://localhost:3011/?step=resume" --max-time 15 -o old-resume.html
```

Result: PASS. Initial HTML still renders the existing resume upload step.

Checked anonymous opportunity creation:

```powershell
curl.exe -i -X POST http://localhost:3011/api/opportunities `
  -H "Content-Type: application/json" `
  --data "{\"targetRole\":\"Customer Success Manager\",\"intent\":\"interviewPrep\"}"
```

Result: PASS. Anonymous users are gated before saved standalone interview workflows:

```text
HTTP/1.1 401 Unauthorized
{"error":"Sign in required."}
```

## Focused QA polish pass - 2026-05-26

### Scope

This pass checked the new intent-first orchestration layer without changing Stripe, auth, middleware, dashboard persistence, unlock logic, or the resume generation prompts.

### Entry point results

Local production server:

```powershell
npm.cmd run start -- -p 3013
```

Checked:

```powershell
curl.exe -s "http://localhost:3013/" --max-time 15
curl.exe -s "http://localhost:3013/?step=intake" --max-time 15
curl.exe -s "http://localhost:3013/?step=intent" --max-time 15
curl.exe -s "http://localhost:3013/?step=resume" --max-time 15
```

Results:

- `/` renders the updated homepage positioning and links into the new intake flow.
- `/?step=intake` renders the role/posting intake screen and "Choose what to work on" action.
- `/?step=intent` safely falls back to the intake screen when no prior job context exists, avoiding a blank intent screen.
- `/?step=resume` still renders the existing resume-first upload path.

### Bugs found and fixed

- Full-job-posting-only mode was allowed by the client intake screen, but `POST /api/opportunities` still required `targetRole`. The API now accepts either a target role or a sufficiently detailed posting and infers safer metadata when possible.
- Job context serialization emitted a blank `Job title:` line when the user pasted only a posting. Blank title lines are now omitted.
- Standalone mock interview credit redirects did not preserve the return path. The mock interview route now stores `/outputs/[id]/interview?start=1` before sending a no-credit user to pricing.
- Saved opportunity pages showed `Resume locked` and `Cover letter locked` badges even when no document had been generated yet. They now show `not generated` for opportunity-only records.
- Product-facing generation loading copy still used old validator-oriented wording. It now says "Running document structure checks."
- A Supabase OAuth setup doc still used the old product name. It now uses Career Ladder.

### Job context handoff checks

Verified by code path and local route/API smoke testing:

- Job title only: accepted by the intake screen and sent to resume, interview prep, or mock interview flows.
- Job title + company: accepted and preserved in composed job context.
- Full job posting only: now accepted by the standalone opportunity API, with title/company inferred when possible and a safe fallback if not.
- Title + company + posting: accepted and serialized into the shared job context for downstream workflows.

Anonymous API smoke checks still return `401 Sign in required`, which is expected because standalone interview prep/mock interview create saved records and use the existing credit model.

### Resume workflow regression check

The old route remains available at:

```text
/?step=resume
```

The local production smoke check confirmed it still renders the existing resume upload path. No resume upload, analyze, generate, unlock, export, Stripe, or cover letter logic was changed in this pass.

### Standalone interview prep and mock interview UX

- Anonymous users are routed through auth before creating saved standalone opportunities.
- Authenticated standalone records are saved as opportunity-only records with no empty resume or cover-letter panels.
- Saved output pages show opportunity context and interview actions instead of blank document previews.
- Mock interview generation preserves the pricing return path when credits are missing.

### Dashboard and saved-output behavior

- Opportunity-only records continue to use the existing `generated_outputs` model.
- Output page status badges now distinguish "not generated" from locked documents.
- Existing resume/cover-letter records continue to display document panels normally.

### Known limitations after QA

- Full browser automation against localhost was attempted with the in-app browser, but localhost navigation was blocked by the browser surface with `ERR_BLOCKED_BY_CLIENT`. Local production HTTP checks were used instead.
- The standalone interview flows still require sign-in because saved opportunity records and credits are account-backed.
- The long-term schema should eventually separate "opportunities" from generated document records instead of storing opportunity-only records in `generated_outputs`.
- Career Pathway is now live as a lightweight preview-plus-unlock workflow.
- Full end-to-end generation was not rerun in this focused pass because the request constrained changes away from core generation logic; the build and old route smoke checks confirmed the workflow was not structurally degraded.

### Recommended Phase 2 improvements

- Add explicit job-context metadata fields to the database instead of relying on `source_job_description` and `analysis_snapshot.jobContext`.
- Add an authenticated integration test for opportunity creation with posting-only input.
- Add a dashboard filter for opportunity-only records versus generated document records.
- Let users add a resume later to an existing interview-prep-only opportunity.

### Final validation after polish fixes

Commands run from `src`:

```powershell
npm.cmd run build
npm.cmd run typecheck
```

Results:

- Build: PASS
- Typecheck: PASS

Final local route smoke check:

```text
/             | intentCopy=True  | resumeFlow=True
/?step=intake | intentCopy=True  | chooseCopy=True
/?step=intent | intentCopy=True  | chooseCopy=True
/?step=resume | resumeFlow=True
```

Final anonymous opportunity API smoke check:

- Posting-only `POST /api/opportunities`: `401 Sign in required.`
- Title/company `POST /api/opportunities`: `401 Sign in required.`

The `401` results are expected for anonymous requests because standalone interview prep and mock interview records require a signed-in account.

## Known limitations

- Standalone interview prep and mock interview require sign-in because they create saved opportunity records and use the existing credit model.
- Job-context-only opportunities reuse `generated_outputs` with empty resume and cover letter fields. This avoids a migration but is not the final long-term opportunity schema.
- Career Pathway is now live as a lightweight MVP; the fuller pathway system remains future work.
- The old resume workflow still expects a real resume upload before document generation.
- The dashboard now receives opportunity-only saved records, but a fuller opportunity pipeline redesign remains future work.
