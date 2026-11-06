# Core features plan

> Planning only. Nothing here is built yet. We edit it together. Scope comes from decision 0006.

Each feature says what the student sees, how it works, what we store, which events fire, and what Johnathan has to set up.

## What ships when

We trimmed every feature to the smallest version that still gets students replies. Anything cut is listed under "Trimmed" in each feature, so nothing is lost.

| Release | Features |
|---|---|
| **Launch (v1)** | 1. Company matching · 2. Resume rating and tailoring · 3. Emails from Gmail or Outlook (job or coffee chat) · 4. Reply tracker (marked by hand) |
| **v1.1 (first update)** | 5. Hiring calendar · 6. Skill coach · alumni-first contacts · honest reply rates |
| **Later** (`docs/later.md`) | AI reply drafts · automatic reply reading · school calendars · weekly coach updates |

Build order: 1 → 2 → 3 → 4, then 5 and 6. Each feature feeds the next one.

## How students land internships, and where we fit

| Channel | How well it works | Our feature |
|---|---|---|
| Referrals and networking | Best | Coffee chat emails (3), alumni-first contacts (v1.1) |
| Cold outreach to the right person | Strong | Emails from Gmail or Outlook (3) |
| Campus recruiting | Strong, fixed timelines | Hiring calendar (5) |
| Projects, clubs, design teams | Key for a first internship | Skill coach (6) |
| School portals and online applications | Medium to weak | Tailored resumes (2) |
| Interviews | Every channel ends here | Not yet (`docs/later.md`) |

Our ICP is stuck on the weak channels. Workterm moves them to the strong ones.

## Our anti-slop rules

"AI slop" means generic, made-up, obviously machine-written output. These rules apply to every feature:

- **Truth only.** The AI rewords and reorders what is real. It never invents a skill, job, number or fact.
- **The student's voice comes first.** The AI builds around what the student wrote, not the other way round.
- **Specific beats generic.** Every email names one true, specific thing about the company.
- **Honest numbers.** Show real reply rates once we have them. Never promise a placement.
- **Respect companies.** Short emails, one contact per company, easy opt out.
- **No AI-made testimonials or stats.** Only real student stories, shared with permission.
- **Not a chatbot.** Screens built around the student's job search, not a chat box.

---

## 1. Company matching (the aha moment) · Launch

**What the student sees.** During onboarding, after the questions and resume step, the "Finding your companies…" screen runs, then a list of real companies ranked by fit. Each company has a fit score and one line on why it fits. This shows before the paywall.

**How it works.**
- A `companies` table holds real companies: name, website, city, industry, programs they hire from (for example mechanical engineering, finance), terms they hire for, and whether they post jobs publicly.
- `POST /match` takes the student's program, year, goals and city, and returns the top companies with a score.
- Scoring starts with simple rules (program, city, term, industry). No AI needed, so it works before any AI key exists.
- Once AI is set up, it writes the one-line "why it fits you" from the resume.

**What we store.** `companies` (shared data, not personal). The student's answers stay in the browser until they sign up.

**Events.** `firm_matched` (with how many companies and the top score).

**Johnathan sets up.** Pick the launch cities. OpenRouter account and key for the AI line.

**Trimmed.**
- Honest reply rates per company move to v1.1. They need real reply data first. Until then, show nothing rather than a guess.

**Open questions.**
- Launch cities. Suggestion: Toronto area first (Toronto, Waterloo, Hamilton), then Boston and the Bay Area.
- Where company data comes from: hand research, public company lists, or a data vendor (needs approval, rule 2).

---

## 2. Resume rating and tailoring · Launch

**What the student sees.** They upload a resume once. For any company, they get a fit score, the top 3 things missing, and a tailored version they can edit and copy or download.

**How it works.**
- Upload goes to R2 (Cloudflare file storage). We pull the text out of the PDF on the server.
- `POST /resume/rate` compares the resume to the company and streams back a score and the top 3 gaps.
- `POST /resume/tailor` streams back a tailored resume for that company.
- **Truth-locked (anti-slop).** Every tailored line links back to the original line it came from. Changed lines are highlighted. If the AI writes a line with no source (a new skill, job or number), the server rejects it and asks again.
- Prompts live in `apps/api/prompts/`. Every AI call logs `ai_call` with cost (rule 4).

**What we store.** `resumes` (one per student, the file in R2, the text in D1) and `resume_versions` (one per company). Resumes are personal data: collect the minimum, delete on account deletion (rule 7).

**Events.** `resume_uploaded`, `resume_rated`, `resume_tailored`.

**Johnathan sets up.** OpenRouter account and key, and an AI Gateway in Cloudflare.

**Trimmed.**
- A full side-by-side editor. Launch highlights changed lines instead, which shows the same thing with much less work.
- Designed PDF templates. Launch keeps the student's own layout as plain text plus a simple download.

**Open questions.**
- Reading PDFs on a Worker may need a new library. Ask before adding it (rule 2).

---

## 3. Emails from the student's Gmail or Outlook · Launch

**What the student sees.** For each matched company, they pick the email type:
- **Ask about roles:** a short, personal email asking about internships, with the tailored resume attached.
- **Ask for advice (coffee chat):** asks for 15 minutes of advice, not a job. These get more replies and often lead to referrals, the strongest channel.

They write one or two sentences of their own, the AI builds the rest, they edit it, then press Approve. Approved emails send from their own Gmail or Outlook account (including their school email), spread out over the day, with one follow-up if there is no reply.

