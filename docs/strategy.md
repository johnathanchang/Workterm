# Workterm strategy: what makes us hard to copy

> Short and living. Written Nov 5, 2026. We edit it together.

## The honest starting point

Features alone will not protect us. A good vibe coder can copy "AI rewrites your resume" or "AI writes an email" in a weekend, and ChatGPT already does both. What is hard to copy is what builds up over time: data, trust, distribution, and doing the boring hard things well. We spend our build speed on those, not on more features.

A **moat** is anything that makes it slow or expensive for someone else to catch up, even if they can see exactly what we built.

## 1. Our moats (hard to copy)

1. **Reply data.** Every email a student sends teaches us what works: which firms reply, to which resume, in which term, with which subject line. Over time we can say "this firm replies to 1 in 4 mechanical engineering students who mention SolidWorks". A copycat starts at zero, and we get better with every send.
2. **The firm database.** Firms that hire co-ops but do not post jobs, the right person to contact, and when each firm hires for each term. It is slow, messy work that goes stale fast, so whoever keeps it fresh wins. Bounces and student feedback keep it clean.
3. **Gmail send approval and safe sending.** Google must review and approve an app before it can send from a student's Gmail. It takes weeks and can be lost if students complain. Our sending rules (student approves every send, daily caps, one email per firm, one contact per firm at a time) keep us approved and keep firms from blocking us.
4. **School by school knowledge.** Each school runs co-op differently (Waterloo cycles, Northeastern six-month co-ops, Berkeley summer internships). Knowing each calendar and reminding students at the right time adds up across hundreds of schools.
5. **Campus distribution.** Ambassadors, co-op office partnerships, program and city pages that rank on Google (rule 12), and the "I landed my co-op" share card. Students trust what classmates use.

## 2. Why students want it

1. **The aha in 2 minutes:** real matched firms before signing up.
2. **Time back:** about 38 hours down to about 2 for 50 applications (our estimate, shown on the home page).
3. **Hidden co-ops:** firms that never post jobs, with far less competition.
4. **Any major:** mechanical, civil, biology, business, not just software.
5. **Fits their life:** built around co-op terms, with reminders before each search season, and the student controls every send.

## 3. How we are different

- **Outbound, not apply and pray.** Email the right person directly, from your own Gmail, with a resume made for that firm.
- **Built for co-op terms,** not a general job board with a student filter.
- **Honest by design.** Never promise a placement, never send without approval, respectful to firms. Over time, firms may want Workterm students.

## 4. What we do first

1. **Collect reply data from day one.** Log `email_sent` and `reply_received` and tie them to the firm and the resume version, even in the beta.
2. **Apply for Google's Gmail approval early.** It takes the longest.
3. **Go deep at 2 or 3 schools.** Calendars, firms, and one ambassador each.
4. **Later, two-sided.** Let firms post co-ops to Workterm for free, so students bring firms and firms bring students (a network effect). Parked in `docs/later.md` until we have student traction.

## How we use this doc

Before building a feature, ask: does it make one of the five moats stronger? If not, it can probably wait.
