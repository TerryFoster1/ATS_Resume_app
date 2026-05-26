# Career Ladder homepage SEO and crawler audit

Audit date: 2026-05-26

Production URL: `https://www.careerladder.ca`

Scope: homepage HTTP behavior, canonical redirects, initial HTML/SSR, metadata, robots/sitemap, middleware canonicalization, crawler visibility, and renderability signals. No product logic changes were made.

## Executive summary

The production homepage is reachable at the canonical `www` domain and returns a clean `200 OK`. The homepage is server-rendered with meaningful content in the initial HTML, including the hero headline, subheadline, navigation, CTA text, product proof copy, and the recruiter image markup. Simple crawler user agents receive the same meaningful HTML.

The main SEO gaps are configuration/content gaps rather than renderability failures:

- `robots.txt` returns `404`.
- `sitemap.xml` returns `404`.
- The homepage metadata is minimal.
- No canonical tag is emitted in the HTML.
- No OpenGraph tags are emitted.
- No Twitter card tags are emitted.
- Old immutable Vercel deployment hosts may not reliably redirect through app middleware if the deployment is protected or pruned at the Vercel edge before the app runs.

## Commands run

### Redirect and HTTP status checks

```powershell
curl.exe -I -L https://www.careerladder.ca/ --max-time 30
curl.exe -I -L https://careerladder.ca/ --max-time 30
curl.exe -I -L http://careerladder.ca/ --max-time 30
curl.exe -I -L http://www.careerladder.ca/ --max-time 30
```

Combined evidence summary:

```text
URL=https://www.careerladder.ca/
HTTP/1.1 200 OK
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
X-Matched-Path: /
X-Vercel-Cache: MISS

URL=https://careerladder.ca/
HTTP/1.1 307 Temporary Redirect
Location: https://www.careerladder.ca/
HTTP/1.1 200 OK

URL=http://careerladder.ca/
HTTP/1.0 308 Permanent Redirect
Location: https://careerladder.ca/
HTTP/1.0 307 Temporary Redirect
Location: https://www.careerladder.ca/
HTTP/1.0 200 OK

URL=http://www.careerladder.ca/
HTTP/1.0 308 Permanent Redirect
Location: https://www.careerladder.ca/
HTTP/1.0 200 OK
```

Result: PASS. The canonical `www` URL returns `200 OK`, and apex/http variants resolve to `https://www.careerladder.ca/`.

### Old Vercel deployment host checks

```powershell
curl.exe -I -L https://ats-resume-n00v612ao-terryfoster1s-projects.vercel.app/ --max-time 30
curl.exe -I -L https://ats-resume-bog0oks4g-terryfoster1s-projects.vercel.app/ --max-time 30
```

Evidence summary:

```text
https://ats-resume-n00v612ao-terryfoster1s-projects.vercel.app/
HTTP/1.1 401 Unauthorized
X-Robots-Tag: noindex

https://ats-resume-bog0oks4g-terryfoster1s-projects.vercel.app/
HTTP/1.1 404 Not Found
X-Vercel-Error: DEPLOYMENT_NOT_FOUND
```

Result: PARTIAL / EDGE-LAYER LIMITATION. The app middleware contains host normalization for `ats-resume*.vercel.app`, but Vercel can return `401` deployment protection or `DEPLOYMENT_NOT_FOUND` before the app middleware runs. This means the app-level canonical redirect cannot protect every stale immutable deployment URL once Vercel itself blocks or prunes the deployment.

### Raw homepage HTML / SSR check

```powershell
curl.exe --http1.1 -L https://www.careerladder.ca/ --retry 2 --retry-delay 2 --max-time 45 -o homepage.html
Select-String -Path homepage.html -Pattern "<title>|description|canonical|robots|og:|twitter:|Position your experience|You may already|Tailor my resume|Recruiter-style positioning" -CaseSensitive:$false | Select-Object -First 120
```

