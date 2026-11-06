# Workterm build plan

> Rough first draft. We edit it together. Covers your list, item 1 first.

## 1. ICP, products, core features

**ICP (ideal customer profile: the exact person we build for)**
- Canadian engineering co-op student, year 1 to 3
- School job board is not working: many applications, few replies
- Searches on a laptop, has a Gmail or Outlook school account
- First region: Toronto, Hamilton, Waterloo

**Products (what we sell)**
- Free: see matched firms plus 5 emails
- Term pass, about $35: unlimited firm matches in your region, AI emails with follow-ups, reply tracker, weekly "what to work on"

**Core features (v1, from the brief)**
1. Setup: resume, school, program, term, city
2. Firm finder with match score and "why it fits you"
3. AI email drafts, student approves each one, sent from their own mailbox
4. Reply tracker
5. Weekly skill suggestions (simple version)

**Cut from v1:** interview prep, more cities, mobile app, pre-health version.

## 2. Work order for your list

Why this order: each step needs the one before it.

1. Decisions (item 1, above). Cheap, and everything depends on it.
2. Onboarding (item 3). It is the aha moment: questions, then "Finding your firms…", then matches.
3. Login (item 5). Gmail first. Outlook second (see below).
4. Customer dashboard (item 6) and product functions (item 8): firm list, drafts, send, replies.
5. Stripe (item 4). Free vs paid limits need the dashboard first.
6. Admin dashboard and admin login (item 7). Needs real data to show.
7. Home page UI (item 2) and footer docs (item 9). Polish once the product is real.

## 3. Notes on specific items

- **Outlook login (item 5):** Gmail needs the Gmail API. Outlook needs Microsoft Graph, a second setup and review. Suggest Gmail in v1, Outlook right after. Many school accounts are Outlook, so this matters. Worth checking what share of target schools use it.
- **Admin login (item 7):** a separate role in Better Auth, limited to your email. Never a shared password.
- **Footer docs (item 9):** Privacy Policy, Terms, Contact, and how we use Gmail. Google requires these for Gmail approval.
- **Stripe (item 4):** one-time payment per term, test mode first.

## 4. Suggested additions

- Privacy policy and terms (needed for Gmail approval)
- Unsubscribe line and CASL checks on every email
- Daily send caps and a "pause sending" button
- Event tracking (`firm_matched`, `email_sent`, and so on) so we see where students drop off
- Error alerts
- Refund policy, because paid users will ask
- A "report a bad firm or email" button, to fix contact data

## 5. Open questions

- Where is the 50% done onboarding and Stripe work? It is not in this repo.
- Gate A (validation) was planned before building. Building first is your call. Suggest we still test demand soon with a waitlist, run by someone else, given your health.
