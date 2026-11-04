import { FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type EventName, track } from "./api";
import AuthButtons from "./AuthButtons";
import { clearPrefill, readPrefill } from "./prefill";
import { ALL_ROLES, PROGRAMS, ROLES, SCHOOLS, suggestedRoles } from "./lists";
import Suggest from "./Suggest";

// Rule 10, shaped by docs/references/onboarding-teardown.md:
// promise, demo, questions that make the pain specific, "Building your plan…", matches plus a plan (the aha moment),
// account, then the paywall. Every screen either learns something about the student or teaches them about the problem.
type Step =
  | "promise"
  | "demo"
  | "intent"
  | "applied"
  | "replies"
  | "truth"
  | "source"
  | "name"
  | "school"
  | "year"
  | "roles"
  | "where"
  | "resume"
  | "building"
  | "matches"
  | "account"
  | "plans"
  | "done";

// The screens the progress bar and "~2 min left" cover, in order.
const FLOW: Step[] = ["intent", "applied", "replies", "truth", "source", "name", "school", "year", "roles", "where", "resume"];
const SECONDS_PER_SCREEN = 12;

// The funnel event sent when each screen first shows. Every other screen sends onboarding_step, so drop-off shows per screen.
const STEP_EVENTS: Partial<Record<Step, EventName>> = {
  promise: "onboarding_started",
  matches: "firm_matched",
  account: "account_view",
  plans: "paywall_view",
  done: "onboarding_completed",
};

const INTENTS = [
  { key: "starting", icon: "🧭", label: "I haven't really started looking yet" },
  { key: "no_replies", icon: "📭", label: "I've applied a lot and heard almost nothing" },
  { key: "short_time", icon: "⏳", label: "My term is coming up and I still have nothing" },
];
const APPLIED = ["None yet", "1 to 20", "21 to 50", "51 to 100", "More than 100"];
const REPLIES = ["None", "1 or 2", "3 to 5", "More than 5"];
const SOURCES = ["TikTok", "Instagram", "YouTube", "Google search", "Friend or classmate", "Co-op office or professor", "Reddit", "Other"];
const LEVELS = ["1st year", "2nd year", "3rd year", "4th year", "5th year or later", "Graduate student"];
const WHERE = [
  { key: "near", label: "Near me", sub: "Firms I can get to in person" },
  { key: "remote", label: "Remote", sub: "Where the firm is doesn't matter" },
  { key: "either", label: "Either", sub: "Near me first, remote works too" },
];

// Lines that tick off on the "Building your co-op plan…" screen.
const BUILDING = ["Reading your goals", "Checking your resume", "Searching firms near you", "Ranking your best fits", "Planning your weeks"];
const BUILDING_MS = 650;

// Fewer roles make sharper tailored resumes.
const MAX_ROLES = 3;
// Paid is one price per co-op term (decision 0002). The exact number is still open; the brief says about $30 to $40.
const TERM_PRICE = 35;

// "Software, Data and Design"
const listOf = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

type Match = { firm: string; role: string; fit: number; why: string; hidden: boolean };

// Up to six example matches, spread across the job areas the student picked.
function exampleMatches(jobs: string[], city: string, program: string): Match[] {
  const place = city.split(",")[0].trim();
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
        place ? `Close to ${place}, and a fit for your ${job} goal.` : `A fit for your ${job} goal.`,
        `Small team that hires students without posting jobs.`,
      ][n % 3];
      out.push({ firm, role: `${job} co-op`, fit: 94 - n * 4, why, hidden: n % 3 === 2 });
    }
  }
  return out;
}

// Co-op terms from the one after today's through Winter 2030. Terms are 4 months: Jan-Apr, May-Aug, Sep-Dec.
const LAST_TERM = "Winter 2030";
const TERM_MONTH: Record<string, number> = { Winter: 0, Summer: 4, Fall: 8 };

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

