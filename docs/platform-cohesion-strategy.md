# Platform Cohesion Strategy

## Goal

Career Ladder should feel like one evolving career intelligence layer, not a bundle of disconnected AI tools.

## Shared Objects

- Master Career Profile: persistent professional identity.
- Opportunity: role-specific workspace and hiring process state.
- Job context: target role, company, posting, and pathway intent.
- Generated outputs: tailored views created from profile and opportunity context.

## Current Cohesion Improvements

- Saved output pages now include opportunity tracking.
- Dashboard cards show hiring status, follow-up timing, and offer context.
- Profile copy reinforces transferable skill translation.
- Landing pages position tracking as part of the broader career workspace.

## Future Cohesion

- Pathway analysis should inform interview prep.
- Mock interview feedback should update recruiter concern notes.
- Offer comparison should reference career goals.
- Learning recommendations should appear only when pathway gaps justify them.
- Dashboard should eventually summarize next best actions across opportunities.

## Production Safety

Cohesion should be layered through shared snapshot/profile helpers before introducing new tables or large workflow rewrites.

## Validation Notes

This increment used the existing `generated_outputs.analysis_snapshot` compatibility layer and did not require a migration. Build, typecheck, audit, and local anonymous-route smoke checks passed.
