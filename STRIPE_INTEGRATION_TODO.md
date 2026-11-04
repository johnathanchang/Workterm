# Stripe integration: what is left

Scenario: an existing Checkout Session call was found, so only its parameters were updated. No new files or routes.

## Values to replace

**Files:** [apps/api/src/stripe.ts](apps/api/src/stripe.ts)

Nothing is a placeholder. `mode`, `success_url`, `cancel_url` and `line_items` already hold real values:

| Field | Current value | Note |
|-------|---------------|------|
| mode | `subscription` (Monthly) or `payment` (Per term) | Matches the plan. |
| success_url | `WEB_ORIGIN/#/welcome` | Set `WEB_ORIGIN` per environment. |
| cancel_url | `WEB_ORIGIN/#/pricing` | Same. |
| line_items | inline `price_data` ($25 a month, $45 for 4 months, USD) | No dashboard Price IDs needed. Change prices in `PLANS`. |

## Configured parameters

**Files:** [apps/api/src/stripe.ts](apps/api/src/stripe.ts)

| Parameter | Value |
|-----------|-------|
| ui_mode | hosted_page |
| billing_address_collection | auto |
| phone_number_collection | enabled: true |
| automatic_tax | enabled: false |
| allow_promotion_codes | true |
| payment_method_collection | always (subscriptions only) |
| submit_type | auto (one-time payments only) |
| saved_payment_method_options | payment_method_save: enabled |
| integration_identifier | hosted_web_0001 |
| origin_context | web |

## Things to check

- **ui_mode version.** We use plain `fetch`, not the Stripe SDK, so there is no SDK version to read. `hosted_page` is sent as the default. If Stripe rejects it with an "invalid ui_mode" error, use `hosted` instead.
- **Stripe API version.** Left unset, so your account default applies.
- **payment_method_collection** is only accepted by Stripe for subscriptions, and **submit_type** only for one-time payments, so each is sent for one plan only.
- **saved_payment_method_options** may need a Stripe customer. If a test checkout errors on it, tell us and we will adjust.
- **Promo codes** are on. Create codes in the Stripe dashboard (Product catalog, Coupons).
- **Phone number** is now collected at checkout (personal data, keep the minimum, see AGENTS.md rule 7).

## Setup

1. Copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars`. Set `STRIPE_SECRET_KEY` (`sk_test_…`) and `STRIPE_WEBHOOK_SECRET` (`whsec_…`). Never commit this file.
2. Run `stripe listen --forward-to localhost:8787/webhooks/stripe` and use the `whsec_` it prints.
3. `bun dev`, then open http://localhost:5173/#/pricing.

## How it works

1. Student picks a plan on `#/pricing`. The web app calls `POST /checkout`.
2. The Worker creates a Checkout Session and returns its URL. The browser goes to Stripe's page.
3. After paying, Stripe sends the student to `#/welcome` and calls `POST /webhooks/stripe`.
4. The webhook (signature checked, each event handled once) writes the `entitlements` table.
5. `GET /me/entitlements` is the only "is this student paid?" check.

## Testing

- Card `4242 4242 4242 4242`, any future date, any CVC, any postal code.
- Declined card: `4000 0000 0000 0002`. Needs 3D Secure: `4000 0025 0000 3155`.

## Next steps

- Link payments to the real user once Better Auth exists (today a random browser id is used).
- Handle cancel and failed payments for Monthly.
- Set the same secrets on staging with `wrangler secret put`.

Resources: https://support.stripe.com and https://docs.stripe.com/mcp
