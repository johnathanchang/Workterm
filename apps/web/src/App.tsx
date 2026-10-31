import { FormEvent, useEffect, useRef, useState } from "react";
import { joinWaitlist, track } from "./api";

type Status = "idle" | "sending" | "joined" | "already" | "invalid_email" | "error";

// ?src=tiktok in the link tells us which post brought the visitor.
const source = new URLSearchParams(window.location.search).get("src")?.slice(0, 50) || undefined;

const STEPS = [
  {
    n: "01",
    title: "Find the hidden companies",
    body: "Small and mid-size engineering companies near you that hire co-ops but never post the job.",
  },
  {
    n: "02",
    title: "Send emails that get answers",
    body: "Workterm writes a short, personal email for each company. You read it, edit it, and approve it.",
  },
  {
    n: "03",
    title: "Know what to work on",
    body: "See the skills and projects that make a company say yes, then build them before term starts.",
  },
];

export default function App() {
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
      <header className="bar">
        <span className="logo">Workterm</span>
        <span className="tag">For Canadian engineering co-op students</span>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">Early access list</p>
          <h1>
            Land the co-op <em>nobody posts.</em>
          </h1>
          <p className="lead">
            Most engineering co-ops never reach a job board. Workterm finds the local companies that hire anyway, writes
            your emails, and tells you what to work on to get hired.
          </p>

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
                  placeholder="you@university.ca"
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
                    placeholder="McMaster"
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
                    placeholder="Mechanical"
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

        <section className="steps" aria-label="How Workterm works">
          {STEPS.map((s) => (
            <article key={s.n}>
              <span className="num">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </article>
          ))}
        </section>
      </main>

      <footer>
        <p>Workterm helps you reach companies. It does not promise a placement.</p>
      </footer>
    </>
  );
}
