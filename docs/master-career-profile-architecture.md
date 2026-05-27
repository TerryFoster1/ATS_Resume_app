# Master Career Profile architecture

Implemented foundation: 2026-05-26

## Product direction

Career Ladder is evolving from:

```text
uploaded resume -> generated resume
```

into:

```text
persistent career identity -> generated career outputs
```

The Master Career Profile is the long-term source of truth. Tailored resumes, cover letters, interview prep, mock interviews, and pathway analyses should increasingly become generated views of a persistent career memory rather than isolated transformations of one uploaded file.

## Phase 1 implementation

This phase added a safe, additive profile layer without rewriting the existing resume, auth, Stripe, credit, dashboard, saved-output, interview prep, pathway, mock interview, or SEO systems.

### Storage model

The existing `profile_memory` table is extended with additive JSONB fields:

- work history
- volunteer experience
- education
- certifications
- awards
- projects
- extracurriculars
- achievements
- interests
- career goals
- resume imports
- discovery notes

The schema remains additive and backwards-compatible. Existing generated outputs are not migrated or rewritten.

### Code layer

New helpers:

```text
src/lib/masterCareerProfile.ts
src/lib/careerProfileStorage.ts
```

Responsibilities:

- parse uploaded resumes into profile entries
- merge new evidence cumulatively
- avoid destructive overwrites
- compose profile-first resume context for logged-in users
- preserve anonymous uploaded-resume behavior

### API layer

New route:

```text
/api/career-profile
```

Supports:

- reading the current signed-in user's profile
- adding manual profile entries
- saving first-resume discovery notes
- saving career-discovery notes

### UI layer

New signed-in route:

```text
/profile
```

This is a lightweight profile management surface, not a full HR-style dashboard. Users can add reusable career evidence such as work, volunteer experience, projects, credentials, awards, interests, and goals.

The dashboard and account menu now link to the Master Career Profile.

## Resume import behavior

Existing resume uploads still work.

When a signed-in user uploads a resume through the existing parser, Career Ladder now attempts to enrich the Master Career Profile with:

- detected work roles
- education entries
- skills
- resume import metadata

This is best-effort. If the new profile fields are not migrated yet, parsing still succeeds and the existing workflow continues.

The uploaded resume is now treated as an import source, not the permanent source of truth.

## Generator evolution strategy

Phase 1 begins the profile-first transition safely:

- anonymous users still use the uploaded resume directly
- signed-in users can have profile context merged ahead of uploaded/session resume context
- the existing generation APIs remain compatible with their current request shapes
- saved opportunity workflows can use profile evidence when no fresh resume was uploaded

This is intentionally not a rewrite of the resume or cover letter generators.

## Additive career-memory philosophy

The profile merge strategy is cumulative:

- newest imports do not delete older experience
- duplicate-looking entries are deduped conservatively
- manual entries are preserved
- generated tailored outputs are not treated as the core profile

Future UX should make profile changes reviewable rather than silently destructive.

## Student and education ecosystem strategy

Career Ladder should remain professional-grade and workforce-oriented.

Student, teacher, and school-account foundations should support:

- early resume creation
- career discovery
- guidance counselor workflows
- school email onboarding
- future educational access controls

The product should not be repositioned as student-only software. Students are early ecosystem users inside a lifelong career platform.

## What was intentionally deferred

- no full profile editing dashboard
- no version history UI
- no first-class opportunities table migration
- no teacher account system
- no school email domain verification
- no profile conflict-resolution workflow
- no generated-output backfill
- no subscription or new pricing model
- no major generator rewrite

## Migration safety

The schema change is additive. Production should apply the updated `src/supabase/schema.sql` before relying on profile writes.

If the migration has not been applied:

- resume parsing still returns extracted text
- generation still works from uploaded/session resume text
- profile read/write APIs may return an error or empty profile
- existing paid workflows remain unaffected

## Validation

Commands run from:

```text
C:\Users\kathr\Documents\Claude CoWork Files\Projects\Apps\ats-resume-app\src
```

```powershell
npm.cmd run typecheck
npm.cmd run build
```

Results:

- Typecheck: PASS
- Build: PASS

Local production smoke checks:

```text
/             200
/?step=intake 200
/?step=resume 200
/pricing      200
/dashboard    307 anonymous auth redirect
/profile      307 anonymous auth redirect
/api/career-profile 401 anonymous API guard
```

These checks confirm the public entry points still render, the old resume-first path still renders, and the new profile route/API are protected without touching Stripe, credits, or middleware.
