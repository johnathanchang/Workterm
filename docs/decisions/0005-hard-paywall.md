# 0005 – Hard paywall, no free trial

Status: accepted
Supersedes: the free plan in 0002 (the per-term price in 0002 still stands)

## Decision

- Hard paywall. After the student sees their matches and signs up, they must pick a paid option to continue. There is no free plan.
- The paywall is its own page, `#/pricing`, opened right after the "Finding your firms…" loading screen. Onboarding order: About you, sign-up, Your roles, Resume, loading screen, pricing.
- Two options, shown Monthly on the left and Per term on the right: **Monthly** ($25 a month, renews until the student cancels) and **Per term** ($45, one co-op term of about 4 months, one time, does not renew, marked "Best value"). Monthly adds up to about $100 a term, which anchors the term price. Prices are a first guess and we test them.
- An all-terms bundle is off the paywall for now. It is a later upsell once we see conversion.
- No free trial. A money-back guarantee instead. The terms are **not decided yet**: the current Refund page is placeholder text, and the "7-day" wording on the paywall is a draft until we set a real policy.
- The paywall is personalized: the student's name, term, roles and matched firms are shown on it.

## Why

- The paywall is the honest test of product-market fit. A trial hides it. In the playbook we read (Jake Castillo, Cal AI), 84% of 3-day trial cancels happen on day one, so a trial mostly gives false signals.
- A one-time per-term payment does not fit Stripe's trial and auto-charge model. A trial would add recurring-billing code and refund risk with students.
- The matches reveal is the "try before you buy". A refund window lowers the risk of paying.
- Two options anchor the price: monthly makes the per-term price look like an easy choice.
- Monthly fits a job search of unknown length, so students are not forced to commit to a whole term.

## Consequences

- `AGENTS.md`, `docs/brief.md` and the Refund page change: no "free plan", no "5 emails free".
- We still cannot promise a placement. The guarantee is a refund, not an outcome.
- Event `trial_start_click` is replaced by `checkout_click`. `paywall_view` now fires on the pricing page.
- The monthly plan is a subscription. This reverses 0002's "no subscription" for that plan only. It needs Stripe subscriptions, a cancel flow, failed-payment handling and a reminder before each renewal. The per-term plan stays one-time.
- Revisit a trial only if paywall conversion stays under about 5% after we have tested the offer and the price.
- Stripe is not wired yet. The checkout button is a labelled preview until the Stripe account exists (test mode first).
