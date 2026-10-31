# 0004 – Sign in with school Google or Microsoft accounts

Status: proposed (needs Johnathan's OK before we connect it)

## Decision

Students sign up and log in with their school account, through Google or Microsoft (Outlook). We use Better Auth, which is already in the stack. Microsoft sign-in is the new part: it needs a Microsoft Entra app registration.

## Why

- Most schools run on Google Workspace or Microsoft 365, so one of the two buttons works for nearly every student.
- A school email is a light check that the person is a student.
- No new passwords to store or leak.

## Consequences

- Human steps: create the Google and Microsoft app registrations and give us the client ids and secrets (secrets go in `.dev.vars` and Cloudflare, never in git).
- Gmail send-only scope (AGENTS.md) is a separate, later step. Sign-in asks for name and email only.
- Some schools block third-party app sign-in. We need a fallback, such as an email link, if many students hit this.
- The web UI for log in and the sign-up steps is built in `apps/web` as a preview. The buttons do not sign anyone in yet.
- New events (`signup_started`, `onboarding_completed`) need to be added to `ALLOWED_EVENTS` in `apps/api/src/index.ts`.
