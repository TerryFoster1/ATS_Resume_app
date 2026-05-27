# Landing Page Architecture

Created: 2026-05-27

## Goal

Career Ladder needs public workflow landing pages that support SEO, AEO, GEO, and conversion without building a heavy CMS.

This pass adds a lightweight static architecture for major product workflows:

- `/career-discovery`
- `/career-transition`
- `/career-pathways`
- `/resume-builder`
- `/interview-prep`
- `/mock-interviews`
- `/master-career-profile`
- `/application-tracking`

## Implementation Pattern

Content lives in:

```text
src/lib/marketingPages.ts
```

Rendering lives in:

```text
src/components/MarketingLandingPage.tsx
```

Each route imports a shared page config and metadata helper.

This keeps the pages:

- server-rendered
- indexable
- easy to expand
- consistent with the existing design system
- separate from auth, Stripe, credits, generators, and persistence

## Metadata

Each page defines:

- title
- description
- canonical URL
- OpenGraph metadata
- Twitter metadata

The canonical host remains:

```text
https://www.careerladder.ca
```

## Sitemap

The new public workflow pages are included in:

```text
src/app/sitemap.ts
```

Private, authenticated, API, checkout, dashboard, and saved-output routes remain excluded from the sitemap.

## Content Strategy

The pages should become the top-level product architecture for:

- career discovery
- career transitions
- pathway analysis
- resume strategy
- interview prep
- mock interviews
- master career profile
- application tracking

Future SEO content hubs can link into these pages instead of leaving users in isolated articles.

## Intentionally Deferred

- no CMS
- no dynamic page generation from external content
- no affiliate or course marketplace UI
- no schema expansion beyond existing SEO-page infrastructure
- no changes to middleware, auth, Stripe, Supabase, or generation routes
