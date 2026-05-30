# Profile-First Generation Strategy

Created: 2026-05-26

## Direction

Career Ladder should increasingly generate career outputs from the Master Career Profile.

Long-term model:

```text
Master Career Profile + target opportunity -> tailored output
```

The uploaded resume remains important, but it is an import source and fallback. It should not be treated as the user's permanent career identity.

## Phase 1 Compatibility Layer

The current generators are preserved.

The compatibility layer keeps the existing API shapes while resolving source material differently:

Authenticated user:

1. Try Master Career Profile.
2. Merge profile context with the uploaded/session resume.
3. Use uploaded/session resume as fallback if profile is empty or unavailable.

Anonymous user:

1. Use uploaded/session resume only.

This preserves the production resume flow while beginning the architecture transition.

## Current Integration Points

Profile-first source resolution is used by:

- `/api/analyze`
- `/api/generate`
- `/api/opportunities`

Resume upload enrichment is handled by:

- `/api/parse-resume`

Profile management is handled by:

- `/api/career-profile`
- `/profile`

## Generator Guardrails

Profile-first generation must continue to obey:

- no invented experience
- no fake credentials
- no fake metrics
- no fake employers
- no destructive profile overwrites
- uploaded resume fallback for anonymous users
- existing entitlement and credit behavior

The Master Career Profile can expand context, but it does not grant permission to overclaim.

## Why This Matters

The profile-first model enables:

- better tailored resumes over time
- less repeated data entry
- stronger pathway analysis
- interview prep that remembers prior strengths
- future learning recommendations
- career transition intelligence
- transferable skill translation from undervalued experience into recruiter-readable language
- long-term retention

The user should increasingly feel:

```text
Career Ladder understands my professional identity.
```

## Future Evolution

Future phases should:

- add profile review before using newly imported resume items
- extract transferable skill mappings from uploaded resumes and first-resume answers
- explain why inferred skills map to a target role
- ask the user to confirm important inferred mappings before relying on them heavily
- let users mark evidence as active, archived, sensitive, or role-specific
- connect pathway gaps back into profile goals
- track completed certifications and learning progress
- allow generated outputs to suggest profile additions without silently saving them
- eventually move from text-composed profile context to structured generator inputs

## Transferable Skill Translation

Profile-first generation should not merely repeat the user's original resume language. It should use the Master Career Profile to identify the professional function behind the evidence.

Example:

```text
Chef evidence -> daily kitchen operations, inventory planning, vendor communication, scheduling, quality control, safety compliance, team training.
```

When relevant to a target role, a tailored resume may frame this as:

```text
Coordinated daily kitchen operations, inventory planning, team scheduling, vendor communication, and quality control in high-pressure service environments.
```

Guardrails:

- do not invent responsibilities
- do not inflate job titles
- do not claim formal operations experience if the user only had exposure
- use cautious phrasing when evidence is partial
- preserve the user's original facts as the evidence layer

See `docs/transferable-skill-translation-strategy.md`.

## Beta Readiness Update

- Pathway generation now receives contextual low-cost learning suggestions when relevant.
- Career Coach uses shared transferable-skill intelligence to suggest adjacent careers without adding generation latency.
- Promo codes grant credits through the same ledger/profile balance model as purchased credits, preserving unlock behavior.

## Transferable Intelligence Update - 2026-05-30

Profile-first generation now has a stronger intelligence substrate.

The Master Career Profile can contain:

- explicit user evidence
- inferred transferable skills
- professional function labels
- recruiter-readable inference notes

These are created by the transferable-skill extraction layer and stored through existing profile fields:

- `skills`
- `discoveryNotes`

Current profile-aware consumers:

- `/api/analyze`
- `/api/generate`
- opportunity creation
- pathway unlock generation
- interview prep generation
- mock interview question generation
- mock interview feedback generation
- Career Coach client-side reasoning

The principle:

```text
Generated outputs are views.
The Master Career Profile is memory.
Transferable-skill extraction is interpretation.
```

Future work should add user confirmation for inferred skills before relying on them too strongly in high-stakes outputs.

## What Was Intentionally Deferred

- complete generator rewrite
- structured prompt redesign for every output
- profile conflict resolution UI
- versioned master resume snapshots
- full career ontology
- labor-market intelligence engine
- school or teacher account system
