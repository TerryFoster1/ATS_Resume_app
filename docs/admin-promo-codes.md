# Admin Promo Codes

## Purpose

Promo codes support beta testers, early adopters, school pilots, future teacher accounts, and influencer campaigns without weakening Stripe. Promo credits behave like purchased credits once redeemed.

## Implementation

- Admin page: `/admin/promo-codes`
- User redemption: dashboard promo-code card
- Admin API: `/api/admin/promo-codes`
- User API: `/api/promo-codes/redeem`
- Storage:
  - `promo_codes`
  - `promo_code_redemptions`
  - `credit_ledger`
  - `profiles.credits`
- Atomic redemption function:
  - `public.redeem_promo_code(p_user_id, p_code)`

## Required Migration

Apply:

`20260529_admin_promo_codes.sql`

This migration is additive:

- Adds `profiles.beta_access_until`
- Creates promo-code tables
- Adds owner-readable redemption RLS
- Adds atomic redemption RPC

Rollback note:

- Remove the admin page/API from deployment first if rolling back application code.
- Drop `promo_code_redemptions`, `promo_codes`, `redeem_promo_code`, and `profiles.beta_access_until` only if promo beta data does not need to be preserved.

## Admin Access

Set one of:

- `ADMIN_EMAILS`
- `CAREER_LADDER_ADMIN_EMAILS`

Value format:

`admin@example.com,second@example.com`

If no admin email env var is set, no user can manage promo codes.

## Supported Code Types

- Fixed credit grants
- Free beta access flag
- Expiration dates
- Redemption limits
- Deactivation/reactivation
- Redemption tracking

## Production Safety

- Stripe checkout remains unchanged.
- Credits are still represented through `profiles.credits` and `credit_ledger`.
- Redemptions are atomic and duplicate-protected by database constraints.
- Promo-code creation is admin-gated by email allowlist and server-side checks.

## Validation

- `npm.cmd run build`: passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd audit`: passed with 0 vulnerabilities.
- Local smoke confirmed `/admin/promo-codes` redirects anonymous users to auth.
- Local smoke confirmed `/api/admin/promo-codes` returns 401 for anonymous users.
- Local smoke confirmed `/api/promo-codes/redeem` returns 401 for anonymous users.

## Deferred

- Public school/teacher bulk-code UI
- CSV export
- Influencer attribution dashboards
- Promo-code campaign analytics
- Admin roles in database instead of environment allowlist
