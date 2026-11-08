# 0008 – Basic dashboards before real sign-in

Status: accepted (Johnathan, Nov 8, 2026)

## Decision

Build two small dashboards now: one for students (`#/dashboard`, `#/welcome` right after paying) and one for the team (`#/admin`).

Real Google and Microsoft sign-in (Better Auth) comes next. Until then:

- Students are found by the email they paid with, saved in their browser. The API refuses these lookups when `APP_ENV` is `production`, so no one can read another student's answers by guessing an email.
- The admin page needs `ADMIN_KEY`, a secret set in `.dev.vars` and later with `wrangler secret put`. The API checks it on every call. When sign-in exists, it becomes a Google sign-in with an allow-list of team emails.

## Why

- Students need somewhere to land after paying. Johnathan needs to see signups, schools, how people found us and revenue from day one.
- Onboarding answers are personal data (rule 7). They are saved only once the student reaches the plan page, and never exposed without a check.

## Consequences

- New table `profiles` (migration 0004), saved from the plan page.
- New question in onboarding: how the student heard about Workterm.
- The "Ask Workterm" helper is scripted for now. The live version uses DeepSeek through AI Gateway (stack rule), not another AI vendor.
