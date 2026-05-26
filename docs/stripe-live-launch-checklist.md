# Stripe Live Launch Checklist

Career Ladder uses Stripe Checkout for one-time credit pack purchases.

## Required Production Environment Variables

Set these in Vercel Production before accepting live payments:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_5_CREDIT_PACK`
- `STRIPE_PRICE_10_CREDIT_PACK`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL=https://www.careerladder.ca`

Do not put live Stripe secrets in client code or committed env files.

## Live Mode Requirements

- `STRIPE_SECRET_KEY` must be a live secret key.
- `STRIPE_PRICE_5_CREDIT_PACK` and `STRIPE_PRICE_10_CREDIT_PACK` must be live-mode Stripe Price IDs from the same Stripe account.
- Do not mix a test secret key with live Price IDs, or a live secret key with test Price IDs.
- Confirm both live prices are active and match the public pricing:
  - 5 Credit Pack, $19.99
  - 10 Credit Pack, $39.99

## Webhook

Configure a live Stripe webhook endpoint:

`https://www.careerladder.ca/api/stripe/webhook`

Required event:

- `checkout.session.completed`

Copy the live webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## Fulfillment Safety

The app expects every Checkout Session to include:

- `client_reference_id`
- `metadata.userId`
- `metadata.pack`

Credit fulfillment is idempotent by Stripe Checkout Session ID. Both the webhook and the checkout verification fallback may run, but the same session must not grant credits twice.

## Final Live Smoke Test

After switching Vercel Production to live keys and redeploying:

1. Sign in to Career Ladder.
2. Buy the 5 Credit Pack with a real card.
3. Confirm Stripe returns to `https://www.careerladder.ca/checkout/success`.
4. Confirm credits appear in the header and dashboard.
5. Unlock one resume export.
6. Confirm exactly 1 credit is consumed.
7. Refresh the saved output and confirm the unlock persists.
8. Confirm the Stripe Dashboard shows one completed payment and one fulfilled credit ledger entry.
