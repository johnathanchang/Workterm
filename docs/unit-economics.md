# Workterm unit economics

> Rough first draft. Every number here is an estimate. Chapter 12 prices were checked Oct 26, 2026.

## Plain English

Unit economics means: how much money one user brings in, minus what that user costs us. If it is clearly positive, we can pay to get users (ads, creators). If not, we cannot.

## Assumptions

- Price: $35 per co-op term (middle of $30 to $40). One payment, no free trial. Free plan: see matches plus 5 emails.
- Funnel: a "signup" is someone who gives their school and program and sees their firm matches.
- Paid rate: 9% of signups pay. This is the playbook's benchmark (30% x 30%), reused as a guess. It is not measured.
- AI cost: DeepSeek via OpenRouter. An email draft is about 3,000 tokens in and 600 out, so about $0.00085 per call with the 5.5% fee.
- Free user: about 20 AI calls. Paid user: about 150 AI calls per term (drafts, follow-ups, reply drafts, weekly coach).
- Payments: Stripe one-time Checkout, 2.9% plus 30 cents.
- Gmail sending is free. It uses the student's own Gmail.

## Per paid user (one term)

- Revenue: $35.00
- Stripe fee: $1.32
- AI: $0.13
- Cloudflare, Tinybird: about $0.10
- Net: about $33.45

## Per signup

- Free signup cost (AI and infra): about $0.02
- At 9% paid: 0.09 x $33.45 = $3.01, minus $0.02 = **about $2.99 per signup**
- At 4% paid (pessimistic): 0.04 x $33.45 = $1.34, minus $0.02 = **about $1.32 per signup**

So we can spend roughly $1.30 to $3.00 to get one signup and still break even.

## Not counted yet (could change the answer)

- Firm and contact data. Finding firms and verifying emails may cost money or a lot of AI and fetch calls. This is the biggest unknown.
- Refunds and support time.
- Marketing and creator fees.
- Repeat buyers. Students may pay again each term, which would raise lifetime value.

## Gate A check

- Revenue per signup is well above cost per signup in both cases. Pass, on paper.
- The 9% paid rate must be tested with the waitlist and a real price test.
- Next: measure the cost of finding and verifying firm contacts for one region.
