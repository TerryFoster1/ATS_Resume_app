# Master Career Profile MVP

Implemented: 2026-05-26

## Goal

The Master Career Profile MVP begins moving Career Ladder from uploaded-resume workflows toward persistent career intelligence workflows.

The goal is not to replace the existing resume flow. The goal is to add a durable career-memory layer that can increasingly power resumes, cover letters, pathways, interview prep, mock interviews, and future recommendations.

## MVP Scope

Implemented:

- additive profile memory fields in `profile_memory`
- signed-in `/profile` surface
- `/api/career-profile` read/write endpoint
- resume upload enrichment into profile memory
- first-resume discovery workflow
- career-discovery foundation workflow
- profile-first compatibility for analyze/generate/opportunity creation
- lightweight add/edit profile evidence

Preserved:

- anonymous resume upload
- old `/?step=resume` flow
- resume generation
- cover letter generation
- saved outputs
- dashboard
- credits and unlocks
- Stripe
- auth
- middleware
- SEO routes

## Additive Profile Philosophy

The profile is cumulative.

Uploaded resumes, manual entries, first-resume answers, and discovery notes are import sources. They enrich the profile but do not automatically delete prior experience.

Generated resumes are outputs/views. They are not the source of truth.

## Profile Data Supported

The MVP supports:

- work experience
- volunteer experience
- education
- certifications
- awards
- projects
- extracurriculars
- skills
- achievements
- interests
- career goals
- resume import metadata
- discovery notes

## Upload Parsing Philosophy

Resume uploads continue to return extracted text for the existing workflow.

When the user is signed in, uploads also attempt to enrich the Master Career Profile with:

- detected roles
- education entries
- skills
- import metadata

The enrichment is best-effort. If profile storage is unavailable or schema migration has not been applied, the resume upload still works.

## My First Resume

The first-resume workflow asks discovery-oriented questions instead of presenting blank resume sections.

It focuses on:

- responsibility
- helping people
- teamwork
- school, clubs, community, and activities
- recognition and achievement
- early career direction

For signed-in users, answers are sent to `/api/career-profile` and stored as profile memory. Anonymous users can still continue with a session-only starter resume draft.

## Career Discovery

Career discovery captures:

- interests
- strengths
- work preferences
- energy patterns

Signed-in users persist this context to the profile. Anonymous users continue with session-only pathway context.

This is not a personality test. It is a lightweight context layer for realistic pathway exploration.

## Lightweight Profile Management

The `/profile` surface lets signed-in users:

- add career evidence
- edit saved work/project/volunteer entries
- edit education/certification/discovery notes
- add awards, achievements, interests, and goals

The UI is intentionally lightweight and guided. It should not become enterprise HR software.

## Migration Strategy

The schema change is additive in `src/supabase/schema.sql` and packaged as:

`src/supabase/migrations/20260526_master_career_profile_mvp.sql`

Production migration should be applied before relying on persistent profile writes. Until then:

- existing resume and paid workflows continue
- profile enrichment may fail soft
- profile API may return errors if columns are missing

No existing generated output records are rewritten.

## Production Migration Readiness

Production migration required: yes.

The Master Career Profile MVP reads and writes new `profile_memory` columns. Production Supabase should receive the migration before the app version is promoted so `/profile`, first-resume discovery, career discovery, and signed-in resume-upload enrichment can persist reliably.

Required additive columns:

- `volunteer_experience jsonb not null default '[]'::jsonb`
- `certifications jsonb not null default '[]'::jsonb`
- `awards jsonb not null default '[]'::jsonb`
- `projects jsonb not null default '[]'::jsonb`
- `extracurriculars jsonb not null default '[]'::jsonb`
- `achievements jsonb not null default '[]'::jsonb`
- `interests jsonb not null default '[]'::jsonb`
- `career_goals jsonb not null default '[]'::jsonb`
- `resume_imports jsonb not null default '[]'::jsonb`
- `discovery_notes jsonb not null default '[]'::jsonb`
- `master_profile_version integer not null default 1`

Safety notes:

- The migration uses `add column if not exists`.
- No existing columns are renamed or dropped.
- No rows in `generated_outputs` are modified.
- No dashboard, credit, purchase, Stripe, auth, or saved-output tables are modified.
- Existing `profile_memory` rows receive empty arrays and version `1` as defaults.
- Existing dashboard and saved-output records continue to read from their current tables and should not break.

## Production Deploy Order

1. Confirm the app build and typecheck pass locally.
2. Apply `src/supabase/migrations/20260526_master_career_profile_mvp.sql` to production Supabase.
3. Confirm the production `profile_memory` table has the new columns.
4. Deploy the app commit.
5. Smoke test the profile, onboarding, resume upload, and existing paid workflows.

If production does not yet have `public.profile_memory`, apply the existing base schema first or create the existing `profile_memory` table from `src/supabase/schema.sql` before running the additive migration.

## Rollback Notes

Preferred rollback is app-only: revert the deployment while leaving the additive database columns in place.

The new columns are safe to keep because older app versions ignore them. Avoid dropping the columns unless there is a confirmed database-level problem. If a database rollback is unavoidable, export any profile MVP data first, then drop only the columns added by `20260526_master_career_profile_mvp.sql`.

No `generated_outputs` rollback is required because the MVP does not rewrite saved application records.

## Smoke Test Checklist

After migration and deploy:

- Open `/profile` signed out and confirm redirect to `/auth?next=/profile`.
- Sign in and confirm `/profile` loads.
- Add a work, project, certification, or volunteer entry.
- Edit a saved profile entry.
- Run My First Resume and confirm signed-in answers persist.
- Run Career Discovery and confirm signed-in answers persist.
- Upload a resume while signed in and confirm the existing upload flow still returns extracted text.
- Upload a resume anonymously and confirm the session-only flow still works.
- Open `/?step=resume` and confirm the legacy resume-first path still works.
- Generate resume and cover letter outputs.
- Reopen dashboard and saved outputs.
- Verify interview prep, mock interview, pathway preview/unlock, pricing, credits, and unlock/export flows still behave normally.

## Known Production Limitations

- Signed-in profile enrichment is best-effort; resume upload remains the primary fallback if profile storage is unavailable.
- Manual profile editing is intentionally lightweight and does not yet provide full version history or conflict resolution.
- Skills are imported and displayed as profile context, but fine-grained skill editing remains a future enhancement.
- Profile-first generation is a compatibility layer, not a full generator rewrite.
- Live signed-in profile write QA should be repeated against production after the migration is applied.

## Student Ecosystem Foundations

The first-resume workflow and career-discovery prompts support students and early-career users, but the product remains professional-grade and workforce-oriented.

Future student ecosystem possibilities:

- teacher accounts
- school email onboarding
- guidance counselor workflows
- educational access

These are intentionally deferred.

## Intentionally Deferred

- full profile version history
- destructive merge/conflict resolution
- full master resume editor
- teacher/school account system
- generated-output backfill
- subscription model
- institutional admin tools
- full generator rewrite
- course marketplace or affiliate system

## Validation

Required validation:

```powershell
npm.cmd run build
npm.cmd run typecheck
```

Results are recorded in the task summary.
