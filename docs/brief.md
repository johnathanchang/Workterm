# Workterm brief

> Rough first draft. We edit it together.

## One-liner

For engineering co-op students, Workterm finds local firms that don't post jobs, writes your emails, and tells you what to work on to get hired.

## Who it's for

Canadian engineering co-op students who can't find a placement on their school's job board. Some programs require co-ops to graduate (some Waterloo programs need 5 to 6). Students report 100 to 235+ applications with little or no reply.

## Scorecard (our bar: 30/35, stricter than the playbook's 25)

- Pain: 5
- Frequency: 4 (a search every term, 4 to 6 times per degree)
- Demo: 4
- AI engine: 4
- Willingness to pay: 4 (co-ops pay real wages)
- Reach: 5
- Risk: 4
- Total: 30/35

## Core loop

1. Setup: resume, school, program, co-op term, city.
2. Find firms: small and mid local engineering firms that don't post co-op jobs. Each has a match score and a one-line "why it fits you".
3. Send emails: AI writes one personal email per firm. It sends from the student's own Gmail, paced, with follow-ups. The student approves each one first.
4. Track replies: one inbox view, with AI-drafted responses.
5. What to work on: compares the resume to what target firms do, suggests a skill or weekend project. Updates weekly.

## v1 scope

- Resume setup
- Firm finder for one region (Toronto, Hamilton, Waterloo)
- AI email drafts
- Gmail sending with follow-ups
- Reply tracker

Everything else is in `docs/later.md`.

## Competitors

Offerloop and Whali target big companies (banking, consulting, tech). We target small local engineering firms, built around co-op terms, plus the skill coach.

## Pricing

- Free: see matches plus 5 emails.
- Paid: one price per co-op term, **$30 USD**.
- Why per term: see `docs/decisions/0002-per-term-pricing.md`.

## Risks and counters

- Spam: own Gmail, daily caps, unique emails, one contact per firm at a time.
- Low reply rates: set expectations, show funnel stats.
- Bad contact data: one region at first, verify addresses.
- Gmail API review: test with up to 100 users, start the review early.
- CASL (Canadian anti-spam law): check before launch.
- Never promise a placement.

## Growth plan

- UGC creators and faceless TikTok
- Reddit
- Campus ambassadors
- Engineering clubs and design teams
- Small paid ad tests once a video works
- SEO pages per city and program
- "I landed my co-op" share card
