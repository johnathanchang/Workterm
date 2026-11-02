import { FormEvent, useEffect, useRef, useState } from "react";
import { joinWaitlist, track } from "./api";

type Status = "idle" | "sending" | "joined" | "already" | "invalid_email" | "missing" | "error";

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
    a: "Any student looking for a co-op, in any program and at any school. We start with students in the Toronto, Hamilton and Waterloo area, but you do not need to be there to start.",
  },
  {
    q: "What does Workterm do?",
    a: "It builds a resume for each job, rates your resume against that job, finds roles and firms that fit you, and helps you apply to many at once.",
  },
  {
    q: "How does Workterm rate my resume?",
    a: "It compares your resume to the jobs you want. You see what lines up, what is missing, and what to fix first. The score is a guide. It is not a promise of a placement.",
  },
  {
    q: "Is my resume private?",
    a: "We use your resume to rate it and match jobs. It goes to an employer only when you approve an application. We collect as little as we can.",
  },
  {
    q: "How much does it cost?",
    a: "Seeing your matches and sending 5 emails is free. Paid access is one price per co-op term, about $30 to $40. We are not taking payments yet. See the refund policy for the terms.",
  },
];

// Logos load from the simple-icons CDN (pinned version; newer versions dropped some brands).
// Each icon is a mask filled with the brand colour. Jane Street is not in that set, so its icon is saved in public/logos.
const ICONS = "https://cdn.jsdelivr.net/npm/simple-icons@11.0.0/icons";
const COMPANIES: { name: string; slug: string; fill: string; local?: boolean }[] = [
  { name: "Google", slug: "google", fill: "conic-gradient(#ea4335 0 45deg, #4285f4 0 135deg, #34a853 0 225deg, #fbbc05 0 300deg, #ea4335 0)" },
  { name: "Microsoft", slug: "microsoft", fill: "conic-gradient(#7fba00 0 25%, #ffb900 0 50%, #00a4ef 0 75%, #f25022 0)" },
  { name: "NVIDIA", slug: "nvidia", fill: "#76b900" },
  { name: "AMD", slug: "amd", fill: "#ed1c24" },
  { name: "Apple", slug: "apple", fill: "#000000" },
  { name: "Tesla", slug: "tesla", fill: "#e82127" },
  { name: "Meta", slug: "meta", fill: "#0866ff" },
  { name: "Amazon", slug: "amazon", fill: "#ff9900" },
  { name: "Intel", slug: "intel", fill: "#0071c5" },
  { name: "Vercel", slug: "vercel", fill: "#000000" },
  { name: "Shopify", slug: "shopify", fill: "#95bf47" },
  { name: "IBM", slug: "ibm", fill: "#0f62fe" },
  { name: "Cisco", slug: "cisco", fill: "#049fd9" },
  { name: "Adobe", slug: "adobe", fill: "#fa0f00" },
  { name: "Jane Street", slug: "janestreet", fill: "#1f3a5f", local: true },
];

const iconUrl = (c: { slug: string; local?: boolean }) => (c.local ? `/logos/${c.slug}.svg` : `${ICONS}/${c.slug}.svg`);

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
    if (!school.trim() || !program.trim()) return setStatus("missing");
    setStatus("sending");
    track("waitlist_signup_click", source);
    setStatus(
      await joinWaitlist({
        email,
        school: school.trim(),
        program: program.trim(),
        source,
      }),
    );
  }

  const done = status === "joined" || status === "already";

  return (
    <>
      <main>
        <section className="hero">
          <h1>
            Turn your student resume into your <em>dream co-op.</em>
          </h1>
          <p className="lead">
            The only job finder designed for students, made by students. Workterm rewrites your resume to match your desired internship, finding you quality jobs with tailored resumes.
          </p>
          <button
            type="button"
            className="cta"
            onClick={() => document.getElementById("early-access")?.scrollIntoView({ behavior: "smooth" })}
          >
            Start for free
          </button>
        </section>

        <section className="logos" aria-label="Companies you can target">
          <p className="logos-title">Find co-ops at companies like these</p>
          <div className="marquee">
            <ul className="marquee-track">
              {[...COMPANIES, ...COMPANIES].map((c, i) => (
                <li key={i} aria-hidden={i >= COMPANIES.length}>
                  <span
                    className="logo"
                    role="img"
                    aria-label={c.name}
                    style={{ background: c.fill, WebkitMaskImage: `url(${iconUrl(c)})`, maskImage: `url(${iconUrl(c)})` }}
                  />
                </li>
              ))}
            </ul>
          </div>
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
          <h2 className="join">Your internship awaits.</h2>
          {done ? (
            <div className="card success" role="status">
              <h2>{status === "joined" ? "You're on the list." : "You're already on the list."}</h2>
              <p>We'll email you once when Workterm opens. No spam, and you can unsubscribe anytime.</p>
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
                  <span>School</span>
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
                  <span>Program</span>
                  <input
                    type="text"
                    placeholder="Your program"
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    maxLength={100}
                  />
                </label>
              </div>
              <button type="submit" className="cta" disabled={status === "sending"}>
                {status === "sending" ? "Starting…" : "Start now"}
              </button>
              {status === "missing" && <p className="error">Please fill in your school and program.</p>}
              {status === "invalid_email" && <p className="error">That email doesn't look right. Check it and try again.</p>}
              {status === "error" && <p className="error">Something went wrong on our side. Please try again.</p>}
              <p className="fine">
                By joining, you agree that Workterm may email you about updates, changes, and pricing. Unsubscribe anytime.
              </p>
            </form>
          )}
        </section>

        <section className="faq" id="faq" aria-label="Questions and answers">
          <div className="faq-intro">
            <h2>Questions?</h2>
            <p>What Workterm does and what happens when you apply.</p>
          </div>
          <div className="faq-list">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

    </>
  );
}
