import { FormEvent, useEffect, useRef, useState } from "react";
import { type EventName, track } from "./api";
import AuthButtons from "./AuthButtons";
import { PROGRAMS, SCHOOLS } from "./lists";
import Suggest from "./Suggest";

// Rule 10: questions, then "Finding your firms…", then the matched firms (the aha moment), then account, then the paywall.
type Step = "about" | "goals" | "resume" | "analyzing" | "matches" | "account" | "plans" | "done";

// The progress bar covers the questions only.
const STEPS: { key: Step; label: string }[] = [
  { key: "about", label: "About you" },
  { key: "goals", label: "Your goals" },
  { key: "resume", label: "Resume" },
];

// The funnel event sent when each screen first shows.
const STEP_EVENTS: Partial<Record<Step, EventName>> = {
  about: "onboarding_started",
  matches: "firm_matched",
  account: "account_view",
  plans: "paywall_view",
  done: "onboarding_completed",
};

// Lines that tick off one by one on the "Finding your firms…" screen.
const FINDING = ["Reading your goals", "Checking your resume", "Searching firms near you", "Ranking your best fits"];
const FINDING_MS = 700;

// Example firm types for each job area. These are a preview, not real matches: real ones come from the AI in Phase 5.
const FIRM_TYPES: Record<string, string[]> = {
  Software: ["A fintech startup", "A cloud software company", "A video game studio"],
  Data: ["A big bank", "An insurance company", "A retail analytics team"],
  Marketing: ["A consumer brand", "A marketing agency", "A sports team"],
  Finance: ["An investment firm", "A big bank", "An accounting firm"],
  Mechanical: ["An auto parts maker", "A robotics startup", "An aerospace supplier"],
  Electrical: ["A power utility", "A chip design firm", "An electric vehicle startup"],
  Design: ["A design studio", "A health tech startup", "A media company"],
  Product: ["A SaaS startup", "A delivery app", "A travel app"],
  Research: ["An AI lab", "A university lab", "A biotech company"],
};

// "Software, Data and Design"
const listOf = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

type Match = { firm: string; role: string; fit: number; why: string; hidden: boolean };

// Up to six example matches, spread across the job areas the student picked.
function exampleMatches(jobs: string[], where: string, program: string): Match[] {
  const place = where.split(",")[0].trim();
  const out: Match[] = [];
  for (let round = 0; round < 3 && out.length < 6; round++) {
    for (const job of jobs) {
      if (out.length >= 6) break;
      const firm = (FIRM_TYPES[job] ?? [`A ${job.toLowerCase()} company`, `A ${job.toLowerCase()} startup`, `A ${job.toLowerCase()} lab`])[round];
      if (!firm || out.some((m) => m.firm === firm)) continue;
      const n = out.length;
      const why = [
        `Fits your ${job.toLowerCase()} goal${program ? ` and your ${program} program` : ""}.`,
        place ? `${place === "Remote" ? "Works remotely" : `Close to ${place}`}, and a fit for your ${job.toLowerCase()} goal.` : `A fit for your ${job.toLowerCase()} goal.`,
        `Small team that hires students without posting jobs.`,
      ][n % 3];
      out.push({ firm, role: `${job} co-op`, fit: 94 - n * 4, why, hidden: n % 3 === 2 });
    }
  }
  return out;
}

const SUGGESTED = ["Software", "Data", "Marketing", "Finance", "Mechanical", "Electrical", "Design", "Product", "Research"];
const LEVELS = ["1st year", "2nd year", "3rd year", "4th year", "5th year or later", "Graduate student"];

// Co-op terms from the one after today's through Winter 2030. Terms are 4 months: Jan-Apr, May-Aug, Sep-Dec.
const LAST_TERM = "Winter 2030";

function upcomingTerms(): string[] {
  const names = ["Winter", "Summer", "Fall"];
  const now = new Date();
  let year = now.getFullYear();
  let idx = Math.floor(now.getMonth() / 4) + 1;
  const out: string[] = [];
  while (out.length < 30) {
    if (idx > 2) {
      idx = 0;
      year += 1;
    }
    out.push(`${names[idx]} ${year}`);
    if (out[out.length - 1] === LAST_TERM) break;
    idx++;
  }
  return out;
}