Evidence snippets from initial HTML:

```html
<title>Career Ladder</title>
<meta name="description" content="Position your real experience for specific roles with recruiter-style resume and cover letter guidance."/>

<h2 ...>Position your experience for the roles you actually want.</h2>
<p ...>You may already have the right experience. Your resume may just not be communicating it clearly. Upload your resume, paste the job description, answer recruiter-style follow-up questions, and generate tailored materials built around your real work.</p>
<a ... href="/?step=resume">Tailor my resume</a>
```

Result: PASS. The homepage is not a blank client-only shell. The hero headline and subheadline are present in the initial HTML before hydration.

JavaScript-disabled readability inference: PASS for core marketing content. Because the meaningful text and links are in the raw HTML, the homepage can be read by a no-JS crawler. Full interactive app flows still require client JavaScript.

### Metadata checks

```powershell
$html = Get-Content homepage.html -Raw
$checks = [ordered]@{
  title=($html -match '<title>Career Ladder</title>')
  description=($html -match '<meta name="description"')
  canonical=($html -match 'rel="canonical"')
  robots=($html -match '<meta name="robots"')
  ogTitle=($html -match 'property="og:title"')
  ogDescription=($html -match 'property="og:description"')
  ogUrl=($html -match 'property="og:url"')
  ogImage=($html -match 'property="og:image"')
  twitter=($html -match 'name="twitter:')
  hero=($html -match 'Position your experience for the roles you actually want\.')
  subheadline=($html -match 'You may already have the right experience')
}
$checks.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }
```

Evidence:

```text
title=True
description=True
canonical=False
robots=False
ogTitle=False
ogDescription=False
ogUrl=False
ogImage=False
twitter=False
hero=True
subheadline=True
```

Result: PARTIAL.

Current metadata:

- Title: PASS, but generic.
- Meta description: PASS.
- Canonical tag: FAIL / missing.
- Robots meta tag: NEUTRAL / missing. Missing robots meta does not block crawling, but an explicit `index, follow` can make intent clear.
- OpenGraph tags: FAIL / missing.
- Twitter card tags: FAIL / missing.

Likely source:

```tsx
// src/app/layout.tsx
export const metadata: Metadata = {
  title: "Career Ladder",
  description:
    "Position your real experience for specific roles with recruiter-style resume and cover letter guidance."
};
```

### Robots and sitemap checks

```powershell
curl.exe -i https://www.careerladder.ca/robots.txt --max-time 30
curl.exe -i https://www.careerladder.ca/sitemap.xml --max-time 30

curl.exe -s -o NUL -w "robots status=%{http_code} final=%{url_effective} size=%{size_download}`n" https://www.careerladder.ca/robots.txt
curl.exe -s -o NUL -w "sitemap status=%{http_code} final=%{url_effective} size=%{size_download}`n" https://www.careerladder.ca/sitemap.xml
```

Evidence:

```text
robots status=404 final=https://www.careerladder.ca/robots.txt size=9325
sitemap status=404 final=https://www.careerladder.ca/sitemap.xml size=9325
```

Result: FAIL.

`robots.txt` and `sitemap.xml` are not implemented. The 404 page includes `meta name="robots" content="noindex"` because it is a Next not-found page, but that noindex applies to the 404 response, not to the homepage.

Expected low-risk fix later:

- Add `src/app/robots.ts`.
- Add `src/app/sitemap.ts`.
- Use canonical `https://www.careerladder.ca` URLs.

### Middleware and canonical URL helper inspection

Files inspected:

```powershell
Get-Content src\lib\canonicalUrl.ts
Get-Content src\middleware.ts
```

Relevant code behavior:

```ts
export const CANONICAL_APP_HOST = "www.careerladder.ca";
export const CANONICAL_APP_ORIGIN = `https://${CANONICAL_APP_HOST}`;

