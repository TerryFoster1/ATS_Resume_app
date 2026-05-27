# Security Dependency Audit

Audit date: 2026-05-27

Scope: npm dependency audit only. No product features, auth rules, Stripe logic, Supabase configuration, middleware behavior, credit logic, generators, dashboard behavior, or production environment variables were intentionally changed.

## Commands Run

From:

```text
C:\Users\kathr\Documents\Claude CoWork Files\Projects\Apps\ats-resume-app\src
```

```powershell
npm.cmd audit
npm.cmd audit --json
npm.cmd view next@15.5.16 version peerDependencies engines
npm.cmd view next@16.2.6 peerDependencies engines version
npm.cmd view jspdf@4.2.1 peerDependencies engines version dependencies
npm.cmd install next@15.5.16 jspdf@4.2.1
npm.cmd audit fix
npm.cmd install
npm.cmd audit
npm.cmd run build
npm.cmd run typecheck
```

Local smoke check:

```text
/             200
/?step=intake 200
/?step=resume 200
/pricing      200
/dashboard    307 anonymous redirect
/profile      307 anonymous redirect
```

## Initial Audit Findings

Initial result:

```text
4 vulnerabilities
2 moderate
2 critical
```

### next

Status:

- direct dependency
- initial version: `14.2.15`
- initial severity reported by npm: critical
- production-impacting framework dependency

Representative advisories included:

- middleware authorization bypass
- middleware redirect handling / SSRF
- request smuggling in rewrites
- server component denial of service
- image optimization cache and content issues
- cache poisoning issues

npm suggested `npm audit fix --force`, which would have installed `next@16.2.6`.

Decision:

- Avoided jumping directly to Next 16.
- Chose the lower-risk patched major target available in the 15.x line.
- Installed `next@15.5.16`, then non-forced `npm audit fix` moved it to `next@15.5.18`.

### postcss

Status:

- transitive dependency under `next`
- vulnerable nested version: `next/node_modules/postcss@8.4.31`
- severity: moderate
- advisory: XSS via unescaped `</style>` in CSS stringify output

Decision:

- The root project already resolved `postcss@8.5.10`.
- Added an npm override so nested PostCSS resolves through the safe root `postcss` version:

```json
"overrides": {
  "postcss": "$postcss"
}
```

### jspdf

Status:

- direct dependency
- initial version: `2.5.2`
- initial severity reported by npm: critical
- used by client-side PDF export code

Representative advisories included:

- local file inclusion/path traversal
- PDF injection / arbitrary JavaScript execution in AcroForm-related paths
- DoS via malformed image dimensions
- object injection paths
- HTML injection paths

Decision:

- Updated to `jspdf@4.2.1`.
- This is a major upgrade, but it was required to remove the direct critical dependency finding.
- Build and typecheck passed after upgrade.

### dompurify

Status:

- transitive dependency through `jspdf`
- initial nested version: `2.5.9`
- severity: moderate

Decision:

- Updating `jspdf` moved `dompurify` to `3.4.6`, clearing the transitive advisory chain.

## Fixes Applied

Package changes:

- `next`: `14.2.15` -> `15.5.18`
- `jspdf`: `2.5.2` -> `4.2.1`
- `dompurify`: `2.5.9` -> `3.4.6` through `jspdf`
- `postcss`: root remains `8.5.10`; nested Next copy removed through npm override

Compatibility changes required by Next 15:

- `next.config.mjs`
  - moved `experimental.serverComponentsExternalPackages` to `serverExternalPackages`
- dynamic route/page signatures
  - updated dynamic `params` and page `searchParams` typings to the Next 15 promise-based shape
- `lib/supabase/server.ts`
  - added a narrow sync cookie-store type bridge for the existing Supabase SSR cookie adapter

## Final Audit Result

Final result:

```text
npm.cmd audit
found 0 vulnerabilities
```

Critical vulnerabilities remaining:

```text
0
```

Moderate vulnerabilities remaining:

```text
0
```

## Validation Results

```text
npm.cmd run build      PASS
npm.cmd run typecheck  PASS
npm.cmd audit          PASS, 0 vulnerabilities
```

Local route smoke:

- `/`: `200`
- `/?step=intake`: `200`
- `/?step=resume`: `200`
- `/pricing`: `200`
- `/dashboard`: `307` anonymous redirect
- `/profile`: `307` anonymous redirect

## Risk Assessment

Risk reduced:

- Removed npm-reported critical vulnerabilities from direct dependencies.
- Removed vulnerable nested DOMPurify through jsPDF upgrade.
- Removed vulnerable nested PostCSS through an npm override to the patched root PostCSS version.

Upgrade risk:

- `next` and `jspdf` were both major-version upgrades.
- The Next upgrade required compatibility changes, but build, typecheck, and local route smoke passed.
- PDF export was not manually exercised in-browser in this pass; that should be included in the next QA cycle because `jspdf` moved from 2.x to 4.x.

Deferred:

- No remaining npm audit vulnerabilities are deferred.
- Browser-level PDF export QA remains recommended before production deploy.
