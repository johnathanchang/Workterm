-- Who has paid. The entitlements table is the source of truth for Pro (AGENTS.md, payments rule).
-- Until sign-in (Better Auth) exists, user_ref is a random id the browser keeps. It becomes the real user id later.
CREATE TABLE entitlements (
  id TEXT PRIMARY KEY,                    -- random id (UUID)
  user_ref TEXT NOT NULL,                 -- who the plan belongs to (random browser id for now)
  plan TEXT NOT NULL,                     -- 'month' (subscription) or 'term' (one payment, 4 months)
  status TEXT NOT NULL,                   -- 'active', 'past_due' or 'canceled'
  stripe_session_id TEXT NOT NULL UNIQUE, -- the Checkout Session that created this row, so a repeat webhook cannot add a second row
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,            -- only for 'month'
  current_period_end INTEGER,             -- when access ends, in milliseconds since 1970
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX entitlements_user ON entitlements (user_ref);
CREATE INDEX entitlements_subscription ON entitlements (stripe_subscription_id);

-- Stripe sends the same event more than once sometimes. We remember each id so we handle it only once.
CREATE TABLE stripe_events (
  id TEXT PRIMARY KEY,                    -- Stripe's event id, e.g. evt_123
  created_at INTEGER NOT NULL
);
