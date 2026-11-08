-- Student profiles: the answers from onboarding, one row per email. Stands in for a user table until sign-in (Better Auth) exists.
-- Personal data: collect the minimum. No resume text here, only the answers the matches and the admin dashboard need.
CREATE TABLE profiles (
  email TEXT PRIMARY KEY,           -- lowercase
  name TEXT,
  school TEXT,
  program TEXT,
  level TEXT,                       -- "1st year", "Graduate student", ...
  experience TEXT,
  applied TEXT,                     -- how many applications so far
  struggles TEXT,                   -- JSON array of strings
  goals TEXT,                       -- JSON array of strings
  jobs TEXT,                        -- JSON array of preferred roles
  term TEXT,                        -- next co-op term, e.g. "Winter 2027"
  place TEXT,                       -- where they want to work
  heard_from TEXT,                  -- how they found Workterm (demographics for growth)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX profiles_created ON profiles (created_at);