// Whole weeks from today until the first day of the term, like "Summer 2027".
function weeksUntil(term: string): number {
  const [name, year] = term.split(" ");
  const start = new Date(Number(year), TERM_MONTH[name] ?? 0, 1);
  return Math.max(0, Math.round((start.getTime() - Date.now()) / (7 * 24 * 3600 * 1000)));
}

// The "That's the job board, not you" screen uses the student's own answers.
function truthHeading(applied: string, replies: string): string {
  if (applied === "None yet" || !applied) return "Start where most students never look.";
  if (replies === "None") return `${applied} applications. No replies. That's the job board, not you.`;
  if (replies === "1 or 2") return `${applied} applications. ${replies} replies. That's the job board, not you.`;
  return "You're getting replies. Let's get you more of them.";
}

export default function Onboarding() {
  const [step, setStep] = useState<Step>("promise");
  // School and program arrive filled in when the student came from the home page form.
  // Read in the first render, cleared after. StrictMode runs the first render twice in dev, so clearing must wait.
  const [prefill] = useState(readPrefill);
  useEffect(clearPrefill, []);
  const [intent, setIntent] = useState("");
  const [applied, setApplied] = useState("");
  const [replies, setReplies] = useState("");
  const [source, setSource] = useState("");
  const [name, setName] = useState(prefill.name ?? "");
  const [school, setSchool] = useState(prefill.school ?? "");
  const [program, setProgram] = useState(prefill.program ?? "");
  const [level, setLevel] = useState("");
  const [term, setTerm] = useState("");
  const [moreTerms, setMoreTerms] = useState(false);
  const [jobs, setJobs] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [adding, setAdding] = useState(false);
  const [moreRoles, setMoreRoles] = useState(false);
  const [where, setWhere] = useState("");
  const [city, setCity] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [nudge, setNudge] = useState(false);
  // "Edit" on the summary sends the student to one screen, then straight back to the summary.
  const [returnTo, setReturnTo] = useState<Step | null>(null);
  const [built, setBuilt] = useState(0);
  const [plan, setPlan] = useState<"free" | "term">("term");
  const terms = upcomingTerms();
  const matches = exampleMatches(jobs, where === "remote" ? "" : city, program);
  const firstName = name.trim().split(/\s+/)[0] ?? "";
  // No applications yet means there are no replies to ask about.
  const flow = applied === "None yet" ? FLOW.filter((s) => s !== "replies") : FLOW;

  // One event per step reached. StrictMode runs effects twice in dev, so the ref keeps each to one.
  const seen = useRef(new Set<Step>());
  useEffect(() => {
    if (seen.current.has(step)) return;
    seen.current.add(step);
    track(STEP_EVENTS[step] ?? "onboarding_step", STEP_EVENTS[step] ? undefined : step);
  }, [step]);

  // An answer worth knowing for go-to-market, like "source:TikTok". The API keeps up to 50 characters.
  const answer = (key: string, value: string) => track("onboarding_answer", `${key}:${value}`.slice(0, 50));

  // Tick the "Building your co-op plan…" lines, then show the matches.
  useEffect(() => {
    if (step !== "building") return;
    setBuilt(0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = reduce ? 250 : BUILDING_MS;
    const timers = BUILDING.map((_, i) => setTimeout(() => setBuilt(i + 1), tick * (i + 1)));
    timers.push(setTimeout(() => setStep("matches"), tick * (BUILDING.length + 1)));
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
  // sign-up. "Building your plan…" replaces itself with the matches, so going back from the matches lands on the resume.
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
    if (prev === null || (prev === "building" && step === "matches")) history.replaceState(entry, "");
    else history.pushState(entry, "");
  }, [step]);
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const to = (e.state as { step?: Step } | null)?.step;
      if (!to || to === "building") return;
      fromHistory.current = true;
      setReturnTo(null);
      setNudge(false);
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

  // The screen after this one in the question flow.
  const after = (s: Step): Step => {
    const i = flow.indexOf(s);
    return i >= 0 && i < flow.length - 1 ? flow[i + 1] : "building";
  };
  const go = (to: Step) => {
    setStep(returnTo ?? to);
    setReturnTo(null);
  };
  const next = (from: Step) => go(after(from));
  // One-tap answers move on by themselves, after a beat so the student sees their pick light up.
  const pickThen = (set: () => void, from: Step) => {
    set();
    window.setTimeout(() => next(from), 220);
  };
  const edit = (to: Step) => {
    setReturnTo("done");
    setStep(to);
  };
  const back = () => history.back();

  // The thin bar and "~2 min left" on question screens.
  const pos = flow.indexOf(step);
  const left = pos >= 0 ? (flow.length - pos) * SECONDS_PER_SCREEN : 0;
  const timeLeft = left > 90 ? "~2 min left" : left > 40 ? "~1 min left" : "Almost done";

  // Header arrows. Promise: next only. Summary: back only. "Building your plan…": none.
  // Next does what the screen's main button does, so the "fill out this field" bubble still shows.
  const [arrowSlot, setArrowSlot] = useState<HTMLElement | null>(null);
  useEffect(() => setArrowSlot(document.getElementById("header-arrows")), []);
  const showBack = step !== "promise" && step !== "building";
  const showNext = step !== "done" && step !== "building";
  // → is faded until the screen is answered. The resume is optional, and signing up must be done with a sign-up button.
  const stepDone: Partial<Record<Step, boolean>> = {
    intent: intent !== "",
    applied: applied !== "",
    replies: replies !== "",
    source: source !== "",
    name: name.trim() !== "",
    school: school.trim() !== "" && program.trim() !== "",
    year: level !== "" && term !== "",
    roles: jobs.length > 0,
    where: where !== "" && (where === "remote" || city.trim() !== ""),
    account: false,
  };
  const nextDisabled = stepDone[step] === false;
  function arrowNext() {
    if (nextDisabled) return;
    const form = cardRef.current?.querySelector("form");
    if (form) form.requestSubmit();
    else if (step === "promise") setStep("demo");
    else if (step === "demo") setStep("intent");
    else if (step === "matches") setStep("account");
    else next(step);
  }
  const arrows = (
    <>
      {showBack && (
        <button type="button" className="arrow" aria-label="Back" onClick={back}>
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
          onClick={arrowNext}
        >
          →
        </button>
      )}
    </>
  );

  // A plain form that moves to the next screen when sent. Used by screens with fields, so Enter works.
  const formNext = (from: Step) => (e: FormEvent) => {
    e.preventDefault();
    if (stepDone[from] !== false) next(from);
  };

  return (
    <main className="authpage">
      {arrowSlot && createPortal(arrows, arrowSlot)}
      <div className="card authcard wide" ref={cardRef}>
        {bubble && (
          <p className="field-bubble" role="alert" style={{ top: bubble.top, left: bubble.left }}>
            <span aria-hidden="true">!</span> Please fill out this field.
          </p>
        )}
        {pos >= 0 && (
          <div className="ob-top">
            <div
              className="ob-bar"
              role="progressbar"
              aria-label="Sign up progress"
              aria-valuemin={0}
              aria-valuemax={flow.length}
              aria-valuenow={pos + 1}
            >
              <span style={{ width: `${((pos + 1) / (flow.length + 1)) * 100}%` }} />
            </div>
            <span className="ob-time">{timeLeft}</span>
          </div>
        )}

        {/* 1. The promise: one outcome in the student's words, one button. */}
        {step === "promise" && (
          <div className="stack ob-hero">
            <p className="eyebrow-small">For co-op students</p>
            <h1 className="authtitle big">Stop sending applications into the void.</h1>
            <p className="lead small">
              Workterm finds firms that fit you, including ones that never post a job, and writes a resume and email for
              each one. You approve every email.
            </p>
            <button type="button" className="ob-cta" onClick={() => setStep("demo")}>
              Find my firms <span aria-hidden="true">→</span>
            </button>
            <p className="fine center">Takes about 2 minutes. Free to see your matches.</p>
            <p className="fine center">
              Already have an account? <a href="#/login">Log in</a>
            </p>
          </div>
        )}

        {/* 2. The demo: the magic moment in about 10 seconds. */}
        {step === "demo" && (
          <div className="stack">
            <h1 className="authtitle">One resume in. A firm that fits you out.</h1>
            <div className="demo" aria-hidden="true">
              <div className="demo-card demo-resume">
                <strong>Your resume</strong>
                <span className="demo-line" />
                <span className="demo-line short" />
                <span className="demo-tags">
                  <em>Python</em> <em>CAD</em> <em>Robotics club</em>
                </span>
              </div>
              <div className="demo-arrow">↓</div>
              <div className="demo-card demo-match">
                <span>
                  <strong>Small robotics firm, Waterloo</strong>
                  <small>Hires co-ops without posting</small>
                </span>
                <span className="pill green">92% fit</span>
              </div>
              <div className="demo-card demo-email">
                <small>Draft email · waiting for your approval</small>
                <span>
                  Hi Priya, I saw your team's warehouse robot demo. In my robotics club I built the arm controller in
                  Python…
                </span>
              </div>
            </div>
            <p className="lead small">
              Every match comes with a tailored resume and a short email about their work, not a template.
            </p>
            <div className="nav">
              <button type="button" onClick={() => setStep("intent")}>
                Show me mine
              </button>
            </div>
          </div>
        )}

        {/* 3. Questions. Each one personalizes the plan or makes the pain specific. */}
        {step === "intent" && (
          <Question title="Which of these sounds most like you?" why="No wrong answers. It shapes your plan.">
            <Options
              items={INTENTS.map((i) => ({ key: i.key, label: i.label, icon: i.icon }))}
              value={intent}
              onPick={(k) => pickThen(() => {
                setIntent(k);
                answer("intent", k);
              }, "intent")}
            />
          </Question>
        )}

        {step === "applied" && (
          <Question title="How many co-op applications have you sent so far?" why="This term or your last search. A guess is fine.">
            <Options
              items={APPLIED.map((a) => ({ key: a, label: a }))}
              value={applied}
              onPick={(k) => pickThen(() => {
                setApplied(k);
                answer("applied", k);
              }, "applied")}
            />
          </Question>
        )}

        {step === "replies" && (
          <Question title="And how many got a reply or an interview?" why={`Out of your ${applied.toLowerCase()} applications.`}>
            <Options
              items={REPLIES.map((r) => ({ key: r, label: r }))}
              value={replies}
              onPick={(k) => pickThen(() => {
                setReplies(k);
                answer("replies", k);
              }, "replies")}
            />
          </Question>
        )}

        {/* Teaches the student about their problem, using their own numbers. */}
        {step === "truth" && (
          <div className="stack">
            <h1 className="authtitle">{truthHeading(applied, replies)}</h1>
            <div className="compare">
              <div>
                <p className="eyebrow-small">The job board</p>
                <ul>
                  <li>The same posted jobs every student sees</li>
                  <li>A flood of applicants for each one</li>
                  <li>One resume sent everywhere</li>
                </ul>
              </div>
              <div className="on">
                <p className="eyebrow-small">With Workterm</p>
                <ul>
                  <li>Firms that fit you, posted or not</li>
                  <li>A short email about their work</li>
                  <li>A resume tailored to each one</li>
                </ul>
              </div>
            </div>
            <p className="lead small">Many small firms hire co-op students without ever posting a job. Most students never find them.</p>
            <Nav back={back} next="Find my firms" onNext={() => next("truth")} />
          </div>
        )}

        {step === "source" && (
          <Question title="How did you hear about Workterm?" why="It helps us reach more students like you.">
            <Options
              grid
              items={SOURCES.map((s) => ({ key: s, label: s }))}
              value={source}
              onPick={(k) => pickThen(() => {
                setSource(k);
                answer("source", k);
              }, "source")}
            />
          </Question>
        )}

        {step === "name" && (
          <form className="stack" onSubmit={formNext("name")}>
            <Head title="What should we call you?" why="Your name goes at the bottom of every email." />
            <label>
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
                maxLength={100}
                autoFocus
                required
              />
            </label>
            <Nav back={back} disabled={!stepDone.name} />
          </form>
        )}

        {step === "school" && (
          <form className="stack" onSubmit={formNext("school")}>
            <Head
              title={firstName ? `Where do you study, ${firstName}?` : "Where do you study?"}
              why="It goes in every email and shapes which firms we suggest."
            />
            <Suggest label="School" options={SCHOOLS} value={school} onChange={setSchool} placeholder="Start typing your school" />
            <Suggest label="Program" options={PROGRAMS} value={program} onChange={setProgram} placeholder="Start typing your program" />
            <Nav back={back} />
          </form>
        )}

        {step === "year" && (
          <form className="stack" onSubmit={formNext("year")}>
            <Head title="When is your next co-op?" why="We plan your weeks back from the day your term starts." />
            <fieldset className="ob-field">
              <legend>Next co-op term</legend>
              <div className="tiles">
                {(moreTerms ? terms : terms.slice(0, 6)).map((t) => (
                  <button type="button" key={t} className={term === t ? "tile on" : "tile"} aria-pressed={term === t} onClick={() => setTerm(t)}>
                    {t}
                  </button>
                ))}
              </div>
              {!moreTerms && terms.length > 6 && (
                <button type="button" className="linkish" onClick={() => setMoreTerms(true)}>
                  Later term
                </button>
              )}
            </fieldset>
            <fieldset className="ob-field">
              <legend>Year of study</legend>
              <div className="tiles">
                {LEVELS.map((l) => (
                  <button type="button" key={l} className={level === l ? "tile on" : "tile"} aria-pressed={level === l} onClick={() => setLevel(l)}>
                    {l}
                  </button>
                ))}
              </div>
            </fieldset>
            <Nav back={back} disabled={!stepDone.year} />
          </form>
        )}

        {step === "roles" && (
          <form className="stack" onSubmit={formNext("roles")}>
            <Head title="What roles are you aiming for?" why="Pick up to 3. We tailor your resume to them. You can change this later." />
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
            <Nav back={back} disabled={jobs.length === 0} />
          </form>
        )}

        {step === "where" && (
          <form className="stack" onSubmit={formNext("where")}>
            <Head title="Where do you want to work?" why="It decides which firms we search first." />
            <Options
              items={WHERE.map((w) => ({ key: w.key, label: w.label, sub: w.sub }))}
              value={where}
              onPick={(k) => (k === "remote" ? pickThen(() => setWhere(k), "where") : setWhere(k))}
            />
            {where && where !== "remote" && (
              <label>
                Your city
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Like Waterloo" maxLength={100} autoFocus required />
              </label>
            )}
            <Nav back={back} disabled={!stepDone.where} />
          </form>
        )}

        {/* Teaches first (the resume does not need to be perfect), then asks. Skipping gets one soft nudge, never a block. */}
        {step === "resume" && (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (file) go("building");
              else setNudge(true);
            }}
          >
            <Head
              title="You don't need the perfect resume."
              why="We tailor it to every firm. In this preview, your file stays in your browser."
            />
            <ul className="sent" aria-hidden="true">
              <li>
                <strong>To: Northbeam Robotics</strong> Your resume, tuned for robotics
              </li>
              <li>
                <strong>To: Harbor Data Co.</strong> Your resume, tuned for data
              </li>
              <li>
                <strong>To: Kite Studio</strong> Your resume, tuned for design
              </li>
            </ul>
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
            <Nav back={back} next={file ? "Build my plan" : "Do it later"} />
            {nudge && (
              <div className="sheet-backdrop" onClick={() => setNudge(false)}>
                <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="nudge-title" onClick={(e) => e.stopPropagation()}>
                  <h2 id="nudge-title">Matches are sharper with a resume</h2>
                  <p>We use it to pick firms that fit what you've done and to write each email about your real work.</p>
                  <label className="btn sheet-add">
                    <input
                      type="file"
                      className="visually-hidden"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => {
                        setFile(e.target.files?.[0] ?? null);
                        setNudge(false);
                      }}
                    />
                    Add my resume
                  </label>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setNudge(false);
                      go("building");
                    }}
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            )}
          </form>
        )}

        {step === "building" && (
          <div className="analyzing" role="status">
            <p className="ob-pct">{Math.round((built / BUILDING.length) * 100)}%</p>
            <h1 className="authtitle">Building your co-op plan…</h1>
            <ul className="finding">
              {BUILDING.map((f, i) => (
                <li key={f} className={i < built ? "done" : i === built ? "now" : ""}>
                  <span className="tick" aria-hidden="true">
                    {i < built ? "✓" : ""}
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* The aha moment: their firms, their timeline. Leaving now means leaving their own plan. */}
        {step === "matches" && (
          <div className="stack">
            <p className="eyebrow-small">{firstName ? `${firstName}'s plan` : "Your plan"}</p>
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
            {term && (
              <div className="plan-box">
                <p className="eyebrow-small">
                  {weeksUntil(term)} weeks until {term}
                </p>
                <ol>
                  <li>
                    <strong>This week:</strong> approve your first emails to your top {Math.min(3, matches.length)} firms.
                  </li>
                  <li>
                    <strong>Each week after:</strong> new firms and follow-ups, paced from your own Gmail.
                  </li>
                  <li>
                    <strong>Every week:</strong> one skill or project tip from what your firms look for.
                  </li>
                </ol>
              </div>
            )}
            <p className="notice">Preview: these are examples. Real matches from your resume arrive when Workterm opens.</p>
            <Nav back={back} next="Save my plan" onNext={() => setStep("account")} />
          </div>
        )}

        {step === "account" && (
          <div className="stack">
            <h1 className="authtitle">Save your plan</h1>
            <p className="lead small">Sign up to keep your matches and your weekly plan.</p>
            <AuthButtons verb="Sign up" onPick={() => go("plans")} />
            <p className="fine center">
              Signing up does not give us access to your Gmail. Sending is a separate step, and you approve every email.
            </p>
            <p className="notice">Preview: this does not create an account yet.</p>
            <div className="nav">
              <BackButton onClick={back} />
            </div>
            <p className="fine center">
              Already have an account? <a href="#/login">Log in</a>
            </p>
          </div>
        )}

        {/* The paywall: their goal restated, two options, the cost of leaving made concrete. */}
        {step === "plans" && (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (plan === "term") track("trial_start_click");
              go("done");
            }}
          >
            <h1 className="authtitle">{term ? `Get your ${term} search moving` : "Get your co-op search moving"}</h1>
            <p className="lead small">
              Your {matches.length} firms are ready. Free covers 5 emails. A term pass covers the whole search.
            </p>
            <div className="plans" role="radiogroup" aria-label="Plans">
              <label className={plan === "term" ? "plan on" : "plan"}>
                <input type="radio" name="plan" checked={plan === "term"} onChange={() => setPlan("term")} />
                <span className="plan-head">
                  <strong>Term pass</strong>
                  <span className="pill gold">Whole term</span>
                </span>
                <span className="plan-price">
                  ${TERM_PRICE} <small>once, for {term || "one co-op term"}</small>
                </span>
                <ul>
                  <li>All your matches, updated every week</li>
                  <li>A tailored resume for every firm</li>
                  <li>Emails from your Gmail, after you approve</li>
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
            <ol className="timeline">
              <li>
                <strong>Today</strong> See every match and send your first emails.
              </li>
              <li>
                <strong>During your search</strong> We pace sends and follow-ups from your Gmail.
              </li>
              <li>
                <strong>No subscription</strong> One payment for the term. Nothing renews.
              </li>
            </ol>
            <Nav back={back} next={plan === "term" ? `Get my term pass for $${TERM_PRICE}` : "Continue with Free"} />
            <p className="fine center">We cannot promise a placement. We help you reach more of the right firms.</p>
            <p className="notice">Preview: no payment is taken. Payments open when Workterm opens.</p>
          </form>
        )}

        {step === "done" && (
          <div className="stack">
            <h1 className="authtitle">You are all set{firstName ? `, ${firstName}` : ""}.</h1>
            <ul className="summary">
              <li>
                <span>Name</span> {name}
                <button type="button" className="linkish edit" onClick={() => edit("name")} aria-label="Edit name">
                  Edit
                </button>
              </li>
              <li>
                <span>School</span> {school}, {program}
                <button type="button" className="linkish edit" onClick={() => edit("school")} aria-label="Edit school">
                  Edit
                </button>
              </li>
              <li>
                <span>Next term</span> {term}, {level}
                <button type="button" className="linkish edit" onClick={() => edit("year")} aria-label="Edit next term">
                  Edit
                </button>
              </li>
              <li>
                <span>Roles</span> {jobs.join(", ")}
                <button type="button" className="linkish edit" onClick={() => edit("roles")} aria-label="Edit roles">
                  Edit
                </button>
              </li>
              <li>
                <span>Where</span> {where === "remote" ? "Remote" : `${city}${where === "either" ? " or remote" : ""}`}
                <button type="button" className="linkish edit" onClick={() => edit("where")} aria-label="Edit where">
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
                <span>Plan</span> {plan === "term" ? `Term pass, $${TERM_PRICE}` : "Free"}
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

function Head({ title, why }: { title: string; why: string }) {
  return (
    <div className="ob-head">
      <h1 className="authtitle">{title}</h1>
      <p className="lead small">{why}</p>
    </div>
  );
}

// A one-tap question screen. Its buttons move on by themselves, so it has Back only.
function Question({ title, why, children }: { title: string; why: string; children: ReactNode }) {
  return (
    <div className="stack">
      <Head title={title} why={why} />
      {children}
      <div className="nav">
        <BackButton onClick={() => history.back()} />
      </div>
    </div>
  );
}

type Option = { key: string; label: string; sub?: string; icon?: string };

function Options({ items, value, onPick, grid }: { items: Option[]; value: string; onPick: (key: string) => void; grid?: boolean }) {
  return (
    <div className={grid ? "options grid" : "options"} role="radiogroup">
      {items.map((o) => (
        <button
          type="button"
          key={o.key}
          role="radio"
          aria-checked={value === o.key}
          className={value === o.key ? "option on" : "option"}
          onClick={() => onPick(o.key)}
        >
          {o.icon && (
            <span className="option-icon" aria-hidden="true">
              {o.icon}
            </span>
          )}
          <span className="option-text">
            {o.label}
            {o.sub && <small>{o.sub}</small>}
          </span>
          <span className="option-dot" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function BackButton({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="ghost back" onClick={onClick}>
      <span aria-hidden="true">←</span> {label}
    </button>
  );
}

function Nav({
  back,
  next = "Continue",
  disabled,
  onNext,
}: {
  back?: () => void;
  next?: string;
  disabled?: boolean;
  onNext?: () => void;
}) {
  return (
    <div className="nav">
      {back && <BackButton onClick={back} />}
      {onNext ? (
        <button type="button" disabled={disabled} onClick={onNext}>
          {next}
        </button>
      ) : (
        <button type="submit" disabled={disabled}>
          {next}
        </button>
      )}
    </div>
  );
}
