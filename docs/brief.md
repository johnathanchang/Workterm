# Workterm brief

> Rough first draft. We edit it together.

## One-liner

Workterm finds co-op employers that fit a student, tailors their resume for each one, and helps them send personal emails from their own Gmail or Outlook, so they get replies instead of silence.

## What Workterm does

Most students apply to co-ops the same way: hundreds of applications on job boards, the same resume each time, and almost no replies. Workterm changes the approach from "apply and pray" to "reach the right person directly".

1. **Finds companies that fit you.** You answer a few questions about your program, year, goals and city. Workterm ranks real employers by how well they fit you, including companies that hire co-ops but never post jobs. You see your matches in about 2 minutes, before you pay.
2. **Makes your resume fit each company.** It rates your resume against each company or job, shows what is missing, and writes a tailored version. It only rewords what is true. It never invents experience.
3. **Writes the emails for you.** For each company, it drafts one personal email to the right person, with the tailored resume attached. You read and approve every email. Nothing sends without you.
4. **Sends from your own Gmail or Outlook, safely.** Emails go out from your account, including your school email, spread out over the day, with daily limits and one follow-up. Companies get one real message from a real student, not spam.
5. **Tracks every reply.** One list of every company you contacted and where each one stands, with suggested responses when someone writes back.

The result: about 50 personal applications in about 2 hours instead of about 38 (our estimate), more replies, and a clear view of what is working. Workterm never promises a placement.

Full plan for each feature: `docs/core-features.md`.

## Who it's for

Any student trying to land a co-op, in any program and at any school. The product is not limited to the group below, but they are who we sell to first.

### ICP (ideal customer profile: the exact person we sell to first)

- 2nd, 3rd or 4th year students.
- Ideally in business or engineering.
- Want a co-op, probably their first one.
- Have already sent many emails and co-op applications with no success.
- At Canadian and American schools. Examples: Harvard, University of Toronto, University of Alberta, McMaster, UC Berkeley, MIT.

They can't find a placement on their school's job board. Some programs require co-ops to graduate (some Waterloo programs need 5 to 6). Students report 100 to 235+ applications with little or no reply.

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
2. Find jobs: a search bar where the student pastes a resume or lists skills and gets roles ranked by how well they match. Includes small companies that don't post jobs. Each has a match score and a one-line "why it fits you".
3. Personalized resumes: AI tailors a CV or resume for each job. The student rates it against the job, sees what is missing, and edits it.
4. Apply to many: AI writes one personal email or application per job. It sends from the student's own Gmail or Outlook, paced, with follow-ups. The student approves each one first.
5. Track replies: one inbox view, with AI-drafted responses.
6. What to work on: compares the resume to what target companies do, suggests a skill or weekend project. Updates weekly.

## v1 scope

Four core features, plus resume setup to feed them:

1. **Company matching:** roles and companies ranked against the student's resume. This is the aha moment, shown during onboarding before the paywall.
2. **Resume rating and tailoring:** rate the resume against a job, then a tailored resume for each job.
3. **AI email drafts, sent from the student's own Gmail or Outlook:** the student approves every send. Paced, with follow-ups.
4. **Reply tracker:** one view of replies. Feeds the reply data moat in `docs/strategy.md`.

Email type: "ask about roles" or "ask for advice" (a coffee chat, which often leads to referrals). The reply tracker starts with the student marking replies by hand.

First update (v1.1): hiring calendar, skill coach, alumni-first contacts, honest reply rates.

Moved to later (`docs/later.md`): peer insights (needs many users first), AI reply drafts. Outlook sending is in launch (decision 0007). Full plan with what was trimmed: `docs/core-features.md`.

## Product

One paid product, **Workterm Pro**, with two plans (see Pricing below).

## Open questions

- **Company data region.** Company data was planned for one region first (Toronto, Hamilton, Waterloo). Students at Harvard, MIT, Berkeley or Alberta would see few local matches. Pick launch cities to match the target schools.
- **"Co-op" or "internship".** American students mostly say "internship". Decide whether the page and onboarding say both.

## Competitors

Offerloop and Whali target big companies (banking, consulting, tech). We cover any student's co-op search, built around co-op terms, with resume rating, tailored resumes, and a skill coach.

## Pricing

- No free plan. Students see their matched companies during onboarding (the aha moment), then pick a paid plan.
- Paid: a subscription, $25 a month or $45 every 4 months (one co-op term).
- Why: see `docs/decisions/0005-subscriptions.md` (replaces the per-term payment in 0002).

## Risks and counters

- Spam: own Gmail or Outlook, daily caps, unique emails, one contact per company at a time.
- Low reply rates: set expectations, show funnel stats.
- Bad contact data: one region at first, verify addresses.
- Gmail API review: test with up to 100 users, start the review early.
- Outlook school accounts: some universities block outside apps. Test early with one target school.
- CASL (Canadian anti-spam law): check before launch.
- CAN-SPAM (American anti-spam law): check before sending to American companies.
- Never promise a placement.

## Growth plan

- UGC creators and faceless TikTok
- Reddit
- Campus ambassadors
- Engineering clubs, design teams, and business clubs and case competition teams
- Small paid ad tests once a video works
- SEO pages per city and program
- "I landed my co-op" share card
