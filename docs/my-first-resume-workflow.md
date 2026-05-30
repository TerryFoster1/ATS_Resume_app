# My First Resume workflow

Implemented foundation: 2026-05-26

## Goal

The My First Resume workflow helps users who do not have a resume yet discover and articulate useful experience.

It should feel like:

- guided career discovery
- recruiter-aware coaching
- confidence-building interpretation
- a professional starting point

It should not feel like:

- a blank resume template
- childish career advice
- a rigid form
- generic AI form filling

## Phase 1 UX

The goal-first onboarding flow now includes:

```text
Build My First Resume
```

Instead of asking for formal resume sections first, it asks experience-discovery questions:

- responsibility or leadership
- people, service, or teamwork
- recognition or achievement
- school, clubs, community, or activities
- career direction

The user can answer in plain language. Career Ladder creates a starter resume-style text that routes into the existing resume workflow.

## Profile integration

The workflow is designed to feed the Master Career Profile.

The server API supports:

```text
POST /api/career-profile
action: firstResumeDiscovery
```

This stores first-resume discovery answers as profile memory for signed-in users.

The current client flow keeps the first-resume draft inside the existing resume workflow so the production resume pipeline is preserved.

In the MVP implementation, signed-in users also send the discovery answers to `/api/career-profile` before continuing. If the user is anonymous or the profile API is unavailable, the workflow still continues with a session-only starter resume draft.

## Recruiter-aware interpretation

The workflow treats informal or early experience as possible evidence of:

- responsibility
- reliability
- communication
- teamwork
- service orientation
- coordination
- achievement focus
- problem solving

It does not invent jobs, dates, employers, metrics, or credentials.

## Intelligence Update - 2026-05-30

My First Resume now uses the transferable-skill extraction layer to help users understand why nontraditional experience matters.

The flow now looks for evidence in:

- clubs
- sports
- volunteer work
- projects
- side hustles
- leadership
- family business work
- online communities
- event organization
- awards and recognition

The UI explains why recruiters care.

Example:

```text
Sports team captain
```

should not only become:

```text
Leadership
```

It should be explained as:

```text
This can demonstrate responsibility, team coordination, communication, and accountability because other people relied on you in a shared goal environment.
```

First-resume answers now enrich the Master Career Profile with both user evidence and explainable transferable-skill notes.

## What was intentionally deferred

- no full conversational chat interface
- no multi-step AI coaching loop
- no teacher/counselor classroom workflow
- no permanent profile review screen inside onboarding
- no new paid product or credit behavior
- no generated resume prompt rewrite

## Future improvements

- allow users to review and approve each extracted profile item
- add examples for students, new workers, career returners, and people with informal experience
- support teacher/counselor invitation workflows
- generate a polished first resume after the user chooses a target role

## Validation

- `npm.cmd run typecheck`: PASS
- `npm.cmd run build`: PASS
- `/?step=intake`: returned `200` in local production smoke testing
- `/?step=resume`: returned `200`, confirming the old resume-first path still renders
