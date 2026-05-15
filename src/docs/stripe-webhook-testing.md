# Stripe Webhook Testing

The app fulfills purchased credits from Stripe Checkout through:

`POST /api/stripe/webhook`

The webhook verifies the Stripe signature with `STRIPE_WEBHOOK_SECRET`, then handles `checkout.session.completed`.

## Required Environment Variables

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_5_CREDIT_PACK=
STRIPE_PRICE_10_CREDIT_PACK=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Local Stripe CLI Test

1. Start the app:

```bash
npm run dev
```

2. In another terminal, forward Stripe events to the local webhook:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

3. Copy the webhook signing secret printed by Stripe CLI into `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

4. Restart the app so the new env var is loaded.

5. Sign in to the app, buy a credit pack from `/pricing`, and complete Stripe Checkout.

6. Confirm server logs show:

- received event
- fulfilled purchase

7. Confirm Supabase updated:

- `purchases.status = completed`
- `credit_ledger` has one row for the checkout session
- `profiles.credits` increased by 5 or 10

## Duplicate Protection

Fulfillment checks `credit_ledger.stripe_checkout_session_id` and completed purchase status before adding credits. The schema also includes a unique index on non-null `credit_ledger.stripe_checkout_session_id` so replayed webhook events cannot add credits twice.

