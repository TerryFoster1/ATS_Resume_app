# Transferable Skill Translation Strategy

Created: 2026-05-27

## Core Principle

Career Ladder should translate real experience into recruiter-readable language without exaggerating, inflating titles, or inventing false claims.

The product should not simply repeat the words a user already knows how to use. It should infer the professional functions, transferable skills, and hiring-market language behind the user's actual evidence.

Example:

```text
User evidence: worked as a chef

Possible professional functions:
- operations management
- inventory control
- vendor coordination
- team leadership
- scheduling
- quality control
- cost management
- workflow optimization
- training
- compliance and safety
- high-pressure decision-making
```

The user should not need to know the phrase "operations management" for Career Ladder to identify that overlap when the evidence supports it.

## Who This Matters For

Transferable skill translation is especially important for:

- laid-off workers
- career changers
- students
- service industry workers
- trades workers
- retail workers
- hospitality workers
- people whose experience is undervalued by traditional resumes

The emotional value is:

```text
I did not realize my experience counted that way.
```

That moment is central to Career Ladder's platform value.

## Profile Intelligence

The Master Career Profile should eventually store both:

- user-provided facts
- inferred transferable skill mappings

User-provided facts are the source evidence. Inferred mappings are interpretation layers.

Example structure:

```text
Fact:
Managed dinner service for a 12-person kitchen team.

Inferred mappings:
- shift leadership
- workflow coordination
- quality control
- scheduling pressure
- customer experience ownership

Why this maps:
Kitchen service requires coordinated execution, timing, team direction, and quality standards under pressure.
```

Inferred skills must remain grounded in user evidence. They should be explainable and, where important, confirmable by the user.

## Resume Generation

Tailored resumes should use inferred transferable skills when they are relevant to the target role and supported by the user's evidence.

Example:

```text
Chef applying for operations roles:
Coordinated daily kitchen operations, inventory planning, team scheduling, vendor communication, and quality control in high-pressure service environments.
```

This is stronger than:

```text
Worked as a chef and prepared food.
```

But it must remain truthful. If the user did not manage inventory, vendors, schedules, or team workflows, the resume should not claim those things.

## Pathway Analysis

Career Pathways should identify adjacent careers based on transferable skill overlap.

Examples:

- chef -> operations coordinator
- retail manager -> customer success
- journalism -> marketing or content strategy
- trades -> project coordination
- hospitality -> account management

Pathway analysis should explain why the transition is realistic, what already overlaps, what is missing, and what proof a recruiter may still need.

## Career Discovery

For users who do not know what they want to do, Career Ladder should surface possible directions based on hidden transferable strengths.

The system should ask about real experience in plain language, then map answers to professional patterns.

Examples:

- "Have you helped organize people, events, shifts, deliveries, or projects?"
- "Have people trusted you to solve problems when things were busy or unclear?"
- "Have you helped customers, clients, coworkers, classmates, or community groups make decisions?"

These answers can reveal operations, customer success, coordination, communication, training, leadership, and problem-solving signals.

## Guardrails

Career Ladder must not:

- fabricate experience
- inflate titles
- claim formal experience the user did not have
- turn adjacent exposure into ownership
- add tools, certifications, metrics, employers, or outcomes that are not supported

Use grounded language:

- "Your experience may support..."
- "This likely overlaps with..."
- "This can be framed as..."
- "If accurate, this could support..."
- "A recruiter may read this as evidence of..."

The stronger the claim, the stronger the evidence required.

## Future Implementation

Future phases should add:

- transferable skill extraction from uploaded resumes
- inferred skill tags in the Master Career Profile
- explainable "why this skill maps" notes
- user confirmation before relying heavily on inferred skills
- role-to-role transition mapping
- evidence confidence levels
- editable inferred mappings
- prompt support for inferred skills across resumes, pathways, interview prep, and mock interviews

Do not build a giant career ontology too early. Start with explainable mappings for high-frequency transition patterns.

## UX Direction

Users should feel:

```text
Career Ladder can see professional value in experience I was underselling.
```

The UI should make this visible without feeling gimmicky:

- show "experience signal" and "recruiter-readable translation"
- explain why a skill maps
- let users confirm or correct mappings
- keep the user's real background at the center
- avoid pretending every experience maps to every role

The platform should feel like a recruiter-aware interpreter, not a resume synonym machine.
