import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type EventName, track } from "./api";
import AuthButtons from "./AuthButtons";
import { ALL_ROLES, PROGRAMS, ROLES, SCHOOLS, suggestedRoles } from "./lists";
import Suggest from "./Suggest";

// Rule 10: questions, then "Finding your firms…", then the matched firms (the aha moment), then account, then the paywall.
type Step = "about" | "goals" | "resume" | "analyzing" | "matches" | "account" | "plans" | "done";

// The progress bar covers the questions only.
const STEPS: { key: Step; label: string }[] = [
  { key: "about", label: "About you" },
  { key: "goals", label: "Your roles" },
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
      // A role the student typed in gets plain firm types.
      const firm = (ROLES[job] ?? [`A ${job.toLowerCase()} team`, `A startup hiring for ${job.toLowerCase()}`, `A company hiring for ${job.toLowerCase()}`])[round];
      if (!firm || out.some((m) => m.firm === firm)) continue;
      const n = out.length;
      const why = [
        `Fits your ${job} goal${program ? ` and your ${program} program` : ""}.`,
        place ? `${place === "Remote" ? "Works remotely" : `Close to ${place}`}, and a fit for your ${job} goal.` : `A fit for your ${job} goal.`,
        `Small team that hires students without posting jobs.`,
      ][n % 3];
      out.push({ firm, role: `${job} co-op`, fit: 94 - n * 4, why, hidden: n % 3 === 2 });
    }
  }
  return out;
}

