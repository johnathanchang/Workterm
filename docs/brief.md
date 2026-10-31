# Workterm brief

> Rough first draft. We edit it together.

## One-liner

For any student trying to land a co-op, Workterm builds a resume for each job, rates your resume against it, finds roles that fit you, and helps you apply to many at once.

## Who it's for

Any student trying to land a co-op, in any program and at any school. Our first users are likely Canadian engineering students, but the product is not limited to them. They can't find a placement on their school's job board. Some programs require co-ops to graduate (some Waterloo programs need 5 to 6). Students report 100 to 235+ applications with little or no reply.

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
2. Find jobs: a search bar where the student pastes a resume or lists skills and gets roles ranked by how well they match. Includes small firms that don't post jobs. Each has a match score and a one-line "why it fits you".
3. Personalized resumes: AI tailors a CV or resume for each job. The student rates it against the job, sees what is missing, and edits it.
4. Apply to many: AI writes one personal email or application per job. It sends from the student's own Gmail, paced, with follow-ups. The student approves each one first.
5. Track replies: one inbox view, with AI-drafted responses.
6. What to work on: compares the resume to what target firms do, suggests a skill or weekend project. Updates weekly.

## v1 scope

- Resume setup
- Resume rating against a job, and a tailored resume for each job
- Job and firm search matched to the resume, for one region at first (Toronto, Hamilton, Waterloo)
- Peer insights: which roles students like you applied to and what got replies, with names kept private
- AI email drafts
- Gmail sending with follow-ups
- Reply tracker

Everything else is in `docs/later.md`.

## Competitors

Offerloop and Whali target big companies (banking, consulting, tech). We cover any student's co-op search, built around co-op terms, with resume rating, tailored resumes, and a skill coach.

## Pricing

- Free: see matches plus 5 emails.
- Paid: one price per co-op term, about $30 to $40.
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
