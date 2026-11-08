import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type EventName, startCheckout, track } from "./api";
import AuthButtons from "./AuthButtons";
import { PER_APP_BY_HAND, TimeBars } from "./HowItWorks";
import { clearPrefill, readDraft, readPrefill, saveDraft } from "./prefill";
import { ALL_ROLES, PROGRAMS, ROLES, SCHOOLS, suggestedRoles } from "./lists";
import Suggest from "./Suggest";

// Rule 10: questions, then "Finding your firms…", then the matched firms (the aha moment), then account, then the paywall.
// One question per screen, like Cal AI: every tap is small, and the answers shape the matches and the plan page.
type Step =
  | "name"
  | "school"
  | "program"
  | "year"
  | "experience"
  | "applied"
  | "struggle"
  | "empathy"
  | "goal"
  | "roles"
  | "term"
  | "where"
  | "privacy"
  | "resume"
  | "analyzing"
  | "matches"
  | "account"
  | "plans"
  | "done";

// The question screens in order. The progress bar covers these only and names the section.
const QUESTIONS: { key: Step; section: string }[] = [
  { key: "name", section: "About you" },
  { key: "school", section: "About you" },
  { key: "program", section: "About you" },
  { key: "year", section: "About you" },
  { key: "experience", section: "Your story" },
  { key: "applied", section: "Your story" },
  { key: "struggle", section: "Your story" },
  { key: "empathy", section: "Your story" },
  { key: "goal", section: "Your goals" },
  { key: "roles", section: "Your goals" },
  { key: "term", section: "Your goals" },
  { key: "where", section: "Your goals" },
  { key: "privacy", section: "Your resume" },
  { key: "resume", section: "Your resume" },
];

// The funnel event sent when each screen first shows. Question screens also send onboarding_step with their name.
const STEP_EVENTS: Partial<Record<Step, EventName>> = {
  name: "onboarding_started",
  matches: "firm_matched",
  account: "account_view",
  plans: "paywall_view",
  done: "onboarding_completed",
};

const FINDING_MS = 700;
// A single-answer screen moves on by itself, after a short pause so the student sees their pick light up.
const AUTO_NEXT_MS = 280;

type Choice = { label: string; note?: string };
const asOptions = (labels: string[]): Choice[] => labels.map((label) => ({ label }));

const LEVELS = ["1st year", "2nd year", "3rd year", "4th year", "5th year or later", "Graduate student"];

const NO_EXPERIENCE = "None yet";
const EXPERIENCE: Choice[] = [
  { label: NO_EXPERIENCE, note: "That is where every student starts." },
  { label: "Part-time or summer jobs", note: "Retail, food service and tutoring all count." },
  { label: "One co-op or internship" },
  { label: "Two or more" },
];

const APPLIED = ["None yet", "1 to 20", "21 to 50", "More than 50"];

// Pains a student can pick, each with what Workterm does about it. Shown back to them on the next screen and on the plan page.
const EMPTY_RESUME = "My resume feels empty";
const STRUGGLES: { label: string; fix: string }[] = [
  { label: EMPTY_RESUME, fix: "We turn your classes, projects, clubs and jobs into resume lines employers look for. Only what is true." },
  {
    label: "I apply and never hear back",
    fix: "We write one personal email to a real person at each company. You approve it, then it sends from your own Gmail or Outlook.",
  },
  { label: "I don't know where to apply", fix: "We rank companies that fit you, including ones that hire co-ops without posting jobs." },
  { label: "Every application takes forever", fix: "We tailor your resume for each job, so 50 applications take about 2 hours, not about 38 (our estimate)." },
  { label: "Job boards are too crowded", fix: "We help you reach companies directly, so you are not one of hundreds of applicants on a board." },
];

const GOALS = [
  "Real experience for my resume",
  "Money for school",
  "Figure out what I want to do",
  "A full-time offer after I graduate",
  "A well-known company on my resume",
  "Co-op credit I need to graduate",
];

const NOT_SURE = "Not sure yet";
const ANYWHERE = "Anywhere";
const PLACES = ["Remote", ANYWHERE, "Toronto", "Waterloo", "Vancouver", "Montréal", "New York", "San Francisco"];

// Price per week, shown under each plan (playbook chapter 07). 3 terms or 12 months a year, 52 weeks a year.
const PER_WEEK = { term: (45 * 3) / 52, monthly: (25 * 12) / 52 };

