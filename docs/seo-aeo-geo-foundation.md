# SEO, AEO, and GEO Foundation

Implemented: 2026-05-26

## Goal

Create a lightweight public acquisition foundation for Career Ladder without adding a CMS, changing production workflows, or destabilizing auth, Stripe, Supabase, credits, dashboard, or generation logic.

## Architecture Decisions

### Route structure

The following dynamic content hub routes now exist:

- `/interview-prep/[slug]`
- `/career-transitions/[slug]`
- `/resume-help/[slug]`
- `/cover-letters/[slug]`
- `/job-guides/[slug]`
- `/recruiter-insights/[slug]`

The routes share a renderer and metadata helper so future pages can be added through structured content config instead of one-off page components.

### Content structure pattern

Content lives in:

```text
src/lib/seoContent.ts
```

Each page is a typed object with:

- hub
- slug
- title
- description
- canonical path
- editorial sections
- optional recruiter-style questions
- FAQ entries
- CTA
- related links

Rendering is handled by:

```text
src/components/SeoLandingPage.tsx
src/lib/seoPageRoute.tsx
```

This avoids a heavy CMS while keeping the shape scalable enough for future content hubs.

## First Public Page

Primary production-quality example:

```text
/interview-prep/account-manager-interview-questions
```

The page includes:

- recruiter-aware positioning
- structured interview guidance
- sample recruiter-style questions
- "why likely" and "what they are testing" notes
- free preview funnel
- CTA into the Career Ladder intent-first workflow

Supporting internal-link pages were added for topical structure:

- `/resume-help/how-to-tailor-a-resume-for-a-job-posting`
- `/career-transitions/retail-to-customer-success`
- `/recruiter-insights/what-recruiters-look-for-in-a-resume`

These are intentionally lightweight and can be deepened later.

## Free-Preview Interview Funnel

The interview prep page includes:

```text
src/components/InterviewPrepPreviewFunnel.tsx
```

Users can enter:

- optional company
- optional posting excerpt

The component reveals:

- one recruiter-style question
- one recruiter insight
- one preparation recommendation

CTA:

```text
Unlock Full Interview Prep
```

This currently routes into the existing intent-first app flow. It does not alter pricing, Stripe products, credits, or account logic.

## Metadata and Schema

For SEO pages:

- `generateMetadata` sets title, description, canonical, OpenGraph, and Twitter metadata.
- `SeoJsonLd` emits lightweight JSON-LD:
  - Article schema
  - FAQ schema
  - Breadcrumb schema

The sitemap now includes configured SEO pages through the shared content registry.

## Internal Linking Foundation

SEO page config supports related links across hubs. The initial Account Manager page links to:

- resume tailoring
- retail-to-customer-success transition content
- recruiter resume-scan insight content

This is the beginning of a career intelligence library rather than a random blog-post structure.

## Homepage Positioning

Homepage copy was lightly refined only. The page now more clearly frames Career Ladder around:

- recruiter-aware career preparation
- resumes
- cover letters
- interview preparation
- career pathway preparation

No homepage redesign was done.

## Intentionally Deferred

- CMS integration
- database-backed blog/content tables
- programmatic generation of hundreds of pages
- affiliate links
- new Stripe products
- new middleware behavior
- dashboard redesign
- changes to auth, checkout, credits, or generation prompts

## Future Scaling Recommendations

- Add reusable hub index pages such as `/interview-prep/` and `/career-transitions/`.
- Add schema variants for HowTo pages where useful.
- Add content quality checks so pages remain recruiter-aware and non-generic.
- Add page-level analytics events for SEO CTA clicks.
- Expand content around job-seeker uncertainty, not just keyword targets.

## Validation

Commands run from `src`:

```powershell
npm.cmd run build
npm.cmd run typecheck
```

Results:

- Build: PASS
- Typecheck: PASS

Local production smoke checks:

- `/` rendered successfully.
- `/?step=intake` rendered successfully.
- `/?step=resume` rendered successfully.
- `/interview-prep/account-manager-interview-questions` rendered publicly with canonical metadata and JSON-LD.
- `/resume-help/how-to-tailor-a-resume-for-a-job-posting` rendered publicly with canonical metadata and JSON-LD.
- `/sitemap.xml` returned canonical `https://www.careerladder.ca` URLs, including the new SEO pages.
