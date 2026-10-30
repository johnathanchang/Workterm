# 0001 – Web first, not iOS

Status: accepted

## Decision

Build Workterm as a web app first. Mobile comes later.

## Why

- Students find firms, read emails, and send them on laptops, not phones.
- The playbook says tools people find through Google should be web first.
- Sign in with Google fits the Gmail sending flow.
- Students can see firm matches before signing up, which a web page allows with no app install.
- One web app is faster and cheaper to ship than iOS plus Android.

## Consequences

- Phases 7 (iOS) and Android work are skipped for now.
- Payments use Stripe, not Superwall.
- A mobile app is parked in `docs/later.md`.