type Match = { firm: string; job: string; role: string; fit: number; why: string; hidden: boolean };

// Puts just the job name in italics inside a sentence, like "Fits your *Policy / Government* goal."
const withJob = (text: string, job: string) =>
  text.split(job).flatMap((part, i) => (i === 0 ? [part] : [<em key={i}>{job}</em>, part]));

// The city part of "Where", or "" for no city.
const cityOf = (where: string) => {
  const place = where.split(",")[0].trim();
  return place === ANYWHERE ? "" : place;
};

// Up to six example matches, spread across the job areas the student picked.
function exampleMatches(jobs: string[], where: string, program: string): Match[] {
  const place = cityOf(where);
  const out: Match[] = [];
  for (let round = 0; round < 3 && out.length < 6; round++) {
    for (const job of jobs) {
      if (out.length >= 6) break;
      // A role the student typed in gets plain firm types.
      const firm = (ROLES[job] ?? [`A ${job.toLowerCase()} team`, `A startup hiring for ${job.toLowerCase()}`, `A company hiring for ${job.toLowerCase()}`])[round];
      if (!firm || out.some((m) => m.firm === firm)) continue;
      const n = out.length;
      const why = [
        program
          ? `Real ${job} projects that turn your ${program} studies into experience employers want.`
          : `Real ${job} projects that give you the experience employers look for.`,
        place === "Remote"
          ? `Builds your ${job} skills from anywhere, and grows a network in your field.`
          : place
            ? `Builds your ${job} skills in ${place}, and grows a network where you want to work.`
            : `Builds your ${job} skills and a network in your field.`,
        `A small team that gives students real ${job} work. It hires without posting jobs.`,
      ][n % 3];
      out.push({ firm, job, role: `${job} co-op`, fit: 94 - n * 4, why, hidden: n % 3 === 2 });
    }
  }
  return out;
}

// Fewer roles make sharper tailored resumes.
const MAX_ROLES = 3;

// The next few co-op terms, starting with the one after today's. Terms are 4 months: Jan-Apr, May-Aug, Sep-Dec.
function upcomingTerms(count: number): string[] {
  const names = ["Winter", "Summer", "Fall"];
  const now = new Date();
  let year = now.getFullYear();
  let idx = Math.floor(now.getMonth() / 4) + 1;
  const out: string[] = [];
  while (out.length < count) {
    if (idx > 2) {
      idx = 0;
      year += 1;
    }
    out.push(`${names[idx]} ${year}`);
    idx++;
  }
  return out;
}