export default function Onboarding() {
  const [step, setStep] = useState<Step>("about");
  const [school, setSchool] = useState("");
  const [program, setProgram] = useState("");
  const [level, setLevel] = useState("");
  const [term, setTerm] = useState("");
  const [jobs, setJobs] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [where, setWhere] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [found, setFound] = useState(0);
  const [plan, setPlan] = useState<"free" | "pro">("pro");
  const terms = upcomingTerms();
  const matches = exampleMatches(jobs, where, program);

  // One event per step reached. StrictMode runs effects twice in dev, so the ref keeps each to one.
  const seen = useRef(new Set<Step>());
  useEffect(() => {
    if (seen.current.has(step)) return;
    seen.current.add(step);
    const event = STEP_EVENTS[step];
    if (event) track(event);
  }, [step]);

  // Tick the "Finding your firms…" lines, then show the matches.
  useEffect(() => {
    if (step !== "analyzing") return;
    setFound(0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = reduce ? 300 : FINDING_MS;
    const timers = FINDING.map((_, i) => setTimeout(() => setFound(i + 1), tick * (i + 1)));
    timers.push(setTimeout(() => setStep("matches"), tick * (FINDING.length + 1)));
    return () => timers.forEach(clearTimeout);
  }, [step]);

  // Each new screen starts at the top of the page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const toggle = (j: string) => setJobs((cur) => (cur.includes(j) ? cur.filter((x) => x !== j) : [...cur, j]));

  function addCustom(e: FormEvent) {
    e.preventDefault();
    const v = custom.trim().slice(0, 40);
    if (v && !jobs.includes(v)) setJobs([...jobs, v]);
    setCustom("");
  }

  const idx = STEPS.findIndex((s) => s.key === step);
  const back = idx > 0 ? () => setStep(STEPS[idx - 1].key) : undefined;

  return (
    <main className="authpage">
      <div className="card authcard wide">
        {idx >= 0 && (
          <ol className="progress" aria-label="Sign up progress">
            {STEPS.map((s, i) => (
              <li key={s.key} className={i < idx ? "done" : i === idx ? "now" : ""} aria-current={i === idx ? "step" : undefined}>
                <span>{i + 1}</span> {s.label}
              </li>
            ))}
          </ol>
        )}

        {step === "about" && (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              setStep("goals");
            }}
          >
            <h1 className="authtitle">Tell us about you</h1>
            <Suggest label="School" options={SCHOOLS} value={school} onChange={setSchool} placeholder="Start typing your school" />
            <Suggest label="Program" options={PROGRAMS} value={program} onChange={setProgram} placeholder="Start typing your program" />
            <div className="row">
              <label>
                Year of study
                <select value={level} onChange={(e) => setLevel(e.target.value)} required>
                  <option value="">Choose</option>
                  {LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label>
                Next co-op term
                <select value={term} onChange={(e) => setTerm(e.target.value)} required>
                  <option value="">Choose</option>
                  {terms.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>
            <Nav back={back} />
          </form>
        )}

        {step === "goals" && (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (jobs.length > 0) setStep("resume");
            }}
          >
            <h1 className="authtitle">What jobs do you want?</h1>
            <p className="lead small">Pick a few, or add your own. You can change this later.</p>
            <div className="chips" role="group" aria-label="Job areas">
              {[...SUGGESTED, ...jobs.filter((j) => !SUGGESTED.includes(j))].map((j) => (
                <button
                  type="button"
                  key={j}
                  className={jobs.includes(j) ? "chip on" : "chip"}
                  aria-pressed={jobs.includes(j)}
                  onClick={() => toggle(j)}
                >
                  {j}
                </button>
              ))}
            </div>
            <div className="addrow">
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustom(e)}
                placeholder="Something else, like Robotics"
                aria-label="Add another job area"
              />
              <button type="button" className="ghost" onClick={addCustom}>
                Add
              </button>
            </div>
            <label>
              Where <span className="opt">(city or remote, optional)</span>
              <input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Toronto, Remote" maxLength={100} />
            </label>
            <Nav back={back} disabled={jobs.length === 0} />
          </form>
        )}

        {step === "resume" && (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              setStep("analyzing");
            }}
          >
            <h1 className="authtitle">Upload your resume</h1>
            <p className="lead small">
              We rate it against the jobs you picked. Your resume stays in your browser in this preview.
            </p>
            <label className="drop">
              <span>Resume</span>
              <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <small>PDF, Word or text</small>
            </label>
            <Nav back={back} next={file ? "Find my firms" : "Skip and find my firms"} />
          </form>
        )}

        {step === "analyzing" && (
          <div className="analyzing" role="status">
            <div className="spinner" aria-hidden="true" />
            <h1 className="authtitle">Finding your firms…</h1>
            <ul className="finding">
              {FINDING.map((f, i) => (
                <li key={f} className={i < found ? "done" : i === found ? "now" : ""}>
                  <span className="tick" aria-hidden="true">
                    {i < found ? "✓" : ""}
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === "matches" && (
          <div className="stack">
            <p className="eyebrow-small">Your matches</p>
            <h1 className="authtitle">We found {matches.length} firms that fit you.</h1>
            <p className="lead small">
              Ranked by fit for {listOf(jobs.slice(0, 3))}
              {term ? ` in ${term}` : ""}. Some of them do not post jobs, so most students never find them.
            </p>
            <ol className="matches">
              {matches.map((m) => (
                <li key={m.firm}>
                  <div>
                    <strong>{m.firm}</strong>
                    <span className="match-role">{m.role}</span>
                    <span className="match-why">{m.why}</span>
                    {m.hidden && <span className="pill gold">Not posted</span>}
                  </div>
                  <span className="pill green">{m.fit}% fit</span>
                </li>
              ))}
            </ol>
            <p className="notice">Preview: these are examples. Real matches from your resume arrive when Workterm opens.</p>
            <div className="nav">
              <button type="button" onClick={() => setStep("account")}>
                Save my matches
              </button>
            </div>
          </div>
        )}

        {step === "account" && (
          <div className="stack">
            <h1 className="authtitle">Save your matches</h1>
            <p className="lead small">Sign up with your school account to keep your matches and start applying.</p>
            <AuthButtons verb="Sign up" onPick={() => setStep("plans")} />
            <p className="notice">Preview: this does not create an account yet.</p>
            <p className="fine center">
              Already have an account? <a href="#/login">Log in</a>
            </p>
          </div>
        )}

        {step === "plans" && (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (plan === "pro") track("trial_start_click");
              setStep("done");
            }}
          >
            <h1 className="authtitle">Choose your plan</h1>
            <p className="lead small">Start free. Upgrade when you are ready to apply to more firms.</p>
            <div className="plans" role="radiogroup" aria-label="Plans">
              <label className={plan === "pro" ? "plan on" : "plan"}>
                <input type="radio" name="plan" checked={plan === "pro"} onChange={() => setPlan("pro")} />
                <span className="plan-head">
                  <strong>Pro</strong>
                  <span className="pill gold">Free trial</span>
                </span>
                <span className="plan-price">
                  $20 <small>a month after your trial</small>
                </span>
                <ul>
                  <li>Everything in Free</li>
                  <li>A tailored resume for every job</li>
                  <li>Emails sent from your Gmail, after you approve</li>
                  <li>Follow-ups and reply tracking</li>
                </ul>
              </label>
              <label className={plan === "free" ? "plan on" : "plan"}>
                <input type="radio" name="plan" checked={plan === "free"} onChange={() => setPlan("free")} />
                <span className="plan-head">
                  <strong>Free</strong>
                </span>
                <span className="plan-price">
                  $0 <small>forever</small>
                </span>
                <ul>
                  <li>See your matches</li>
                  <li>Rate your resume</li>
                  <li>Send 5 emails</li>
                </ul>
              </label>
            </div>
            <button type="submit">{plan === "pro" ? "Start free trial" : "Continue with Free"}</button>
            <p className="fine center">Cancel anytime. We remind you before your trial ends. We cannot promise a placement.</p>
            <p className="notice">Preview: no payment is taken. Payments open when Workterm opens.</p>
          </form>
        )}

        {step === "done" && (
          <div className="stack">
            <h1 className="authtitle">You are all set.</h1>
            <ul className="summary">
              <li>
                <span>School</span> {school}, {program}, {level}
              </li>
              <li>
                <span>Next term</span> {term}
              </li>
              <li>
                <span>Jobs</span> {jobs.join(", ")}
                {where ? ` · ${where}` : ""}
              </li>
              <li>
                <span>Resume</span> {file ? file.name : "Not added yet"}
              </li>
              <li>
                <span>Plan</span> {plan === "pro" ? "Pro, free trial" : "Free"}
              </li>
            </ul>
            <p className="notice">
              Preview only: nothing was saved. Resume rating, job matches and tailored resumes open when Workterm opens.
            </p>
            <a className="btn" href="#/">
              Back to home
            </a>
          </div>
        )}
      </div>
    </main>
  );
}

function Nav({ back, next = "Continue", disabled }: { back?: () => void; next?: string; disabled?: boolean }) {
  return (
    <div className="nav">
      {back && (
        <button type="button" className="ghost" onClick={back}>
          Back
        </button>
      )}
      <button type="submit" disabled={disabled}>
        {next}
      </button>
    </div>
  );
}
