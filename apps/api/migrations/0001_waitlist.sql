-- Waitlist signups. One row per email.
CREATE TABLE waitlist (
  id TEXT PRIMARY KEY,              -- random id (UUID), never an auto-increment number
  email TEXT NOT NULL UNIQUE,       -- lowercase; UNIQUE stops duplicate signups
  school TEXT,                      -- optional, e.g. "McMaster"
  program TEXT,                     -- optional, e.g. "Mechanical Engineering"
  source TEXT,                      -- where they came from, e.g. "tiktok", "reddit"
  created_at INTEGER NOT NULL       -- time in milliseconds since 1970
);

-- Simple event log so we can measure Gate A (signups divided by visitors).
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,               -- e.g. "page_view", "waitlist_signup"
  source TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX events_name_time ON events (name, created_at);
