# Workterm validation: competitor reviews and video hooks

> Rough first draft. We edit it together. Written 2026-10-31.

## One line

A student enters their school, program and city. They get a list of matching firms and a drafted email for each.

## Niche check against the "avoid" list

- Generic chatbot? No. The output is a firm list plus emails, tied to one city and program.
- A feature a platform will ship free soon? Some risk. ChatGPT can write an email, but it cannot find small local firms that never post jobs. The firm list is the moat. Keep it fresh.
- Regulated advice? No. We never promise a placement.
- Two-sided marketplace? No. Firms never sign up. We only find them.
- B2B sales through an app store? No. Students pay. Web first.

## What the research found (be honest about how thin it is)

Searches ran on 2026-10-31. Almost no usable 1–3 star App Store text came back, and Offerloop and Whali have very few independent reviews. Treat this as a start, not proof. Next step: read the App Store and Google Play pages by hand.

1. **The pain is real and loud.** Students on Reddit describe 100 to 200+ applications with almost no replies. Some Canadian programs require 5 to 6 co-ops to graduate, so the stakes are high. Sources: [r/leetcode thread](https://redlib.hackliberty.org/r/leetcode/comments/1l2ecnz/200_applications_and_no_responses/mw3bbxw/?context=3), [r/EngineeringResumes thread](https://reddit.birdcat.cafe/r/EngineeringResumes/comments/1kr8ljw/student_almost_100_applications_to_coopintern), [Carleton thread](https://lr.in.psf.lt/r/CarletonU/comments/1j4pud5/trouble_finding_coop).
2. **The job board is crowded.** A Dalhousie student says first-, second- and third-year students all apply to the same jobs at once. Source: [r/Dalhousie](https://redlib.belloworld.it/r/Dalhousie/comments/1gh6q5q/am_i_cooked).
3. **Being local helps.** Commenters say people in big engineering cities have an edge. That fits our one-city start. Source: [r/EngineeringResumes](https://reddit.birdcat.cafe/r/EngineeringResumes/comments/1jf2u7y/student_4th_year_mechanical_engineering_student).
4. **Mass emailing makes students distrust it.** Students at Swarthmore took unsolicited app emails for a scam. Our counter: emails send from the student's own Gmail, one unique email per firm, and the student approves each one. Source: [Swarthmore Phoenix](https://swarthmorephoenix.com/2019/12/05/looping-you-in-on-looped/).
5. **Existing job tools get billing complaints.** Simplify has a small number of reviews that mention refunds and billing. Our counter: one clear price per co-op term, no surprise renewals. Sources: [Trustpilot Simplify](https://at.trustpilot.com/review/simplify.jobs), [PissedConsumer](https://www.pissedconsumer.com/simplify-jobs/RT-F.html).
6. **AI-written text needs heavy editing.** A Huntr reviewer says AI cover letters need heavy editing. A Teal reviewer says output was weaker than free Gemini. Our counter: each email names the firm and what it actually builds. Sources: [Huntr reviews](https://chromewebstore.google.com/detail/mihdfbecejheednfigjpdacgeilhlmnf/reviews?hl=en), [Teal Trustpilot](https://www.trustpilot.com/review/tealhq.com?page=5).
7. **Offerloop and Whali:** the search found no independent reviews we can trust. Whali has 2 reviews on [G2](https://www.g2.com/products/whali/reviews). Both competitors aim at banking, consulting and tech. We aim at small local engineering firms.

## 10 video hooks

Rules for all of them: no placement promises, no fake numbers, show the real screen. Each hook is the first 2 seconds of a short video. Replace the bracketed parts with your real city and school.

1. "200 applications. Zero replies. The jobs you want are never posted."
2. "Every engineering student at [school] applies to the same 40 jobs. Here is who is not posting."
3. "I typed my school, my program and Hamilton. This is the list I got." (screen recording of the firm list)
4. "Small engineering firms near you hire co-ops. They just never write a job post."
5. "Stop pasting your resume into ChatGPT. It does not know which firms exist."
6. "This email took 10 seconds. It names what the firm actually builds." (show one draft)
7. "Your school's job board has 3,000 students on it. This list has 30 firms and nobody else."
8. "5 to 6 co-ops to graduate. Here is how I am not waiting on the job board."
9. "I sent one email to a firm that never posted a job. Here is what happened." (only post if it is true)
10. "Mechanical, civil, electrical, software: type your program, get firms in your city."

## Which hooks to test first

Start with 1, 3 and 6. They show the pain, the list and the email in that order, which matches the aha moment in `AGENTS.md` rule 10. Track which one gets saves, shares and "what app is this?" comments.

## Open questions for Johnathan

- Which school and city do you want to name in the first videos?
- Will you use hook 9 only after you have a real result?
- CASL (Canadian anti-spam law) still needs a check before we send any real email. Videos and the waitlist do not send email, so they are fine.

## Playbook chapter 00 checklist: where we are

1. **Groups you can reach (HUMAN):** not done. Johnathan lists 5 groups, for example school clubs, co-op Discords, Reddit communities.
2. **What they paste into ChatGPT (HUMAN):** not done. Ask 5 students. Likely answer: "write me a cold email to this company".
3. **Low-star reviews of top apps:** started, thin. See the findings above. Still needs a hand check of App Store and Google Play pages.
4. **TikTok and Reels search:** not done. Needs a real account. Look for "what app is this?" under co-op and internship videos.
5. **Subreddits with recurring complaints:** done at a first pass (r/leetcode, r/EngineeringResumes, r/CarletonU, r/Dalhousie).
6. **Unbundle one slow feature of a big app:** our version is "find the firms nobody posts jobs for". Job boards only show posted jobs.
7. **Localize for a market the leader ignores:** Offerloop and Whali aim at banking, consulting and tech. We aim at small Canadian engineering firms.
8. **One-week test:** the waitlist page is built locally. Deploy needs a Cloudflare account (HUMAN). The 10 hooks are written. Videos still need posting.
9. **Math check:** 30% trial start x 30% trial to paid x $30 = $2.70 per download. At $35 it is $3.15. Caution: our plan is free matches plus 5 emails, not a trial, so the two 30% numbers are guesses until the waitlist gives real data. Paid ads only work if one download costs less than this. Organic videos cost nothing per download.
10. **One-liner:** "For Canadian engineering co-op students, Workterm turns your school, program and city into a list of local firms and a drafted email for each, in about a minute." (Confirm the time once the product exists.)
