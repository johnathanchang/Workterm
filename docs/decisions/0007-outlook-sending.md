# 0007 – Send from Outlook as well as Gmail

Status: accepted (Johnathan, Nov 6, 2026)

## Decision

Students can send their approved emails from Outlook as well as Gmail, at launch. This includes Microsoft 365 school email accounts. Sign in with Microsoft (proposed in 0004) is part of this.

Outlook uses Microsoft Graph (Microsoft's API) with the Mail.Send permission only. That is send-only, the same as our Gmail scope. Microsoft is a new vendor, approved here.

## Why

- Many universities give students Microsoft 365 school email, for example UofT and McMaster.
- An email from a school address looks more trustworthy to a recruiter than a personal address, which may lift reply rates.
- Microsoft's approval (publisher verification) is usually faster and free compared with Google's Gmail review.
- Reading replies on Outlook (Mail.Read) usually needs no paid security check, so automatic reply tracking may be easier there later.

## Consequences

- Human steps: a Microsoft Entra app registration in the Azure portal, a client id and secret (secrets go in `.dev.vars` and Cloudflare, never in git), and Microsoft publisher verification.
- Some universities block students from approving outside apps. Students there see "Need admin approval". We ask each target school's IT team to approve Workterm. If a school says no, students send from Gmail or a personal Outlook account.
- Every sending rule applies the same way to both: the student approves every email, daily caps, one unique email per company, one contact per company at a time.
- AGENTS.md rules 7 and 8 now say Gmail or Outlook.
- Test early with one target school's student email.
