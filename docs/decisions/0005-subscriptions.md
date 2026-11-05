# 0005 – Recurring subscriptions: monthly and per term

Status: accepted (replaces the pricing part of 0002)

## Decision

Pro is a recurring Stripe subscription with two plans:

- **Pro – Monthly:** $25 a month.
- **Pro – Term:** $45 every 4 months, about one co-op term. Shown first as the best value.

Free stays the same: see matches, rate your resume, send 5 emails.

## Why

- Johnathan wants recurring revenue, not one payment per term.
- The term plan still fits how students search (once per co-op term) and is cheaper than 4 months of monthly.

## Consequences

- Checkout runs in Stripe subscription mode. Each subscription has one `entitlements` row, kept in sync by `customer.subscription.*` webhooks. Pro lasts until the end of the paid period.
- The paywall says the price, how often it renews, and "Cancel anytime".
- Students need a way to cancel. Until sign-in exists, cancel through the Stripe customer portal link in Stripe's emails (turn this on in the Stripe dashboard). An in-app "Manage subscription" button comes with sign-in.
- Watch refunds and chargebacks from students who forget to cancel. Send a reminder before each term renewal (rule 11).
