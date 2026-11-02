import { FormEvent, useEffect, useRef, useState } from "react";
import { joinWaitlist, track } from "./api";
import { Compare, CreateProfile, HowItWorks } from "./HowItWorks";

type Status = "idle" | "sending" | "joined" | "already" | "invalid_email" | "missing" | "error";

// ?src=tiktok in the link tells us which post brought the visitor.
const source = new URLSearchParams(window.location.search).get("src")?.slice(0, 50) || undefined;

const FAQ = [
  {
    q: "Who is Workterm for?",
    a: "Workterm is an application designed to help students look for co-op internship programs, in any program and any school. As the job market tightens, Workterm helps tighten, review, and send out quality applications for best results.",
  },
  {
    q: "What does Workterm do?",
    a: "Workterm builds a resume for each job, rates your resume against that job, finds roles and firms that fit you, and helps you apply to many at once.",
  },
  {
    q: "How does Workterm rate my resume?",
    a: "Workterm compares your resume to the jobs you want. You see what lines up, what is missing, and what to fix first. The score is a guide. It is not a promise of a placement.",
  },
  {
    q: "Is my resume private?",
    a: "We use your resume to rate it and match jobs. It goes to an employer only when you approve an application. Otherwise, all your information is private.",
  },
  {
    q: "Still have questions?",
    a: (
      <>
        Send all your personal questions and concerns to <a href="mailto:x@workterm.ca">x@workterm.ca</a>.
      </>
    ),
  },
];

// Logos load from the simple-icons CDN (pinned version; newer versions dropped some brands).
// Each icon is a mask filled with the brand colour. Jane Street is not in that set, so its icon is saved in public/logos.
const ICONS = "https://cdn.jsdelivr.net/npm/simple-icons@11.0.0/icons";
const COMPANIES: { name: string; slug: string; fill: string; local?: boolean }[] = [
  { name: "Google", slug: "google", fill: "conic-gradient(#ea4335 0 45deg, #4285f4 0 135deg, #34a853 0 225deg, #fbbc05 0 300deg, #ea4335 0)" },
  { name: "Microsoft", slug: "microsoft", fill: "conic-gradient(#7fba00 0 25%, #ffb900 0 50%, #00a4ef 0 75%, #f25022 0)" },
  { name: "NVIDIA", slug: "nvidia", fill: "#76b900" },
  { name: "AMD", slug: "amd", fill: "#ffffff" },
  { name: "Apple", slug: "apple", fill: "#ffffff" },
  { name: "Tesla", slug: "tesla", fill: "#ffffff" },
  { name: "Meta", slug: "meta", fill: "#5aa0ff" },
  { name: "Amazon", slug: "amazon", fill: "#ff9900" },
  { name: "Intel", slug: "intel", fill: "#5db8ff" },
  { name: "Vercel", slug: "vercel", fill: "#ffffff" },
  { name: "Shopify", slug: "shopify", fill: "#95bf47" },
  { name: "IBM", slug: "ibm", fill: "#78a9ff" },
  { name: "Cisco", slug: "cisco", fill: "#4cc9f0" },
  { name: "Adobe", slug: "adobe", fill: "#ffffff" },
  { name: "Jane Street", slug: "janestreet", fill: "#ffffff", local: true },
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

  // The first scroll down from the top jumps straight to "How it works". It re-arms when you return to the top.
  // It listens to the wheel, touch and keys, so scrolls started by buttons (like "Start for free") are left alone.
  useEffect(() => {
    let armed = true;
    let touchY = 0;
    const jump = (e: Event) => {
      if (!armed || window.scrollY > 5) return;
      armed = false;
      e.preventDefault();
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const barBottom = document.querySelector(".bar")?.getBoundingClientRect().bottom ?? 0;
      const top = (document.getElementById("how-it-works")?.getBoundingClientRect().top ?? 0) + window.scrollY - barBottom;
      window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    };
    const onWheel = (e: WheelEvent) => e.deltaY > 0 && jump(e);
    const onTouchStart = (e: TouchEvent) => (touchY = e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => touchY - e.touches[0].clientY > 10 && jump(e);
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest?.("input, textarea, select, button, summary");
      if (!typing && ["ArrowDown", "PageDown", " "].includes(e.key)) jump(e);
    };
    const onScroll = () => window.scrollY === 0 && (armed = true);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
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
        <div className="first-screen">
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
            <p className="cta-note">Start with a free trial. Cancel anytime.</p>
          </section>

          <section className="logos" aria-label="Companies you can target">
            <p className="logos-title">Find co-ops at 5,000+ companies like these</p>
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
        </div>

        <HowItWorks />

        <CreateProfile />

        <Compare />

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

        <section className="faq band" id="faq" aria-label="Questions and answers">
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
