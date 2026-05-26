# Career Ladder - Product Spec

This spec began as the V1 resume workflow spec. It now sits under the broader product trajectory documented in `docs/product-trajectory.md`.

## Summary

Career Ladder is a recruiter-aware career preparation and career intelligence platform. It starts with a job posting or target role, helps users choose the right next step, and can generate tailored resumes, cover letters, interview prep, and mock interview practice around a specific opportunity.

The resume workflow remains important, but it is one module inside a broader career operating system.

## Problem

Candidates often have relevant experience but their materials do not frame it clearly for the role they want. Recruiters need credible, role-specific evidence, and manually tailoring every application is slow enough that many people skip it.

## Users

- Primary user: Job-seekers applying to individual roles, who want quick per-application tailoring.
- Secondary users: Career coaches testing drafts; anyone comparing their resume against a real JD.

## Core user stories

- As a job-seeker, I can paste a job posting or enter a target role so that the app can help me choose the right preparation path.
- As a job-seeker, I can paste or upload my resume when I want tailored documents for a specific role.
- As a job-seeker, I can answer a few short follow-up questions so that the generated output reflects experience my resume didn't capture.
- As a job-seeker, I can see my tailored resume and cover letter and understand how they position my experience for the role.
- As a job-seeker, I can copy or download the final outputs so that I can paste them into an application.

## Current Core Modules

- [ ] Resume input — upload `.pdf` or `.docx`, or paste plain text
- [ ] Extracted-text preview with inline editing when parsing looks messy
- [ ] Job posting paste (plain text)
- [ ] Job requirement and recruiter-signal extraction
- [ ] Resume-vs-JD gap analysis
- [ ] Up to 3 targeted follow-up questions (up to 5 when gap score is high)
- [ ] Tailored resume generation
- [ ] Tailored cover letter generation
- [ ] Internal formatting and quality validation
- [ ] Check → revise → re-check loop (max 3 revise passes)
- [ ] Results page with Copy and Download (TXT) per output
- [ ] Honest framing: improves role positioning and document quality, does not guarantee interviews or hiring

Additional current modules:

- [ ] Intent-first intake before document generation
- [ ] Standalone interview prep from job context
- [ ] Mock interview practice tied to saved opportunities

## Future Modules

- [ ] DOCX download
- [ ] Side-by-side diff view of original resume vs. tailored resume
- [ ] Multi-language support
- [ ] Skill-gap and career pathway analysis
- [ ] Application tracking and pipeline analytics
- [ ] Course/certification recommendation layer
- [ ] Structured SEO content hubs

Historical note: local-only session restore was a V1 assumption. The current product now has Supabase auth, saved outputs, credits, and dashboard persistence.

## Non-goals

- LinkedIn or social analysis
- Job board scraping, recruiter tools
- Subscriptions, payments, analytics dashboards
- Any guarantee of interview selection or hiring outcome

## Platform and stack

- Platform: web
- Frontend: Next.js 14 App Router, TypeScript, Tailwind CSS
- Backend: Next.js API routes (same repo)
- Data: Supabase-backed account, credit, saved-output, and opportunity records where enabled
- Hosting: Vercel
- Auth: Supabase Auth

## Data model

Historical V1 browser session shape:

```
{
  resumeText: string,
  jobPostText: string,
  jdKeywords: { required: string[], preferred: string[] },
  gaps: { type: "tool" | "scope" | "metric" | "adjacent", detail: string }[],
  followUps: { id: string, question: string, answer: string }[],
  tailoredResume: string,
  tailoredCoverLetter: string,
  atsReport: { rule: string, passed: boolean, detail?: string }[],
  revisionPass: number
}
```

Current implementation also persists saved opportunities and generated outputs in Supabase. Opportunity-only records currently reuse the saved-output model and store extra workflow metadata in `analysis_snapshot` to avoid a premature schema expansion.

## Key screens / flows

1. **Landing** — short explanation, honest framing, "Start" button.
2. **Resume step** — upload or paste, shows extracted text in an editable box.
3. **Job posting step** — paste textarea.
4. **Review gaps + follow-ups** — shows detected gaps and up to 3 targeted questions.
5. **Generating…** — loading state while resume + cover letter are produced.
6. **Internal document check** — per-rule pass/fail; if any fail, revise-and-recheck loop runs automatically up to 3 passes.
7. **Results** — tailored resume and cover letter side-by-side, Copy and Download buttons, report visible.

## Follow-up question logic

Questions are generated from specific gap signals in the JD-vs-resume diff. None are generic career-coach questions.

- **Missing tool/platform** — JD names a tool/platform not present in the resume → "Have you used [tool]? If yes, briefly what for?"
- **Missing scope signal** — JD asks for leadership / client-facing / project ownership and resume has no such verbs or context → "Tell me about a time you led or owned something similar."
- **Missing measurable outcomes** — resume bullets are duty-based (no numbers) and JD emphasizes impact → "One accomplishment with a number (%, $, time saved)?"
- **Adjacent-but-unnamed experience** — JD requirement has no direct match but resume has adjacent work → "Does your [X role] experience cover [Y requirement]?"

Cap at 3 by default. Up to 5 only if gap score is high. Each question is one sentence and optional.

## Internal validation rules

The checker returns a per-rule pass/fail with a short reason. Rules:

1. Standard section headings present — at least Experience / Work History, Education, Skills.
2. Clean date formatting — `MMM YYYY – MMM YYYY` or `MMM YYYY – Present` on every role.
3. No exotic structure — no tables, no multi-column, no text embedded in images.
4. Keyword coverage — required skills/tools from the JD appear in the resume with ≥70% coverage.
5. Parseable work history — each role has company, title, dates, and at least one bullet.
6. Parseable education — institution, degree/credential, year.
7. Parseable skills — flat comma-or-line list, no nesting.
8. Recruiter- and parser-friendly formatting — no emojis, no decorative unicode, no headers/footers, no page numbers in body, bullets limited to `-` or `•`.
9. Length sanity — resume ≤ ~800 words, cover letter ≤ ~400 words.

If any rule fails, the failing rules and reasons are passed back to the LLM with an instruction to fix only those issues. Then re-run the checker. Max 3 revise passes. If still failing, show remaining warnings honestly.

## Design notes

- Tone: plain, practical, not hype-y. No "supercharge your job hunt" language.
- Keep the UI to one column, one step at a time.
- Accessibility: labels on every input, keyboard-navigable, WCAG AA contrast.

## Risks and open questions

- PDF/DOCX parsing quality varies wildly. The editable extracted-text step mitigates this but needs real testing.
- LLM generation can hallucinate experience if the user's answers are vague. Prompts must instruct: never invent employers, titles, dates, or metrics.
- Keyword matching is fuzzy — "JS" vs "JavaScript", "k8s" vs "Kubernetes". Need a light normalization step.
- Cost per run with Claude API depends on model choice; local dev will accumulate during iteration.

## Milestones

- [x] Prototype — structure, scaffolded routes and components
- [ ] MVP — parsing, analysis, generation, validation, revise loop, results UI
- [ ] Beta — real PDF/DOCX testing, prompt tuning, UX polish
- [ ] Launch — if Terry decides to deploy

