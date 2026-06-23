# Profile-First Generation Strategy

Last updated: June 23, 2026

Career Ladder now uses `CareerGenerationContext` as the shared compatibility layer between the Master Career Profile and generation workflows.

## Strategy

The Master Career Profile should be treated as the user's living professional identity. Uploaded resumes are still valuable, but they are import/enrichment sources rather than the long-term source of truth.

For signed-in users, generation routes should:

1. Read the latest Master Career Profile.
2. Build a `CareerGenerationContext` for the specific workflow.
3. Include uploaded resume text only as fallback/enrichment.
4. Include transferable skill extraction and recruiter-positioning notes.
5. Generate or evaluate outputs from the shared context.

For anonymous users, uploaded resume/session evidence remains the primary input.

## Current Implementation

Implemented in:

- `lib/careerGenerationContext.ts`
- `lib/careerGenerationContextStorage.ts`

Migrated workflows:

- Career Coach
- Career Pathways
- Resume generation
- Cover letters
- Interview prep
- Mock interview questions and feedback

## Why This Matters

A shared context layer reduces drift between workflows. The same profile evidence, inferred transferable skills, professional functions, recruiter concerns, and warnings can now inform multiple outputs.

This supports the product promise that Career Ladder understands the user's career trajectory rather than treating every workflow as a separate AI form.

## What Was Intentionally Deferred

- No database migration was added.
- No generator was rewritten from scratch.
- No paid output is silently regenerated.
- No full ontology or labor-market engine was introduced.
- No user confirmation workflow for inferred skills was added in this pass.

## Future Work

- Store user-confirmed vs inferred skill status.
- Add profile freshness indicators on saved outputs.
- Move from prompt-text context toward structured tool inputs for generators.
- Persist Career Coach sessions when useful.
- Add explainable mapping UI for inferred transferable skills.
