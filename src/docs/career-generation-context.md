# CareerGenerationContext

Last updated: June 23, 2026

`CareerGenerationContext` is the shared context layer that normalizes candidate, profile, opportunity, and recruiter-intelligence inputs before Career Ladder generates outputs.

The goal is to make the Master Career Profile the consistent source of truth for signed-in users while preserving anonymous upload/session behavior.

## Source-of-Truth Rules

For signed-in users:

1. Prefer the latest Master Career Profile.
2. Use uploaded resume text as enrichment or fallback, not the permanent truth.
3. Include structured profile data where possible.
4. Generate markdown profile context for LLM readability.
5. Include transferable skill extraction consistently.
6. Preserve saved outputs as historical records; do not silently regenerate paid outputs.

For anonymous users:

1. Use uploaded/session resume evidence as the fallback source.
2. Keep generation behavior compatible with existing upload flows.
3. Avoid overconfident personalization when profile memory is unavailable.

## Main Modules

- `lib/careerGenerationContext.ts`
  - shared types
  - pure profile-to-context builder
  - Master Profile markdown formatter
  - relevance filtering helpers
  - prompt formatter

- `lib/careerGenerationContextStorage.ts`
  - server-side builder that reads the latest Master Career Profile through `getMasterCareerProfile`

## Context Shape

The shared context includes:

- `masterProfileMarkdown`
- `structuredProfile`
- `uploadedResumeFallback`
- `candidateContextText`
- `jobTarget`
- `jobDescription`
- `transferableSkills`
- `professionalFunctions`
- `careerGoals`
- `savedOpportunityContext`
- `generationRules`
- `userFacts`
- `inferredSkills`
- `profileWarnings`
- `usedMasterProfile`
- `transferableExtraction`

`candidateContextText` is the compatibility text source passed into existing generators. It is built from the Master Career Profile, saved opportunity context, and uploaded fallback evidence.

## Master Profile Markdown Format

The context builder formats the profile into markdown sections for LLM readability. Sections include, when data exists:

- `# Personal Information`
- `# Career Goals`
- `# Core Identity`
- `# Work Experience`
- `# Education`
- `# Certifications`
- `# Skills`
- `# Tools & Software`
- `# Equipment / Physical Tools`
- `# Projects`
- `# Volunteer Experience`
- `# Awards`
- `# Languages`
- `# Interests`
- `# Transferable Skills`
- `# Professional Functions`
- `# Recruiter Positioning Notes`

Structured profile data remains the source. Markdown is only a generated prompt/context format.

## Relevance Filtering

The formatter scores profile experiences and notes against:

- target role
- company
- job description
- career goal
- saved opportunity context

Relevant items are prioritized first. If no clear relevance signal exists, the formatter falls back to recent/available profile sections so the generator still has useful evidence.

This is intentionally lightweight. It avoids a giant ontology while reducing prompt clutter.

## Transferable Skill Usage

The context builder calls `extractTransferableSkillProfile` over the combined profile/opportunity/upload context and target role. It exposes:

- explicit skills
- implicit skills
- transferable skills
- professional functions
- adjacent career signals
- recruiter concerns
- evidence notes

Generators receive this through `formatCareerGenerationContextForPrompt`.

## Migration Status

| Workflow | Status | Notes |
| --- | --- | --- |
| Career Coach | Migrated | Uses the pure context builder in `CareerCoachClient` after fetching `/api/career-profile`. Output remains client-side and unsaved. |
| Career Pathways | Migrated | Opportunity creation and pathway unlock use `CareerGenerationContext`; unlock rehydrates latest profile while preserving existing paid output if already generated. |
| Resume generation | Migrated | `/api/analyze` and `/api/generate` build context for signed-in users; resume prompts receive shared context. |
| Cover letter generation | Migrated | `/api/generate` builds a cover-letter context and passes it into the prompt. |
| Interview prep | Migrated | Saved output route rehydrates latest profile and passes context into `generateInterviewPrep`. Existing prep is returned without regeneration or another charge. |
| Mock interview | Migrated | Questions and feedback receive shared context through the saved output route. Existing mock interviews are preserved. |

## Saved Output Behavior

Saved outputs remain historical snapshots. When an old output is reopened, the existing generated resume, cover letter, pathway, interview prep, and mock interview content is preserved.

For new downstream generation attached to an existing output, the route builds a fresh `CareerGenerationContext` from the latest Master Career Profile plus the saved opportunity context. This reduces stale snapshot issues without silently changing already-paid results.

## Guardrails

- Never fabricate experience.
- Never invent credentials.
- Never inflate titles falsely.
- Prefer Master Profile facts over older uploaded resume wording when they conflict.
- Treat inferred skills as grounded hypotheses, not confirmed credentials.
- Use cautious language: `your profile suggests`, `this may support`, `if accurate, this can be positioned as`.
- Do not include irrelevant profile content blindly.

## Remaining Limitations

- The context is still ultimately rendered into prompt text for current LLM calls; generators do not yet consume a fully structured schema.
- Relevance filtering is keyword-based and intentionally lightweight.
- Career Coach output is still deterministic and not persisted as a saved coaching session.
- Saved generated documents remain static snapshots, not live views over profile data.
- Profile merge still stores inferred notes without a full user-confirmation workflow.
