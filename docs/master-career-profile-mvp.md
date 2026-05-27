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

The schema change is additive in `src/supabase/schema.sql`.

Production migration should be applied before relying on persistent profile writes. Until then:

- existing resume and paid workflows continue
- profile enrichment may fail soft
- profile API may return errors if columns are missing

No existing generated output records are rewritten.

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