export function isVercelDeploymentHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host.endsWith(".vercel.app") && /^ats-resume(?:-app)?[-a-z0-9]*\./.test(host);
}
```

```ts
function shouldCanonicalizeHost(host: string) {
  if (host === CANONICAL_APP_HOST) return false;
  if (isLocalHost(host)) return false;
  if (host === "careerladder.ca") return true;
  return isVercelDeploymentHost(host);
}
```

Result: PASS for normal production traffic. `www.careerladder.ca` is not redirected, and `careerladder.ca` is redirected to the canonical host. The old Vercel URL normalization is scoped to app/page/API requests and should not interfere with normal production homepage requests.

Observation: middleware uses `302` for app-level canonicalization. This is safe for auth-flow stability but less ideal for SEO canonical consolidation than `308` or `301`. Because prior work had sensitive auth/canonical redirect issues, this audit does not recommend changing it blindly without regression testing auth and checkout callbacks.

### Crawler user-agent checks

```powershell
foreach ($ua in @(
  'curl-default',
  'Googlebot/2.1 (+http://www.google.com/bot.html)',
  'Twitterbot/1.0',
  'LinkedInBot/1.0',
  'ChatGPT-User/1.0'
)) {
  $safe = $ua -replace '[^A-Za-z0-9]+','-'
  $out = "crawler-$safe.html"
  if ($ua -eq 'curl-default') {
    curl.exe --http1.1 -L 'https://www.careerladder.ca/' --max-time 45 -o $out -w "UA=$ua STATUS=%{http_code} SIZE=%{size_download} FINAL=%{url_effective}`n"
  } else {
    curl.exe --http1.1 -A $ua -L 'https://www.careerladder.ca/' --max-time 45 -o $out -w "UA=$ua STATUS=%{http_code} SIZE=%{size_download} FINAL=%{url_effective}`n"
  }
}
```

Evidence summary:

```text
UA=curl-default STATUS=200 SIZE=29907 FINAL=https://www.careerladder.ca/
UA=Googlebot/2.1 (+http://www.google.com/bot.html) STATUS=200 SIZE=29907 FINAL=https://www.careerladder.ca/
UA=Twitterbot/1.0 STATUS=200 SIZE=29907 FINAL=https://www.careerladder.ca/
UA=LinkedInBot/1.0 STATUS=200 SIZE=29907 FINAL=https://www.careerladder.ca/
UA=ChatGPT-User/1.0 STATUS=200 SIZE=29907 FINAL=https://www.careerladder.ca/
```

Follow-up content check:

```powershell
foreach ($f in Get-ChildItem -Filter 'crawler-*.html') {
  $html = Get-Content $f.FullName -Raw
  $name=$f.Name
  $hasHero=$html -match 'Position your experience for the roles you actually want\.'
  $hasNoindex=$html -match '<meta name="robots" content="noindex"'
  "$name hero=$hasHero explicitNoindex=$hasNoindex bytes=$($f.Length)"
}
```

Evidence summary:

```text
crawler-ChatGPT-User-1-0.html hero=True explicitNoindex=False bytes=29907
crawler-curl-default.html hero=True explicitNoindex=False bytes=29907
crawler-Googlebot-2-1-http-www-google-com-bot-html-.html hero=True explicitNoindex=False bytes=29907
crawler-LinkedInBot-1-0.html hero=True explicitNoindex=False bytes=29907
crawler-Twitterbot-1-0.html hero=True explicitNoindex=False bytes=29907
```

Result: PASS. Common crawler user agents receive meaningful HTML and are not served a crawler-specific block or noindex homepage.

Note: the raw Next payload includes a serialized fallback not-found component string in script data. That is normal for the app router shell and is not the rendered page response; the HTTP status is `200`, and the visible initial document contains the homepage.

### Lighthouse / browser console / hydration

Checks attempted:

```powershell
Get-ChildItem node_modules\.bin -Filter lighthouse* -ErrorAction SilentlyContinue
Get-ChildItem node_modules\.bin -Filter playwright* -ErrorAction SilentlyContinue
Test-Path node_modules\playwright
Test-Path node_modules\@playwright\test
```

Evidence:

```text
False
False
```

Result: NOT RUN in this pass. Lighthouse and Playwright are not installed in the repo. Because the request was to audit first and avoid product changes, I did not add new dependencies just to run browser automation.

Renderability risk from static evidence: LOW. The homepage has meaningful initial HTML and crawler user agents receive the SSR content. Browser-level console and hydration checks still need a Playwright/Lighthouse run or Vercel/browser automation.

## Findings

### 1. Homepage HTTP and canonical domain

Status: PASS

`https://www.careerladder.ca/` returns `200 OK`, and the tested apex/http variants resolve to the canonical www HTTPS URL.

### 2. Initial HTML and SSR

Status: PASS

The homepage contains server-rendered, meaningful content in raw HTML. The hero headline and subheadline are present before client hydration.

### 3. Metadata completeness

Status: FAIL / INCOMPLETE

The page has a title and description but lacks canonical, OpenGraph, and Twitter card metadata. This is the largest non-renderability SEO gap.

Recommended minimal fix:

- Expand `metadata` in `src/app/layout.tsx` with:
  - `metadataBase`
  - stronger title template/default
  - canonical alternate for `/`
  - robots index/follow
  - OpenGraph title/description/url/siteName/type/images
  - Twitter card/title/description/images

### 4. Robots and sitemap

Status: FAIL

Both `robots.txt` and `sitemap.xml` return `404`.

Recommended minimal fix:

- Add `src/app/robots.ts`.
- Add `src/app/sitemap.ts`.
- Include canonical URLs for at least:
  - `/`
  - `/pricing`
  - `/auth`
  - `/privacy`
  - `/terms`
  - `/refund-policy`
  - `/support`

Consider whether `/dashboard` should be excluded because it is authenticated/account-specific.

### 5. Middleware/canonical URL logic

Status: PASS with edge caveat

Middleware does not interfere with canonical production homepage traffic. It correctly targets apex and app-owned Vercel deployment hosts for canonicalization.

Edge caveat: if Vercel deployment protection or pruned deployment handling returns `401`/`DEPLOYMENT_NOT_FOUND` before the app executes, app middleware cannot redirect that old host.

### 6. Crawler visibility

Status: PASS

Default curl, Googlebot, Twitterbot, LinkedInBot, and ChatGPT-User received `200` HTML with the hero content.

### 7. Performance/hydration

Status: PARTIAL / NOT FULLY TESTED

Static evidence looks healthy for renderability. A browser-based Lighthouse/console pass was not completed because Lighthouse/Playwright are not installed in the repo.

## Recommended next minimal fixes

These are low-risk SEO infrastructure fixes and do not require product logic changes:

1. Add complete homepage metadata in `src/app/layout.tsx`.
2. Add `src/app/robots.ts`.
3. Add `src/app/sitemap.ts`.
4. Add or choose an OG image. The existing `/career-ladder-recruiter-interview.jpg` can work temporarily, though a purpose-built social preview image would be better.
5. Re-run:
   - redirect checks
   - raw HTML metadata checks
   - robots/sitemap checks
   - crawler user-agent checks
6. Optionally add a browser automation dependency or use external Lighthouse/PageSpeed to capture hydration and performance evidence.

## Files changed in this audit

- `docs/homepage-seo-crawler-audit.md`

No app code, product logic, middleware, auth, Stripe, Supabase, generation, or dashboard files were changed.

## Fixes Implemented

Implementation date: 2026-05-26

Implemented the low-risk SEO/crawler fixes identified above. No auth, Stripe, Supabase, generation, dashboard, middleware, or visual design logic was changed.

### Files changed

- `src/app/layout.tsx`
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `docs/homepage-seo-crawler-audit.md`

### Metadata implemented

`src/app/layout.tsx` now emits:

- Title: `Career Ladder | AI Resume, Cover Letter & Interview Prep`
- Description: `Career Ladder helps you tailor your resume, cover letter, and interview prep to specific job postings so you can position your experience with more confidence.`
- Canonical URL: `https://www.careerladder.ca`
- Robots: `index, follow`
- OpenGraph:
  - `og:title`
  - `og:description`
  - `og:url`
  - `og:site_name`
  - `og:type`
  - `og:image`
- Twitter card:
  - `twitter:card`
  - `twitter:title`
  - `twitter:description`
  - `twitter:image`

The existing public image `/career-ladder-recruiter-interview.jpg` is used as the OpenGraph/Twitter image.

### Robots implemented

`src/app/robots.ts` now serves `/robots.txt` with:

```text
User-Agent: *
Allow: /
Disallow: /api/
Disallow: /checkout/
Disallow: /dashboard/
Disallow: /outputs/

Sitemap: https://www.careerladder.ca/sitemap.xml
```

This allows normal public crawling while keeping API, checkout, dashboard, and saved-output paths out of crawler scope.

### Sitemap implemented

`src/app/sitemap.ts` now serves `/sitemap.xml` with canonical production URLs only:

```text
https://www.careerladder.ca/
https://www.careerladder.ca/pricing
https://www.careerladder.ca/privacy
https://www.careerladder.ca/terms
https://www.careerladder.ca/refund-policy
https://www.careerladder.ca/support
```

Excluded from sitemap:

- `/auth`
- `/dashboard`
- `/checkout`
- `/outputs/*`
- `/api/*`
- user-specific/account-specific routes

### Verification after implementation

Build and typecheck:

```powershell
cd "C:\Users\kathr\Documents\Claude CoWork Files\Projects\Apps\ats-resume-app\src"
npm.cmd run build
npm.cmd run typecheck
```

Results:

```text
npm.cmd run build: PASS
npm.cmd run typecheck: PASS
```

Note: running `npm.cmd run typecheck` before a fresh `.next/types` generation can fail in this repo because `tsconfig.json` includes `.next/types/**/*.ts`. After `npm.cmd run build` regenerated `.next/types`, typecheck passed.

Local production server verification:

```powershell
$job = Start-Job -ScriptBlock {
  Set-Location 'C:\Users\kathr\Documents\Claude CoWork Files\Projects\Apps\ats-resume-app\src'
  npm.cmd run start -- -p 3010
}
Start-Sleep -Seconds 5
curl.exe -I http://localhost:3010/ --max-time 15
curl.exe -s -o NUL -w "robots status=%{http_code} content_type=%{content_type}`n" http://localhost:3010/robots.txt
curl.exe -s http://localhost:3010/robots.txt --max-time 15
curl.exe -s -o NUL -w "sitemap status=%{http_code} content_type=%{content_type}`n" http://localhost:3010/sitemap.xml
curl.exe -s http://localhost:3010/sitemap.xml --max-time 15
curl.exe -s http://localhost:3010/ --max-time 15 -o homepage-local.html
```

Results:

```text
GET /: HTTP/1.1 200 OK
GET /robots.txt: status=200 content_type=text/plain
GET /sitemap.xml: status=200 content_type=application/xml
```

Metadata checks against local production HTML:

```text
rel="canonical"=True
property="og:title"=True
property="og:description"=True
property="og:url"=True
property="og:type"=True
property="og:image"=True
name="twitter:card"=True
name="twitter:title"=True
name="twitter:description"=True
name="twitter:image"=True
```

Sitemap root evidence:

```xml
<loc>https://www.careerladder.ca/</loc>
```

Middleware/auth behavior:

- `src/middleware.ts` was not changed.
- `src/lib/canonicalUrl.ts` was not changed.
- Auth, checkout, dashboard, saved-output, API, and generation routes were not changed.
