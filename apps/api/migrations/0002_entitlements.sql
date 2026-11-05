-- Entitlements: who has paid, and until when. This is the only "is this student paid?" check.
-- Written only by verified Stripe webhooks (next step), never by the browser.
CREATE TABLE entitlements (
  id TEXT PRIMARY KEY,              -- random id (UUID)
  email TEXT NOT NULL,              -- lowercase; stands in for a user id until sign-in (Better Auth) exists
  plan TEXT NOT NULL,               -- e.g. "term"
  status TEXT NOT NULL,             -- "active" or "expired"
  source TEXT NOT NULL,             -- "stripe" now; "superwall" later
  stripe_session_id TEXT UNIQUE,    -- UNIQUE makes a repeated webhook a harmless no-op
  starts_at INTEGER NOT NULL,       -- milliseconds since 1970
  expires_at INTEGER NOT NULL,      -- one co-op term after starts_at
  created_at INTEGER NOT NULL
);
CREATE INDEX entitlements_email ON entitlements (email, status, expires_at);
