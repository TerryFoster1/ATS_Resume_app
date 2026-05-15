# ATS Resume App

A small web app that tailors a resume and cover letter to a specific job posting and validates the output against basic ATS-style rules.

## Status

`active`

Last updated: 2026-04-22

## Why this exists

Tailoring a resume and cover letter for each application is slow and easy to skip. Most candidates paste the same resume everywhere and get filtered out by ATS keyword scans. This app takes a resume and a job posting, spots the gaps, asks a few short targeted questions, and generates tailored output that passes a basic internal ATS-style check.

## What it is

Session-only web app (Next.js + TypeScript). No accounts, no saved history. Built to run locally for MVP.

## Goals

- Primary goal: Produce a noticeably more tailored resume and cover letter for a given job posting.
- Secondary goals:
  - Honest, defensible ATS-style validation against documented internal rules.
  - Fast path from paste-in to copy-out — under 2 minutes per application.

## Out of scope

- User accounts, login, saved profiles
- LinkedIn / social analysis
- Job board scraping or recruiter tools
- Subscriptions, payments, analytics dashboards
- Any claim of guaranteed ATS pass or hiring outcome

## Current focus

V1 MVP scaffold — project structure, Next.js app, stubbed routes and components. Logic implementation is the next step.

## Open questions

- Which specific Anthropic model to use for generation (cost vs. quality trade-off for Terry's local dev).
- Keyword coverage threshold — starting at 70%, may need tuning on real JDs.
- Whether to offer DOCX download on top of TXT in V1.

## Files in this folder

- `README.md` — this file
- `docs/spec.md` — working product spec
- `src/` — the Next.js application

## Changelog

- 2026-04-22 — project created, structure scaffolded
