# Career Intelligence Reasoning Architecture

Updated: 2026-05-30

## Goal

Career Ladder should feel like a recruiter-aware career strategist, not a generic AI answer generator.

The core product moment is:

```text
I never thought of my experience that way.
```

This requires a reasoning layer that translates real experience into professional functions without fabricating claims.

## Transferable Skill Extraction Layer

The dedicated extraction layer lives in:

```text
src/lib/transferableSkillExtraction.ts
```

It analyzes user evidence for:

- explicit skills: what the user actually says
- implicit skills: what recruiters may reasonably infer
- transferable skills: reusable skills across adjacent roles
- professional functions: operations, relationship management, leadership, project coordination, analytical communication, service recovery
- adjacent careers: realistic nearby paths to test
- recruiter concerns: what may cause hesitation
- evidence notes: grounded explanations for why the inference exists

The extraction layer intentionally uses careful language. It can say:

- "may support"
- "likely overlaps with"
- "can be framed as"
- "evidence to prepare"

It must not say:

- "you were an operations manager" unless the user actually held that role
- "you have Salesforce experience" unless the user provided evidence
- "you are qualified" without naming the evidence and gaps

## Master Career Profile Integration

The Master Career Profile remains the source of truth.

User-provided facts continue to live in the existing profile fields:

- work experience
- volunteer experience
- projects
- extracurriculars
- education
- certifications
- awards
- achievements
- interests
- career goals

Inferred transferable intelligence is stored without a schema migration by using:

- `skills` for inferred skill labels and professional function labels
- `discoveryNotes` for explainable inference notes

This keeps the change additive and safe. Existing profile records remain readable.

## Reasoning Pipeline

Career Coach now follows this internal sequence:

```text
User profile and answers
-> strengths, interests, preferences, ambition, constraints
-> explicit skills
-> implicit transferable skills
-> professional functions
-> adjacent careers
-> fit, effort, cost, timeline, salary, risk
-> recruiter expectations and concerns
-> recommendations
```

The user sees the reasoning through:

- why this could be realistic
- strongest professional functions
- fit, effort, cost, timeline, salary, risk
- transferable strengths
- recruiter expectations
- likely challenges
- recruiter concerns

## Recruiter Reasoning Layer

Every recommendation should answer:

- What would a recruiter want proof of?
- What would cause hesitation?
- What evidence would reduce that concern?
- Is the gap a true skill gap, an evidence gap, or a language gap?

Examples:

- Chef to operations coordinator is not based on cooking. It is based on inventory planning, vendor coordination, scheduling, quality control, training, workflow sequencing, and pressure-tested decision making.
- Retail manager to customer success is not based on sales alone. It is based on customer retention, escalation handling, coaching, follow-up discipline, KPI awareness, and relationship management.
- Journalism to content strategy is not based on writing alone. It is based on research, stakeholder interviewing, audience judgment, synthesis, editorial discipline, and deadline execution.

## Profile-First Intelligence Strategy

Profile-first means existing saved career memory should improve future outputs.

Current integrations:

- resume uploads enrich the Master Career Profile with explicit skills and inferred transferable notes
- manual profile entries generate inferred transferable notes
- My First Resume answers generate profile evidence and inferred skills
- Career Discovery answers generate profile evidence and inferred skills
- Career Coach fetches the Master Career Profile when signed in and uses it as background context
- Pathways receive transferable extraction context before generation
- Interview Prep receives transferable extraction context before generation
- Mock Interview questions and feedback receive transferable extraction context before generation

## Explainability Philosophy

Trust comes from showing the chain of reasoning.

Career Ladder should not simply output:

```text
You should consider operations.
```

It should explain:

```text
Operations may be realistic because your kitchen leadership evidence includes inventory planning, vendor communication, shift coordination, staff training, and quality control. A recruiter may still want proof that you can describe this as repeatable operational ownership rather than only task execution during busy service.
```

## Learning Recommendations

Learning recommendations should emerge from gaps and recruiter expectations.

They should explain:

- why the credential helps
- whether recruiters usually value it
- whether it is required, helpful, optional, or probably unnecessary

Examples:

- Google PM or CAPM can help when project terminology and status-reporting proof are repeated gaps.
- HubSpot Academy or Salesforce Trailhead can help when customer success or account roles require CRM language.
- Screenwriting or film programs may matter when the target path requires portfolio credibility, industry vocabulary, or formal creative-development practice.

## Guardrails

- Do not fabricate experience.
- Do not inflate titles.
- Do not invent tools, metrics, credentials, salaries, dates, or employers.
- Do not treat inferred skills as confirmed facts.
- Do not bury recruiter concerns behind positivity.
- Do not recommend paid learning before cheaper proof-building steps.

## Deferred

- User confirmation UI for inferred skills.
- Dedicated inferred-skill JSON column.
- Role-to-role transition graph.
- Live salary or labor-market data.
- Affiliate or program marketplace infrastructure.
- Multi-pass AI career-coach generation.