// Answers saved before Stripe come back only after a cancelled payment, and only if they are whole enough to use.
function restoredDraft() {
  if (new URLSearchParams(window.location.search).get("checkout") !== "cancelled") return null;
  const d = readDraft();
  const jobs = Array.isArray(d?.jobs) ? d.jobs.filter((j): j is string => typeof j === "string") : [];
  return d && jobs.length > 0 ? { ...d, jobs } : null;
}
const text = (v: unknown) => (typeof v === "string" ? v : "");
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export default function Onboarding() {
  // School and program arrive filled in when the student came from the home page form.
  // Read in the first render, cleared after. StrictMode runs the first render twice in dev, so clearing must wait.
  const [prefill] = useState(readPrefill);
  useEffect(clearPrefill, []);
  // Back from a cancelled payment: every answer is restored and the plan picker opens.
  const [draft] = useState(restoredDraft);
  const [step, setStep] = useState<Step>(draft ? "plans" : "name");
  const [name, setName] = useState(text(draft?.name) || prefill.name || "");
  const [school, setSchool] = useState(text(draft?.school) || prefill.school || "");
  const [program, setProgram] = useState(text(draft?.program) || prefill.program || "");
  const [level, setLevel] = useState(text(draft?.level));
  const [experience, setExperience] = useState(text(draft?.experience));
  const [applied, setApplied] = useState(text(draft?.applied));
  const [struggles, setStruggles] = useState<string[]>(list(draft?.struggles));
  const [goals, setGoals] = useState<string[]>(list(draft?.goals));
  const [jobs, setJobs] = useState<string[]>(list(draft?.jobs));
  const [term, setTerm] = useState(text(draft?.term));
  const [where, setWhere] = useState(text(draft?.where));
  const [custom, setCustom] = useState("");
  const [adding, setAdding] = useState(false);
  const [moreRoles, setMoreRoles] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  // "Edit" on the summary sends the student to one screen, then straight back to the summary.
  const [returnTo, setReturnTo] = useState<Step | null>(null);
  const [found, setFound] = useState(0);
  const [percent, setPercent] = useState(0);
  const [plan, setPlan] = useState<"monthly" | "term">(draft?.plan === "monthly" ? "monthly" : "term");
  // No sign-in yet, so Stripe needs an email for the receipt and the entitlement.
  const [payEmail, setPayEmail] = useState(text(draft?.payEmail));
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const terms = [...upcomingTerms(6), NOT_SURE];
  const matches = exampleMatches(jobs, where, program);
  const first = name.trim().split(/\s+/)[0] ?? "";
  const place = cityOf(where);
  const fixes = STRUGGLES.filter((s) => struggles.includes(s.label));
  const noExperience = experience === NO_EXPERIENCE || struggles.includes(EMPTY_RESUME);
  // The lines that tick off one by one on the "Finding your firms…" screen, built from the answers.
  const finding = [
    "Reading your answers",
    file ? "Rating your resume" : noExperience ? "Finding the strengths you already have" : "Building your profile",
    place && place !== "Remote" ? `Searching companies in ${place}` : "Searching companies that hire co-ops",
    `Ranking your best fits for ${jobs[0] ?? "your roles"}`,
  ];

  // One event per step reached. StrictMode runs effects twice in dev, so the ref keeps each to one.
  const seen = useRef(new Set<Step>());
  useEffect(() => {
    if (seen.current.has(step)) return;
    seen.current.add(step);
    const event = STEP_EVENTS[step];
    if (event) track(event);
    if (QUESTIONS.some((q) => q.key === step)) track("onboarding_step", step);
  }, [step]);

  // Tick the "Finding your firms…" lines and count up to 100%, then show the matches.
  useEffect(() => {
    if (step !== "analyzing") return;
    setFound(0);
    setPercent(0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = reduce ? 300 : FINDING_MS;
    const total = tick * finding.length;
    const start = performance.now();
    const counter = setInterval(() => setPercent(Math.min(100, Math.round(((performance.now() - start) / total) * 100))), 50);
    const timers = finding.map((_, i) => setTimeout(() => setFound(i + 1), tick * (i + 1)));
    timers.push(setTimeout(() => setStep("matches"), tick * (finding.length + 1)));
    return () => {
      clearInterval(counter);
      timers.forEach(clearTimeout);
    };
    // Runs once per visit to this screen. The lines are rebuilt each render but their count never changes.
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
    card.addEventListener("invalid", onInvalid, true);
    return () => card.removeEventListener("invalid", onInvalid, true);
  }, []);
  // Typing hides the bubble. This runs inside React's own input event (onInput on the card), because changing state from
  // a plain browser listener before React saw the keystroke made React drop that first letter.
  const hideBubble = () => setBubble(null);

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
    // The address without "?checkout=cancelled", so entries made here do not carry it.
    const url = window.location.pathname + window.location.hash;
    if (prev === null && draft) {
      // Back from Stripe: rebuild the screens before the plan picker, so Back steps through them instead of leaving.
      const before: Step[] = [...QUESTIONS.map((q) => q.key), "matches", "account"];
      history.replaceState({ step: before[0] }, "", url);
      for (const s of before.slice(1)) history.pushState({ step: s }, "", url);
      history.pushState(entry, "", url);
    } else if (prev === null || (prev === "analyzing" && step === "matches")) history.replaceState(entry, "");
    else history.pushState(entry, "");
  }, [step, draft]);
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

  // The plan picker opens with the cursor on the selected plan (Per term, unless they picked Monthly before).
  useEffect(() => {
    if (step !== "plans") return;
    cardRef.current?.querySelector<HTMLInputElement>(".plans input:checked")?.focus({ preventScroll: true });
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

  const idx = QUESTIONS.findIndex((q) => q.key === step);
  const go = (to: Step) => {
    setStep(returnTo ?? to);
    setReturnTo(null);
  };
  const advance = () => go(QUESTIONS[idx + 1]?.key ?? "analyzing");
  const edit = (to: Step) => {
    setReturnTo("done");
    setStep(to);
  };
  const back = idx > 0 ? () => history.back() : () => (window.location.hash = "#/");

  // Tapping an answer on a single-answer screen moves on. Going back before it fires cancels it.
  const autoNext = useRef(0);
  useEffect(() => () => clearTimeout(autoNext.current), [step]);
  const pickOne = (set: (v: string) => void) => (v: string) => {
    set(v);
    clearTimeout(autoNext.current);
    autoNext.current = window.setTimeout(advance, AUTO_NEXT_MS);
  };
  const pickMany = (set: (f: (cur: string[]) => string[]) => void) => (v: string) =>
    set((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));

  // Header arrows. First screen: next only. Summary: back only. "Finding your firms…": none.
  // Next does what the screen's main button does, so the "fill out this field" bubble still shows.
  const [arrowSlot, setArrowSlot] = useState<HTMLElement | null>(null);
  useEffect(() => setArrowSlot(document.getElementById("header-arrows")), []);
  const showBack = step !== QUESTIONS[0].key && step !== "analyzing";
  const showNext = step !== "done" && step !== "analyzing";
  // → is faded until the screen is answered. "Where" and the resume are optional. Signing up needs a sign-up button.
  const stepDone: Partial<Record<Step, boolean>> = {
    name: name.trim() !== "",
    school: school.trim() !== "",
    program: program.trim() !== "",
    year: level !== "",
    experience: experience !== "",
    applied: applied !== "",
    struggle: struggles.length > 0,
    goal: goals.length > 0,
    roles: jobs.length > 0,
    term: term !== "",
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

  // Every question screen is a form, so Enter and the header → arrow both submit it.
  const onSubmit = (ready: boolean) => (e: FormEvent) => {
    e.preventDefault();
    if (ready) advance();
  };

  // Pain-led copy for the "you're not alone" screen.
  const empathy = noExperience
    ? {
        title: "Little experience? You can still land a co-op.",
        lead: "Every co-op student starts with an empty co-op section. What matters is showing what you have already done, well.",
      }
    : applied === "More than 50" || applied === "21 to 50"
      ? {
          title: `That is a lot of applications, ${first}.`,
          lead: `By hand, each one takes about ${PER_APP_BY_HAND} minutes (our estimate). Let's make the next ones count.`,
        }
      : { title: `You're in the right place, ${first}.`, lead: "Here is how Workterm helps with what you told us." };

  return (
    <main className="authpage">
      {arrowSlot && createPortal(arrows, arrowSlot)}
      <div
        className={step === "plans" ? "card authcard wide plans-step" : "card authcard wide"}
        ref={cardRef}
        onInput={hideBubble}
        onChange={hideBubble}
      >
        {bubble && (
          <p className="field-bubble" role="alert" style={{ top: bubble.top, left: bubble.left }}>
            <span aria-hidden="true">!</span> Please fill out this field.
          </p>
        )}
        {idx >= 0 && (
          <div className="progress-bar">
            <p className="progress-label">
              <span>{QUESTIONS[idx].section}</span>
              <span>
                {idx + 1} of {QUESTIONS.length}
              </span>
            </p>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Sign up progress"
              aria-valuemin={1}
              aria-valuemax={QUESTIONS.length}
              aria-valuenow={idx + 1}
            >
              <span style={{ width: `${((idx + 1) / QUESTIONS.length) * 100}%` }} />
            </div>
          </div>
        )}

        {/* key={step} remounts each screen, so it slides in. */}
        <div className="screen" key={step}>
          {step === "name" && (
            <form className="stack" onSubmit={onSubmit(true)}>
              <p className="eyebrow-small">Let's find your co-op</p>
              <h1 className="authtitle">First, what's your name?</h1>
              <p className="lead small">A few quick questions, then we show you companies that fit you. About 2 minutes.</p>
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
              <Nav back={back} backLabel="Home" />
            </form>
          )}

          {step === "school" && (
            <form className="stack" onSubmit={onSubmit(true)}>
              <p className="eyebrow-small">Nice to meet you{first ? `, ${first}` : ""}</p>
              <h1 className="authtitle">Where do you go to school?</h1>
              <p className="lead small">We look for companies that hire students from your school.</p>
              <Suggest label="School" options={SCHOOLS} value={school} onChange={setSchool} placeholder="Start typing your school" autoFocus />
              <Nav back={back} />
            </form>
          )}

          {step === "program" && (
            <form className="stack" onSubmit={onSubmit(true)}>
              <h1 className="authtitle">What do you study?</h1>
              <p className="lead small">Your program decides which roles we suggest first.</p>
              <Suggest label="Program" options={PROGRAMS} value={program} onChange={setProgram} placeholder="Start typing your program" autoFocus />
              <Nav back={back} />
            </form>
          )}

          {step === "year" && (
            <form className="stack" onSubmit={onSubmit(level !== "")}>
              <h1 className="authtitle">What year are you in?</h1>
              <p className="lead small">So we match you with roles at your level.</p>
              <Options label="Year of study" options={asOptions(LEVELS)} picked={[level]} onPick={pickOne(setLevel)} two />
              <Nav back={back} disabled={level === ""} />
            </form>
          )}

          {step === "experience" && (
            <form className="stack" onSubmit={onSubmit(experience !== "")}>
              <h1 className="authtitle">How much work experience do you have?</h1>
              <p className="lead small">Be honest. There is no wrong answer.</p>
              <Options label="Work experience" options={EXPERIENCE} picked={[experience]} onPick={pickOne(setExperience)} />
              <Nav back={back} disabled={experience === ""} />
            </form>
          )}

          {step === "applied" && (
            <form className="stack" onSubmit={onSubmit(applied !== "")}>
              <h1 className="authtitle">How many co-op applications have you sent so far?</h1>
              <p className="lead small">Count job boards, emails and your school's portal.</p>
              <Options label="Applications sent" options={asOptions(APPLIED)} picked={[applied]} onPick={pickOne(setApplied)} two />
              <Nav back={back} disabled={applied === ""} />
            </form>
          )}

          {step === "struggle" && (
            <form className="stack" onSubmit={onSubmit(struggles.length > 0)}>
              <h1 className="authtitle">What makes your co-op search hard?</h1>
              <p className="lead small">Pick all that apply.</p>
              <Options label="What makes it hard" options={STRUGGLES} picked={struggles} onPick={pickMany(setStruggles)} multi />
              <Nav back={back} disabled={struggles.length === 0} />
            </form>
          )}

          {step === "empathy" && (
            <form className="stack" onSubmit={onSubmit(true)}>
              <p className="eyebrow-small">You're not alone</p>
              <h1 className="authtitle">{empathy.title}</h1>
              <p className="lead small">{empathy.lead}</p>
              <ul className="fixes">
                {fixes.map((f) => (
                  <li key={f.label}>
                    <span className="fix-pain">“{f.label}”</span>
                    <span className="fix-how">
                      <Check /> {f.fix}
                    </span>
                  </li>
                ))}
              </ul>
              <TimeBars />
              <Nav back={back} next="Let's fix that" />
            </form>
          )}

          {step === "goal" && (
            <form className="stack" onSubmit={onSubmit(goals.length > 0)}>
              <h1 className="authtitle">What do you want most from your co-op?</h1>
              <p className="lead small">Pick all that apply. It helps us find the right fit.</p>
              <Options label="Co-op goals" options={asOptions(GOALS)} picked={goals} onPick={pickMany(setGoals)} multi />
              <Nav back={back} disabled={goals.length === 0} />
            </form>
          )}

          {step === "roles" && (
            <form className="stack" onSubmit={onSubmit(jobs.length > 0)}>
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
              <Nav back={back} disabled={jobs.length === 0} />
            </form>
          )}

          {step === "term" && (
            <form className="stack" onSubmit={onSubmit(term !== "")}>
              <h1 className="authtitle">When is your next co-op term?</h1>
              <p className="lead small">Hiring usually starts months before a term begins, so now is a good time to start.</p>
              <Options label="Next co-op term" options={asOptions(terms)} picked={[term]} onPick={pickOne(setTerm)} two />
              <Nav back={back} disabled={term === ""} />
            </form>
          )}

          {step === "where" && (
            <form className="stack" onSubmit={onSubmit(true)}>
              <h1 className="authtitle">Where do you want to work?</h1>
              <p className="lead small">Tap one or type a city. You can skip this.</p>
              <div className="chips role-chips" role="group" aria-label="Places">
                {PLACES.map((p) => (
                  <button
                    type="button"
                    key={p}
                    className={where === p ? "chip on" : "chip"}
                    aria-pressed={where === p}
                    onClick={() => setWhere(where === p ? "" : p)}
                  >
                    {where === p && <Check />}
                    {p}
                  </button>
                ))}
              </div>
              <label>
                City <span className="opt">(optional)</span>
                <input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Like Calgary, or Remote" maxLength={100} />
              </label>
              <Nav back={back} next={where.trim() ? "Continue" : "Skip"} />
            </form>
          )}

          {step === "privacy" && (
            <form className="stack" onSubmit={onSubmit(true)}>
              <p className="eyebrow-small">Almost there</p>
              <h1 className="authtitle">Thanks for trusting us{first ? `, ${first}` : ""}.</h1>
              <p className="lead small">Next is your resume. Here is how we treat it and you.</p>
              <ul className="promises">
                <li>
                  <Check /> Nothing is sent until you approve it.
                </li>
                <li>
                  <Check /> Your resume goes to a company only when you say so.
                </li>
                <li>
                  <Check /> We only reword what is true. We never make up experience.
                </li>
                <li>
                  <Check /> We can't promise a placement. We help every application count.
                </li>
              </ul>
              <Nav back={back} />
            </form>
          )}

          {step === "resume" && (
            <form className="stack" onSubmit={onSubmit(true)}>
              <h1 className="authtitle">Upload your resume</h1>
              <p className="lead small">
                {noExperience
                  ? "No resume yet? That's fine. Skip this and add one later."
                  : "We rate it against your roles. In this preview, it stays in your browser."}
              </p>
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
              <Nav back={back} next={file ? "Find my companies" : "Skip and find my companies"} />
            </form>
          )}

          {step === "analyzing" && (
            <div className="analyzing" role="status">
              <p className="finding-percent" aria-hidden="true">
                {percent}%
              </p>
              <h1 className="authtitle">Finding your firms…</h1>
              <div className="progress-track finding-track" aria-hidden="true">
                <span style={{ width: `${percent}%` }} />
              </div>
              <ul className="finding">
                {finding.map((f, i) => (
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
              <h1 className="authtitle">
                {first ? `${first}, meet` : "Meet"} your {matches.length} best-fit companies for{" "}
                {jobs.slice(0, 3).map((j, i, all) => (
                  <span key={j}>
                    {i > 0 && (i === all.length - 1 ? " and " : ", ")}
                    <em>{j}</em>
                  </span>
                ))}
              </h1>
              <ol className="matches">
                {matches.map((m) => (
                  <li key={m.firm}>
                    <div>
                      <span className="match-title">
                        <strong>{m.firm}</strong>
                        {m.hidden && <span className="match-tag">NOT POSTED</span>}
                      </span>
                      <span className="match-role">{withJob(m.role, m.job)}</span>
                      <span className="match-why">{withJob(m.why, m.job)}</span>
                    </div>
                    <div className="match-side">
                      <span className="pill green">{m.fit}% fit</span>
                    </div>
                  </li>
                ))}
              </ol>
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
              {/* Arriving from the matches, the plan picker starts on Per term. */}
              <AuthButtons
                verb="Sign up"
                onPick={() => {
                  setPlan("term");
                  go("plans");
                }}
              />
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
              onSubmit={async (e) => {
                e.preventDefault();
                track("trial_start_click");
                setPaying(true);
                setPayError("");
                const result = await startCheckout(payEmail, plan);
                if ("url" in result) {
                  // If they cancel on Stripe's page, sign-up opens here again with these answers.
                  saveDraft({ name, school, program, level, experience, applied, struggles, goals, jobs, term, where, plan, payEmail });
                  window.location.href = result.url; // off to Stripe's payment page
                  return;
                }
                setPaying(false);
                setPayError(
                  result.error === "invalid_email"
                    ? "Please enter a valid email."
                    : result.error === "not_configured"
                      ? "Payments are not set up yet. Please try again later."
                      : "Something went wrong. Please try again.",
                );
              }}
            >
              <p className="eyebrow-small">Your co-op plan is ready</p>
              <h1 className="authtitle">
                {first ? `${first}, start` : "Start"} applying to your {matches.length} matches.
              </h1>
              <p className="lead small">Cancel anytime. Payment is handled by Stripe. We cannot promise a placement.</p>
              {fixes.length > 0 && (
                <div className="plan-fixes">
                  <p className="plan-fixes-title">Built around what you told us</p>
                  <ul>
                    {fixes.map((f) => (
                      <li key={f.label}>
                        <Check /> <span>{f.fix}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="plans" role="radiogroup" aria-label="Plans">
                <label className={plan === "term" ? "plan on" : "plan"}>
                  <input type="radio" name="plan" checked={plan === "term"} onChange={() => setPlan("term")} />
                  <span className="plan-head">
                    <strong>Per term</strong>
                    <span className="pill gold">Best value</span>
                  </span>
                  <span className="plan-price">
                    $45 <small>every 4 months</small>
                  </span>
                  <span className="plan-week">About ${PER_WEEK.term.toFixed(2)} a week</span>
                  <span className="plan-for">
                    {term && term !== NOT_SURE ? `Covers your whole ${term} search, start to offer.` : "For a full co-op search, start to offer."}
                  </span>
                  <ul>
                    <li>Everything in Monthly</li>
                    <li>Covers a whole 4-month hiring season</li>
                    <li>Save $55 a term versus Monthly</li>
                    <li>A reminder before each term renews</li>
                  </ul>
                </label>
                <label className={plan === "monthly" ? "plan on" : "plan"}>
                  <input type="radio" name="plan" checked={plan === "monthly"} onChange={() => setPlan("monthly")} />
                  <span className="plan-head">
                    <strong>Monthly</strong>
                  </span>
                  <span className="plan-price">
                    $25 <small>a month</small>
                  </span>
                  <span className="plan-week">About ${PER_WEEK.monthly.toFixed(2)} a week</span>
                  <span className="plan-for">For a quick start. Stop any month.</span>
                  <ul>
                    <li>See your matches and rate your resume</li>
                    <li>A tailored resume for every job</li>
                    <li>Emails sent from your Gmail or Outlook, after you approve</li>
                    <li>Follow-ups and reply tracking</li>
                  </ul>
                </label>
              </div>
              <label>
                Email for your receipt
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={payEmail}
                  onChange={(e) => setPayEmail(e.target.value)}
                  placeholder="you@school.ca"
                />
              </label>
              {payError && (
                <p className="error" role="alert">
                  {payError}
                </p>
              )}
              <Nav back={() => history.back()} next={paying ? "Opening checkout…" : "Continue to payment"} disabled={paying} />
              <p className="fine center">Renews automatically every {plan === "term" ? "4 months" : "month"} until you cancel.</p>
            </form>
          )}

          {step === "done" && (
            <div className="stack">
              <h1 className="authtitle">You are all set.</h1>
              <ul className="summary">
                <li>
                  <span>Name</span> {name}
                  <button type="button" className="linkish edit" onClick={() => edit("name")} aria-label="Edit name">
                    Edit
                  </button>
                </li>
                <li>
                  <span>School</span> {school}, {program}, {level}
                  <button type="button" className="linkish edit" onClick={() => edit("school")} aria-label="Edit school">
                    Edit
                  </button>
                </li>
                <li>
                  <span>Next term</span> {term}
                  <button type="button" className="linkish edit" onClick={() => edit("term")} aria-label="Edit next term">
                    Edit
                  </button>
                </li>
                <li>
                  <span>Roles</span> {jobs.join(", ")}
                  {where ? ` · ${where}` : ""}
                  <button type="button" className="linkish edit" onClick={() => edit("roles")} aria-label="Edit roles">
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
                  <span>Plan</span> {plan === "term" ? "Pro – Term" : "Pro – Monthly"}
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
      </div>
    </main>
  );
}

const Check = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Big answer buttons, one per row (or two per row with `two`). A round mark for one answer, a square one for many.
function Options({
  label,
  options,
  picked,
  onPick,
  multi = false,
  two = false,
}: {
  label: string;
  options: Choice[];
  picked: string[];
  onPick: (v: string) => void;
  multi?: boolean;
  two?: boolean;
}) {
  return (
    <div className={two ? "options two" : "options"} role="group" aria-label={label}>
      {options.map((o) => {
        const on = picked.includes(o.label);
        return (
          <button type="button" key={o.label} className={on ? "option on" : "option"} aria-pressed={on} onClick={() => onPick(o.label)}>
            <span className="option-text">
              {o.label}
              {o.note && <small>{o.note}</small>}
            </span>
            <span className={multi ? "option-mark square" : "option-mark"} aria-hidden="true">
              {on && <Check />}
            </span>
          </button>
        );
      })}
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
