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
- Lint: NOT RUNNABLE without configuration. `npm.cmd run lint` opens Next.js' interactive ESLint setup prompt.

Local production smoke checks:

- `/` rendered successfully.
- `/?step=intake` rendered successfully.
- `/?step=resume` rendered successfully.
- `/interview-prep/account-manager-interview-questions` rendered publicly with canonical metadata and JSON-LD.
- `/resume-help/how-to-tailor-a-resume-for-a-job-posting` rendered publicly with canonical metadata and JSON-LD.
- `/sitemap.xml` returned canonical `https://www.careerladder.ca` URLs, including the new SEO pages.

## Production-readiness QA pass - 2026-05-26

Validated on commit `ed702a6` plus documentation-only QA fixes.

### Public route checks

Local production server confirmed:

- `/` -> `200`
- `/sitemap.xml` -> `200`
- `/robots.txt` -> `200`
- `/interview-prep/account-manager-interview-questions` -> `200`
- `/resume-help/how-to-tailor-a-resume-for-a-job-posting` -> `200`
- `/career-transitions/retail-to-customer-success` -> `200`
- `/recruiter-insights/what-recruiters-look-for-in-a-resume` -> `200`
- `/interview-prep/not-a-real-page` -> `404`
- `/cover-letters/not-a-real-page` -> `404`
- `/job-guides/not-a-real-page` -> `404`

### Metadata checks

Raw HTML for `/interview-prep/account-manager-interview-questions` includes:

- `<title>`
- meta description
- canonical link
- OpenGraph title
- Twitter card
- JSON-LD

### Sitemap checks

The sitemap includes only public canonical URLs. It includes the SEO pages and excludes:

- `/dashboard`
- `/auth`
- `/api`
- `/outputs`
- `/checkout`

### Free-preview funnel checks

The Account Manager interview page renders the free preview panel with:

- optional company input
- optional posting excerpt input
- one recruiter-style question
- one recruiter insight
- one preparation recommendation
- CTA into the existing intent-first workflow

No checkout, auth, or credit behavior is triggered from the public page itself.

### Fixes made during QA

- Updated stale planning copy in `docs/intent-first-workflow.md` that still described Career Pathway as a disabled placeholder.

### Remaining known limitations

- `/cover-letters/[slug]` and `/job-guides/[slug]` are route foundations only until real content objects are added.
- Browser automation against localhost was not used in this pass; local production HTTP checks were used for route, status, metadata, sitemap, and API validation.

### Production deployment checklist

- Build from commit with the QA documentation fixes.
- Verify production `/sitemap.xml` includes the new canonical SEO URLs.
- Verify production `/interview-prep/account-manager-interview-questions` returns `200` and contains JSON-LD.
- Submit or refresh sitemap in search tooling after production deploy.

## Production deployment record - 2026-05-26

Application commit deployed: `ad0fc48456e1e9d71d6fd5a618471a1bd0d7a8c5`

Production URL: `https://www.careerladder.ca`

Vercel deployment:

- Deployment URL: `https://ats-resume-hmwgx7ml4-terryfoster1s-projects.vercel.app`
- Target: production
- Status: Ready
- Aliases include `https://www.careerladder.ca` and `https://careerladder.ca`

Pre-deploy validation:

- `npm.cmd run build`: PASS
- `npm.cmd run typecheck`: PASS after rerunning separately from the build. The first parallel run collided with `.next/types` generation.
- `npm.cmd run lint`: NOT RUNNABLE without choosing an ESLint setup. `next lint` opens the interactive configuration prompt.

Production smoke checks:

- `/` -> `200`
- `/sitemap.xml` -> `200`
- `/robots.txt` -> `200`
- `/interview-prep/account-manager-interview-questions` -> `200`
- `/resume-help/how-to-tailor-a-resume-for-a-job-posting` -> `200`
- `/pricing` -> `200`
- `/auth` -> `200`
- `/?step=resume` -> `200`
- `/?step=intake` -> `200`
- `/dashboard` redirects anonymous traffic to `/auth?next=/dashboard`

SEO evidence:

- Production `/sitemap.xml` uses canonical `https://www.careerladder.ca` URLs.
- Production interview-prep HTML includes title, description, canonical, OpenGraph, Twitter metadata, and JSON-LD.
- The Account Manager page renders the free-preview CTA `Unlock Full Interview Prep`.

Deployment logs:

- Vercel runtime logs during the smoke window showed expected `200` and `307` responses.
- No Stripe webhook errors, Stripe environment errors, or API failures appeared in the fetched deployment logs.

Known QA limitations:

- No live paid Stripe checkout was run.
- Google OAuth was not completed interactively in this deployment documentation pass; `/auth` renders and protected dashboard redirect behavior was verified.
- Full signed-in resume generation, cover letter generation, pathway unlock, and saved-output reopen were not executed end-to-end during this deployment pass.
