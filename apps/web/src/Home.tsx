import { FormEvent, useEffect, useRef, useState } from "react";
import { joinWaitlist, track } from "./api";

type Status = "idle" | "sending" | "joined" | "already" | "invalid_email" | "error";

// ?src=tiktok in the link tells us which post brought the visitor.
const source = new URLSearchParams(window.location.search).get("src")?.slice(0, 50) || undefined;

const FEATURES = [
  {
    n: "01",
    title: "A CV made for each job",
    body: "Workterm rewrites your resume for every role you want, using your own experience. You read it and edit it.",
  },
  {
    n: "02",
    title: "A clear resume score",
    body: "See how your resume rates against the jobs you want, and what to fix first.",
  },
  {
    n: "03",
    title: "Jobs that fit you",
    body: "Your resume and your desired roles drive the search. Each match says why it fits.",
  },
  {
    n: "04",
    title: "Apply on your terms",
    body: "Send many applications in one sitting. You approve each one, and daily limits keep you from looking like spam.",
  },
];

const FAQ = [
  {
    q: "Who is Workterm for?",
    a: "Any student looking for a co-op, in any program and at any school.",
  },
  {
    q: "How does Workterm rate my resume?",
    a: "It compares your resume to the jobs you want. You see what lines up, what is missing, and what to fix first. The score is a guide. It is not a promise of a placement.",
  },
  {
    q: "Will anything send without my approval?",
    a: "No. You read and approve every application before it goes out. Daily limits keep you from looking like spam.",
  },
  {
    q: "How accurate is the professor data?",
    a: "Workterm does not use professor data in this version. If we add it, we will show where it comes from and how recent it is.",
  },
  {
    q: "Is my resume private?",
    a: "We use your resume to rate it and match jobs. It goes to an employer only when you approve an application. We collect as little as we can.",
  },
];

export default function Home() {
  const [email, setEmail] = useState("");
  const [school, setSchool] = useState("");
  const [program, setProgram] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const tracked = useRef(false);

  useEffect(() => {
    // StrictMode runs effects twice in dev. The ref keeps us to one page view.
    if (tracked.current) return;
    tracked.current = true;
    track("page_view", source);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    track("waitlist_signup_click", source);
    setStatus(
      await joinWaitlist({
        email,
        school: school || undefined,
        program: program || undefined,
        source,
      }),
    );
  }

  const done = status === "joined" || status === "already";

  return (
    <>
      <main>
        <section className="hero">
          <p className="eyebrow">Resumes and CVs</p>
          <h1>
            A resume built for <em>every job.</em>
          </h1>
          <p className="lead">
            Upload the resume you have and tell us the jobs you want. Workterm rates your resume, finds jobs that fit
            you, and makes a personalized CV for each one.
          </p>
        </section>

        <section className="steps" aria-label="What Workterm does">
          {FEATURES.map((f) => (
            <article key={f.n}>
              <span className="num">{f.n}</span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </section>

        <section className="signup" id="early-access">
          <p className="eyebrow">Early access list</p>
          <h2 className="join">Get early access</h2>
          {done ? (
            <div className="card success" role="status">
              <h2>{status === "joined" ? "You're on the list." : "You're already on the list."}</h2>
              <p>We'll email you once when early access opens. No spam, and you can unsubscribe anytime.</p>
            </div>
          ) : (
            <form className="card" onSubmit={onSubmit} noValidate>
              <label>
                Email
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <div className="row">
                <label>
                  <span>
                    School <span className="opt">(optional)</span>
                  </span>
                  <input
                    type="text"
                    autoComplete="organization"
                    placeholder="Your school"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    maxLength={100}
                  />
                </label>
                <label>
                  <span>
                    Program <span className="opt">(optional)</span>
                  </span>
                  <input
                    type="text"
                    placeholder="Your program"
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    maxLength={100}
                  />
                </label>
              </div>
              <button type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Joining…" : "Join the waitlist"}
              </button>
              {status === "invalid_email" && <p className="error">That email doesn't look right. Check it and try again.</p>}
              {status === "error" && <p className="error">Something went wrong on our side. Please try again.</p>}
              <p className="fine">
                By joining, you agree that Workterm may email you about early access. Unsubscribe anytime.
              </p>
            </form>
          )}
        </section>

        <section className="faq" aria-label="Questions and answers">
          <h2 className="join">Questions</h2>
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>
      </main>

    </>
  );
}