// Fewer roles make sharper tailored resumes.
const MAX_ROLES = 3;
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
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [program, setProgram] = useState("");
  const [level, setLevel] = useState("");
  const [term, setTerm] = useState("");
  const [jobs, setJobs] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [adding, setAdding] = useState(false);
  const [moreRoles, setMoreRoles] = useState(false);
  const [where, setWhere] = useState("");
  const [file, setFile] = useState<File | null>(null);
  // "Edit" on the summary sends the student to one screen, then straight back to the summary.
  const [returnTo, setReturnTo] = useState<Step | null>(null);
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

  // Our own "Please fill out this field." bubble instead of the browser's, so it matches the site.
  const cardRef = useRef<HTMLDivElement>(null);
  const [bubble, setBubble] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    let shown = false;
    // The browser sends "invalid" once per empty field on submit. Show the bubble on the first one only.
    const onInvalid = (e: Event) => {
      e.preventDefault();
      if (shown) return;
      shown = true;
      requestAnimationFrame(() => (shown = false));
      const field = e.target as HTMLElement;
      field.focus({ preventScroll: true });
      field.scrollIntoView({ block: "center", behavior: "smooth" });
      const box = field.getBoundingClientRect();
      const base = card.getBoundingClientRect();
      setBubble({ top: box.bottom - base.top + 8, left: box.left - base.left + 16 });
    };
    const hide = () => setBubble(null);
    card.addEventListener("invalid", onInvalid, true);
    card.addEventListener("input", hide);
    card.addEventListener("change", hide);
    return () => {
      card.removeEventListener("invalid", onInvalid, true);
      card.removeEventListener("input", hide);
      card.removeEventListener("change", hide);
    };
  }, []);

  // Each screen is a browser history entry, so the header arrows and the browser's own back and forward step through
  // sign-up. "Finding your firms…" replaces itself with the matches, so going back from the matches lands on the resume.
  const fromHistory = useRef(false);
  const lastStep = useRef<Step | null>(null);
  useEffect(() => {
    const prev = lastStep.current;
    // StrictMode runs this twice on the first render in dev. Same step means nothing new to record.
    if (prev === step) return;
    lastStep.current = step;
    if (fromHistory.current) {
      fromHistory.current = false;
      return;
    }
    const entry = { step };
    if (prev === null || (prev === "analyzing" && step === "matches")) history.replaceState(entry, "");
    else history.pushState(entry, "");
  }, [step]);
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const to = (e.state as { step?: Step } | null)?.step;
      if (!to || to === "analyzing") return;
      fromHistory.current = true;
      setReturnTo(null);
      setStep(to);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Each new screen starts at the top of the page.
  useEffect(() => {
    window.scrollTo(0, 0);
    setBubble(null);
  }, [step]);

  const full = jobs.length >= MAX_ROLES;
  const toggle = (j: string) =>
    setJobs((cur) => (cur.includes(j) ? cur.filter((x) => x !== j) : cur.length < MAX_ROLES ? [...cur, j] : cur));

  function addCustom(e: FormEvent) {
    e.preventDefault();
    const v = custom.trim().slice(0, 40);
    if (v && !jobs.includes(v) && !full) setJobs([...jobs, v]);
    setCustom("");
    setAdding(false);
  }

  // Roles that fit the program first, then the student's own, then (on "See more") every other role A to Z.
  const suggested = suggestedRoles(program);
  const ownRoles = jobs.filter((j) => !suggested.includes(j) && !ALL_ROLES.includes(j));
  const otherRoles = ALL_ROLES.filter((r) => !suggested.includes(r));
  const roleChips = [...suggested, ...ownRoles, ...otherRoles.filter((r) => moreRoles || jobs.includes(r))];

  const idx = STEPS.findIndex((s) => s.key === step);
  const go = (to: Step) => {
    setStep(returnTo ?? to);
    setReturnTo(null);
  };
  const edit = (to: Step) => {
    setReturnTo("done");
    setStep(to);
  };
  const back = idx > 0 ? () => history.back() : () => (window.location.hash = "#/");

  // Header arrows. First screen: next only. Summary: back only. "Finding your firms…": none.
  // Next does what the screen's main button does, so the "fill out this field" bubble still shows.
  const [arrowSlot, setArrowSlot] = useState<HTMLElement | null>(null);
  useEffect(() => setArrowSlot(document.getElementById("header-arrows")), []);
  const showBack = step !== "about" && step !== "analyzing";
  const showNext = step !== "done" && step !== "analyzing";
  // → is faded until the screen is done. The resume is optional, and signing up must be done with a sign-up button.
  const stepDone: Partial<Record<Step, boolean>> = {
    about: [name, school, program, level, term].every((v) => v.trim() !== ""),
    goals: jobs.length > 0,
    account: false,
  };
  const nextDisabled = stepDone[step] === false;
  function next() {
    if (nextDisabled) return;
    if (step === "matches") setStep("account");
    else cardRef.current?.querySelector("form")?.requestSubmit();
  }
  const arrows = (
    <>
      {showBack && (
        <button type="button" className="arrow" aria-label="Back" onClick={() => history.back()}>
          ←
        </button>
      )}
      {showNext && (
        <button
          type="button"
          className="arrow"
          aria-label="Next"
          title={nextDisabled ? (step === "account" ? "Sign up to continue" : "Finish this step first") : "Next"}
          disabled={nextDisabled}
          onClick={next}
        >
          →
        </button>
      )}
    </>
  );

  return (
    <main className="authpage">
      {arrowSlot && createPortal(arrows, arrowSlot)}
      <div className="card authcard wide" ref={cardRef}>
        {bubble && (
          <p className="field-bubble" role="alert" style={{ top: bubble.top, left: bubble.left }}>
            <span aria-hidden="true">!</span> Please fill out this field.
          </p>
        )}
        {idx >= 0 && (
          <ol className="progress" aria-label="Sign up progress">
            {STEPS.map((s, i) => (
              <li key={s.key} className={i < idx ? "done" : i === idx ? "now" : ""} aria-current={i === idx ? "step" : undefined}>
                {i < idx ? (
                  <button type="button" className="linkish plain" onClick={() => setStep(s.key)}>
                    <span>{i + 1}</span> {s.label}
                  </button>
                ) : (
                  <>
                    <span>{i + 1}</span> {s.label}
                  </>
                )}
              </li>
            ))}
          </ol>
        )}

        {step === "about" && (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              go("goals");
            }}
          >
            <h1 className="authtitle">Tell us about you</h1>
            <label>
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
                maxLength={100}
                required
              />
            </label>
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
            <Nav back={back} backLabel={idx === 0 ? "Home" : undefined} />
          </form>
        )}

        {step === "goals" && (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (jobs.length > 0) go("resume");
            }}
          >
            <h1 className="authtitle">What roles are you aiming for?</h1>
            <p className="lead small">Pick up to 3. We'll tailor your resume to them. You can change this later.</p>
            <div className="chips role-chips" role="group" aria-label="Roles">
              {roleChips.map((j) => {
                const on = jobs.includes(j);
                return (
                  <button
                    type="button"
                    key={j}
                    className={on ? "chip on" : full ? "chip off" : "chip"}
                    aria-pressed={on}
                    aria-disabled={!on && full}
                    onClick={() => toggle(j)}
                  >
                    {on && <Check />}
                    {j}
                  </button>
                );
              })}
              {adding ? (
                <span className="addrow">
                  <input
                    autoFocus
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addCustom(e);
                      if (e.key === "Escape") setAdding(false);
                    }}
                    placeholder="Like Robotics"
                    aria-label="Your own role"
                    maxLength={40}
                  />
                  <button type="button" className="ghost" onClick={addCustom}>
                    Add
                  </button>
                </span>
              ) : (
                <button type="button" className="chip add" disabled={full} onClick={() => setAdding(true)}>
                  + Add your own
                </button>
              )}
            </div>
            <p className="role-count" aria-live="polite">
              {full ? "3 of 3 picked. Tap one to swap it out." : `${jobs.length} of 3 picked`}
              <button type="button" className="linkish" onClick={() => setMoreRoles(!moreRoles)} aria-expanded={moreRoles}>
                {moreRoles ? "Show fewer roles" : "See more roles"}
              </button>
            </p>
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
              go("analyzing");
            }}
          >
            <h1 className="authtitle">Upload your resume</h1>
            <p className="lead small">We rate it against your roles. In this preview, it stays in your browser.</p>
            {/* Our own button and file name in one row. The browser's file box is hidden but still works with the keyboard. */}
            <label className={file ? "drop has-file" : "drop"}>
              <input
                type="file"
                className="visually-hidden"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <span className="drop-btn">{file ? "Replace" : "Choose file"}</span>
              <span className="drop-name">
                {file ? (
                  <>
                    <Check /> {file.name}
                  </>
                ) : (
                  "PDF, Word or text"
                )}
              </span>
            </label>
            <Nav back={back} next={file ? "Find matching companies" : "Skip and find matching companies"} />
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
              <BackButton onClick={() => history.back()} />
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
            <AuthButtons verb="Sign up" onPick={() => go("plans")} />
            <p className="notice">Preview: this does not create an account yet.</p>
            <div className="nav">
              <BackButton onClick={() => history.back()} />
            </div>
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
              go("done");
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
            <Nav back={() => history.back()} next={plan === "pro" ? "Start free trial" : "Continue with Free"} />
            <p className="fine center">Cancel anytime. We remind you before your trial ends. We cannot promise a placement.</p>
            <p className="notice">Preview: no payment is taken. Payments open when Workterm opens.</p>
          </form>
        )}

        {step === "done" && (
          <div className="stack">
            <h1 className="authtitle">You are all set.</h1>
            <ul className="summary">
              <li>
                <span>Name</span> {name}
                <button type="button" className="linkish edit" onClick={() => edit("about")} aria-label="Edit name">
                  Edit
                </button>
              </li>
              <li>
                <span>School</span> {school}, {program}, {level}
                <button type="button" className="linkish edit" onClick={() => edit("about")} aria-label="Edit school">
                  Edit
                </button>
              </li>
              <li>
                <span>Next term</span> {term}
                <button type="button" className="linkish edit" onClick={() => edit("about")} aria-label="Edit next term">
                  Edit
                </button>
              </li>
              <li>
                <span>Roles</span> {jobs.join(", ")}
                {where ? ` · ${where}` : ""}
                <button type="button" className="linkish edit" onClick={() => edit("goals")} aria-label="Edit roles">
                  Edit
                </button>
              </li>
              <li>
                <span>Resume</span> {file ? file.name : "Not added yet"}
                <button type="button" className="linkish edit" onClick={() => edit("resume")} aria-label="Edit resume">
                  Edit
                </button>
              </li>
              <li>
                <span>Plan</span> {plan === "pro" ? "Pro, free trial" : "Free"}
                <button type="button" className="linkish edit" onClick={() => edit("plans")} aria-label="Edit plan">
                  Edit
                </button>
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

const Check = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function BackButton({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="ghost back" onClick={onClick}>
      <span aria-hidden="true">←</span> {label}
    </button>
  );
}

function Nav({ back, backLabel, next = "Continue", disabled }: { back?: () => void; backLabel?: string; next?: string; disabled?: boolean }) {
  return (
    <div className="nav">
      {back && <BackButton onClick={back} label={backLabel} />}
      <button type="submit" disabled={disabled}>
        {next}
      </button>
    </div>
  );
}
