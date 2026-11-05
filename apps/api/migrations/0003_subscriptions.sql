-- Subscriptions (decision 0005): one entitlement row per Stripe subscription, kept in sync by webhooks.
-- plan is now "monthly" or "term". expires_at is the end of the paid period; it moves forward on each renewal.
ALTER TABLE entitlements ADD COLUMN stripe_subscription_id TEXT;   -- "sub_..."
ALTER TABLE entitlements ADD COLUMN stripe_customer_id TEXT;       -- "cus_...", for the billing portal later
ALTER TABLE entitlements ADD COLUMN last_event_at INTEGER NOT NULL DEFAULT 0; -- newest Stripe event applied (ms); older ones are ignored
CREATE UNIQUE INDEX entitlements_subscription ON entitlements (stripe_subscription_id);
