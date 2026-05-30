# Intelligence refinement sprint

Date: 2026-05-26

## Goal

This sprint refined Career Ladder from a functional career workflow platform toward a more recruiter-aware career intelligence system.

The work intentionally avoided new major workflows, Stripe changes, auth changes, credit changes, middleware changes, dashboard persistence changes, SEO route changes, and generation architecture rewrites.

## Intelligence improvements

### Interview prep

The interview prep prompt now asks the model to reason more like a recruiter preparing a screening conversation:

- identify what the hiring team is trying to prove
- name likely doubts or risk areas
- explain what evidence would reduce those concerns
- include likely follow-up questions
- frame platform or hard-skill gaps honestly
- translate adjacent experience only when credible

The prompt now explicitly supports common career transitions:

- retail to customer success
- hospitality to operations
- journalism to marketing
- service industry to account management
- trades to project coordination

The output strategy still uses the existing markdown structure and saved-output display. No storage or endpoint schema changed.

### Mock interview

Mock interview question generation now prioritizes recruiter-realistic pressure points:

- fit
- proof
- risk
- communication
- motivation
- role-specific judgment
- follow-up pressure on weak or missing areas

Mock interview feedback now asks the evaluator to explain how a recruiter or hiring manager would likely interpret each answer. It separates credible transferable framing from overclaiming and asks for missing proof types such as metrics, customer examples, tool ownership, decisions, tradeoffs, or outcomes.

The stored mock interview structure did not change.

### Career pathway

Pathway analysis now has stronger guidance around:

- how hiring teams evaluate the transition
- true skill gaps versus communication or evidence gaps
- practical sequencing for fastest-path recommendations
- free or low-cost ways to build proof before recommending expensive programs
- realistic role positioning without salary promises or instant-transition claims

The deterministic free preview now frames roles around hiring-team concerns, not generic skill lists.

Transferable-skill preview logic was expanded for:

- retail or customer service into customer success or account management
- hospitality into operations or coordination
- journalism or communications into marketing
- service work into account-facing roles
- trades or field work into project coordination

## UX polish decisions

Loading and transition copy was refined to make the system feel analytical rather than mechanical:

- job-post analysis now says it is reading the posting like a recruiter
- document generation now says it is translating experience into role-specific evidence
- mock interview generation now references saved experience, proof gaps, and recruiter-style practice questions

Homepage and onboarding copy was tightened around Career Ladder as a recruiter-aware career preparation system rather than a resume utility. The language now emphasizes the recruiter lens, proof, role alignment, transferable framing, and credible next steps.

Saved pathway presentation copy now emphasizes recruiter interpretation, transferable strengths, proof gaps, practical sequencing, and realistic role-positioning strategy.

## Cohesion strategy

The refinement keeps Career Ladder's workflows connected through the same shared context:

- role and posting context drive resume, interview, mock interview, and pathway workflows
- uploaded resume evidence can personalize interview and pathway records without creating fake resume panels
- pathway outputs are framed as guidance that can naturally inform interview prep and resume positioning
- mock interview feedback evaluates answers against the same saved application context

This keeps the product moving toward one evolving career intelligence layer without introducing a new architecture.

## What was intentionally not changed

- No Stripe products, prices, checkout routes, or webhook behavior changed.
- No auth, Supabase, or middleware behavior changed.
- No credit consumption logic changed.
- No database migration was added.
- No resume or cover letter generation endpoint was rewritten.
- No saved-output or dashboard persistence model changed.
- No SEO route architecture changed.
- No major visual redesign was performed.

## Future refinement

Recommended next refinements:

- add structured recruiter-concern fields to saved analysis snapshots
- make pathway outputs directly seed interview prep themes
- add more deterministic transferable-skill detection for common transitions
- add regression prompts for high-value transitions such as retail to customer success and hospitality to operations
- add authenticated QA coverage for credit-backed pathway and mock interview flows
- add visual QA for the refined loading and saved-output states on mobile

## Intelligence quality sprint - 2026-05-29

This follow-up pass focused on the product's strongest differentiator: helping users understand how real experience translates into recruiter-readable professional functions.

### Shared transferable-skill engine

`src/lib/careerIntelligence.ts` now carries richer deterministic signals:

- mapped professional functions
- recruiter-readable language
- evidence examples to look for
- adjacent career directions
- confidence level
- recruiter concerns

The helper now covers more grounded transition patterns:

- chef or kitchen work -> operations management, inventory, scheduling, vendor coordination, staff training, quality control
- hospitality -> client management, service delivery, stakeholder communication, account support
- retail -> customer success, onboarding, conflict resolution, account management, coaching, KPI awareness
- journalism -> content strategy, communications, research, stakeholder interviewing
- trades -> project coordination, vendor management, safety, quality assurance
- school, sports, clubs, volunteering, side hustles, and family-business work -> first-resume evidence

### Career Coach

Career Coach now presents recommendations with more strategic sections:

- why this could be realistic
- day in the life
- salary expectations with cautious language
- AI disruption risk
- what recruiters will want proof of
- fastest path
- lowest-cost path
- likely challenges
- recruiter concerns

This keeps the experience from feeling like a personality quiz and makes it closer to a career counselor plus recruiter plus transition strategist.

### Pathway intelligence

Pathway generation now receives detected transferable-skill signals, recruiter language, evidence examples, recruiter concerns, and adjacent transition logic. New pathway outputs can include recruiter concerns, suggested credentials, expected timeline, broad salary context, and day-in-the-life notes.

Existing saved pathway records remain backward compatible because these added fields are optional when reopening old snapshots.

### First resume and discovery