**How it works.**
- `POST /drafts` streams one unique email per company (rule 8). The email type is one prompt with two versions, so the coffee chat type costs almost nothing extra.
- **Own voice (anti-slop).** The student's own sentences go into every email.
- **Slop check.** Before a draft is shown, the server blocks cliché phrases (for example "I hope this email finds you well"), keeps it under about 150 words, and requires one specific, true detail about the company. A draft that fails is rewritten.
- Nothing sends until the student approves it (rule 5).
- Sending runs on a Queue (Cloudflare's background job list), so emails go out paced. Daily cap per student. One contact per company at a time.
- **Company-friendly.** Every email has a one-click "not hiring right now" link. The company is not contacted again that term.
- Both use send-only permission: the Gmail send scope, and Mail.Send for Outlook (rule 7). Company website text is untrusted data, never instructions (rule 6).
- **Gmail and Outlook (decision 0007).** Many universities give students Microsoft 365 school email, and an email from a school address looks more trustworthy to a recruiter. Outlook sends through Microsoft Graph (Microsoft's API) with plain `fetch` from the Worker. Only the final send step differs; drafts, approval, pacing and caps are the same for both.
- **School accounts may need IT approval.** Personal Outlook accounts work right away. Some universities block students from approving outside apps, so the student sees "Need admin approval". We ask each target school's IT team to approve Workterm once. If a school says no, the student can send from Gmail or a personal Outlook account instead.

**What we store.** `contacts` (the person at each company, and where we found them), `emails` (type, draft, approved, sent, and the resume version used). Tying each send to a resume version and email type builds the reply data moat.

**Events.** `email_drafted`, `email_approved`, `email_sent`, `company_opted_out`.

**Johnathan sets up.**
- Google Cloud project and OAuth client (Sign in with Google plus Gmail send).
- Start Google's Gmail app review early. It takes weeks. Up to 100 test users before approval.
- Microsoft Entra app registration in the Azure portal (free): Sign in with Microsoft plus Mail.Send. Then Microsoft publisher verification, so students do not see an "unverified app" warning.
- Test Outlook early with one target school's student email, to see whether its IT team blocks outside apps.
- Check CASL (Canada) and CAN-SPAM (US) before the first real send.

**Trimmed.**
- **Alumni-first contacts move to v1.1.** When we pick a contact at a company, someone from the student's own school goes first, because a shared school tends to lift replies. It needs a school field on each contact from an allowed source. LinkedIn bans scraping, so not from there.
- Follow-ups capped at one. More than one starts to feel like spam.

**Open questions.**
- Which schools block outside apps on student Outlook accounts, and how fast their IT teams approve.
- Where contacts come from: hand research, or a contact data vendor (needs approval). Never bulk address harvesting (illegal under Canadian law, and penalized under CAN-SPAM).

---

## 4. Reply tracker · Launch

**What the student sees.** One list of every company they emailed, with a status: sent, replied, interview, offer, no reply. They update the status with one tap.

**How it works.**
- Launch uses manual marking: the student taps the status. No new Gmail permission needed.
- How we read replies automatically is still open (decide later). Options: Gmail read access (paid yearly security check), Outlook read access (Mail.Read, usually no paid check, so Outlook may come first), or a reply-to address on our domain.

**What we store.** `replies` (company, date, status, linked to the email, email type and resume version).

**Events.** `reply_received`, and `coop_landed` when the student marks an offer.

**Retention.** A weekly recap email with their numbers and who to follow up with (rule 11).

**Trimmed.**
- AI-drafted responses to replies move to later. Students can reply in Gmail or Outlook for now.
- Automatic reply reading is later (decide later).

---

## 5. Hiring calendar · v1.1

**What the student sees.** For each matched company, when it usually hires for each term, for example "Fills summer roles by October". A reminder email a few weeks before each search season starts.

**How it works.**
- Each company in `companies` gets hiring windows per term.
- A daily Cloudflare cron job (a scheduled task) sends reminders before each window opens.

**Why it matters.** It builds the school-by-school knowledge moat in `docs/strategy.md`, and gives students a reason to come back every term (retention, rule 11).

**What we store.** `hiring_windows` (company, term, open and close months). Not personal data.

**Events.** `hiring_reminder_sent`.

**Trimmed.**
- School-by-school calendars (Waterloo cycles, Northeastern six-month co-ops) move to later. Company windows come first because they apply to every student.

**Open questions.** Where hiring dates come from: past postings, student reports, or our own reply data over time.

---

## 6. Skill coach · v1.1

**What the student sees.** "What to work on before next term." Based on the gaps found across their matched companies, one or two concrete things to do, for example "Build a small SolidWorks project like this one" or "Join a case competition this fall". Shown on their dashboard and in the weekly recap.

**How it works.**
- It reuses the gaps from feature 2 across all the student's matched companies, so most of the work is already done.
- The AI suggests a project, a club or a course that fits the gap and the student's program.
- Suggestions are specific and doable in a weekend or a term. No vague advice like "improve your skills".

**Why it matters.** First-time students often lack experience. Projects, clubs and design teams are how they get it. Updated suggestions give a reason to come back between search seasons.

**What we store.** `skill_suggestions` (student, gap, suggestion, done or not).

**Events.** `skill_suggested`, `skill_done`.

**Trimmed.**
- Weekly updates and progress tracking move to later. v1.1 refreshes once per term and when the resume changes.

---

## Real outcome stories (growth, not a feature)

When a student marks `coop_landed`, ask if they want to share their story (like Isaiah's on the home page). Only with their permission, never AI-written. These feed the "I landed my co-op" share card (rule 12) and the home page.

---

## Before any of this: shared foundations

- **Sign-in** (Better Auth, Google first) so data belongs to a student.
- **AI setup** (`apps/api/src/ai.ts`): OpenRouter, AI Gateway, streaming, cost logging.
- **Pro check** (`GET /me/entitlements`) so features 2 to 6 are Pro only.
