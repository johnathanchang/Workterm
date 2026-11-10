-- One resume per student: the PDF lives in R2, the plain text lives here for rating and tailoring.
-- Personal data (rule 7): collect the minimum, delete when the student deletes it or their account.
CREATE TABLE resumes (
  email TEXT PRIMARY KEY,           -- lowercase, same key as profiles until sign-in exists
  filename TEXT NOT NULL,
  size INTEGER NOT NULL,            -- bytes
  r2_key TEXT NOT NULL,
  text TEXT NOT NULL,               -- text pulled from the PDF
  uploaded_at INTEGER NOT NULL
);