The first-resume flow now surfaces overlooked evidence sources such as clubs, sports, volunteering, community work, family-business work, side hustles, and creative projects. The discovery flow can now show early transition ideas with the first move needed to test that path.

### What was intentionally not changed

- No new product modules were added.
- No teacher accounts, affiliate systems, tracking, offer comparison, or new monetization were added.
- No Stripe, auth, middleware, credit, dashboard, SEO, or database behavior changed.
- No extra generation pass was added; the richer deterministic context is reused by existing workflows.

## Production-readiness QA - 2026-05-29

Verified code commit:

```text
d6a226d21903d81a64a965f1796744dd1d7bfc48
```

Commits pending deployment at the time of QA:

```text
2f4ad5f Document transferable skill translation strategy
114578a Evolve homepage and public landing pages
d89456a Fix dependency audit vulnerabilities
237f8a5 Implement opportunity tracking MVP
83d23ea Refine career intelligence experience
713d09e Add beta launch readiness foundations
d6a226d Deepen career intelligence reasoning
```

### Validation commands

Run from:

```text
C:\Users\kathr\Documents\Claude CoWork Files\Projects\Apps\ats-resume-app\src
```

Results:

- `npm.cmd run build`: PASS
- `npm.cmd run typecheck`: PASS
- `npm.cmd audit`: PASS, 0 vulnerabilities

### Intelligence scenario checks

Career Coach:

- Tested a lost or uncertain laid-off retail/service scenario through the deterministic Career Coach reasoning layer.
- Output returned 3 career matches.
- Output included why it fits, day in the life, salary expectations, credentials, fastest path, lowest-cost path, hiring outlook, AI disruption risk, recruiter expectations, likely challenges, recruiter concerns, and transferable strengths.
- Top match for the test scenario was `Customer Success Associate`, grounded in retail/service, escalation, training, targets, and stability/flexibility constraints.

Career Transition:

- Chef or kitchen lead scenario produced operations-oriented transferable skills: operations management, inventory control, vendor coordination, workforce scheduling, staff training, quality control, and process optimization.
- Retail manager scenario produced customer success/account support skills before upskilling.
- Hospitality scenario produced client management, service delivery, stakeholder communication, escalation handling, and account support.
- The reasoning explained why the transition could be realistic and did not fabricate credentials.

First Resume:

- Verified the first-resume flow includes overlooked experience prompts and examples for clubs, sports, volunteering, community help, family business, side hustles, recognition, awards, school/community activities, and trusted responsibility.
- The flow now explains how these can become recruiter-readable evidence rather than treating them as blank resume fields.

### Route smoke

Local production server checks:

- `/`: 200
- `/career-coach`: 200
- `/career-discovery`: 200
- `/career-pathways`: 200
- `/?step=intake`: 200
- `/?step=resume`: 200
- `/pricing`: 200
- `/sitemap.xml`: 200
- `/robots.txt`: 200
- `/dashboard`: 307 to `/auth?next=/dashboard`
- `/profile`: 307 to `/auth?next=/profile`

Anonymous API guard checks:

- `POST /api/career-profile`: 401
- `POST /api/opportunities`: 401
- `POST /api/outputs/fake-id/pathway`: 401

### Known QA limitations

- This local QA environment did not have an authenticated browser session or QA credentials available, so signed-in profile persistence, resume-upload profile enrichment, and credit-consuming unlock flows were not re-mutated locally in this pass.
- The sprint did not modify auth, Stripe, credit consumption, middleware, profile persistence routes, or dashboard persistence logic.
- Live post-deploy smoke should still verify authenticated profile load and one known-credit pathway/interview workflow using a QA account before public beta outreach.

## Production deployment record - 2026-05-29

Production deployment:

- Deployed code commit: `eeeff91` containing verified Intelligence Quality Sprint commit `d6a226d`
- Deployment ID: `dpl_7HnKrNfWEM17J64xkPr4cGqJtKX7`
- Deployment URL: `https://ats-resume-7b5lpsynb-terryfoster1s-projects.vercel.app`
- Production URL: `https://www.careerladder.ca`
- Vercel status: Ready
- Production alias confirmed: `https://www.careerladder.ca`

Vercel build results:

- Install audit during deployment: 0 vulnerabilities
- `npm run build`: PASS
- Static generation: 38/38 pages
- Production aliasing: PASS

Live smoke results:

- `/`: 200
- `/career-coach`: 200
- `/career-discovery`: 200
- `/career-pathways`: 200
- `/?step=intake`: 200
- `/?step=resume`: 200
- `/pricing`: 200
- `/sitemap.xml`: 200, `Content-Type: application/xml`
- `/robots.txt`: 200, `Content-Type: text/plain`
- `/dashboard`: 307 to `/auth?next=/dashboard`
- `/profile`: 307 to `/auth?next=/profile`

Remaining post-deploy limitation:

- Authenticated Master Profile mutation, resume-upload enrichment, and credit-consuming pathway/interview unlocks should still be rechecked with a signed-in QA account before public beta outreach. This sprint did not change those routes or credit logic.

## Validation

Commands to run from:

```text
C:\Users\kathr\Documents\Claude CoWork Files\Projects\Apps\ats-resume-app\src
```

```powershell
npm.cmd run build
npm.cmd run typecheck
```

### Results

```powershell
npm.cmd run build
```

Result: PASS

Evidence:

```text
Compiled successfully
Generating static pages (29/29)
```

```powershell
npm.cmd run typecheck
```

Result: PASS

### Local production smoke check

Started the local production server:

```powershell
npm.cmd run start -- -p 3028
```

Checked:

```text
/             200
/?step=intake 200
/?step=resume 200
/pricing      200
```

These checks confirm the homepage, goal-first entry, old resume-first entry, and pricing page still render after the refinement pass.
