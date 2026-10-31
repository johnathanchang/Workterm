import { FormEvent, useEffect, useState } from "react";
import AuthButtons from "./AuthButtons";

type Step = "account" | "about" | "goals" | "resume" | "analyzing" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "account", label: "Account" },
  { key: "about", label: "About you" },
  { key: "goals", label: "Your goals" },
  { key: "resume", label: "Resume" },
];

const SUGGESTED = ["Software", "Data", "Marketing", "Finance", "Mechanical", "Electrical", "Design", "Product", "Research"];
const LEVELS = ["1st year", "2nd year", "3rd year", "4th year", "5th year or later", "Graduate student"];

// The next four co-op terms, starting with the one after today's. Terms are 4 months: Jan-Apr, May-Aug, Sep-Dec.
function upcomingTerms(): string[] {
  const names = ["Winter", "Summer", "Fall"];
  const now = new Date();
  let year = now.getFullYear();
  let idx = Math.floor(now.getMonth() / 4) + 1;
  const out: string[] = [];
  for (let i = 0; i < 4; i++, idx++) {
    if (idx > 2) {
      idx = 0;
      year += 1;
    }
    out.push(`${names[idx]} ${year}`);
  }
  return out;
}

export default function Onboarding() {
  const [step, setStep] = useState<Step>("account");
  const [school, setSchool] = useState("");
  const [program, setProgram] = useState("");
  const [level, setLevel] = useState("");
  const [term, setTerm] = useState("");
  const [jobs, setJobs] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [where, setWhere] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const terms = upcomingTerms();

  useEffect(() => {
    if (step !== "analyzing") return;
    const t = setTimeout(() => setStep("done"), 2200);
    return () => clearTimeout(t);
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

        {step === "account" && (
          <>
            <h1 className="authtitle">Create your account</h1>
            <p className="lead small">Sign up with your school account. It takes about two minutes.</p>
            <AuthButtons
              verb="Sign up"
              onPick={() => setStep("about")}
            />
            <p className="notice">Preview: this does not create an account yet. It shows the sign-up steps.</p>
            <p className="fine center">
              Already have an account? <a href="#/login">Log in</a>
            </p>
          </>
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
            <label>
              School
              <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Your school" maxLength={100} required />
            </label>
            <label>
              Program
              <input value={program} onChange={(e) => setProgram(e.target.value)} placeholder="Your program" maxLength={100} required />
            </label>
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
            <Nav back={back} next={file ? "Rate my resume" : "Skip for now"} />
          </form>
        )}

        {step === "analyzing" && (
          <div className="analyzing" role="status">
            <div className="spinner" aria-hidden="true" />
            <h1 className="authtitle">Finding your matches…</h1>
            <p className="lead small">Checking your resume against {jobs.slice(0, 3).join(", ")}.</p>
          </div>
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
            </ul>
            <p className="notice">
              Preview only: nothing was saved. Resume rating, job matches and personalized CVs open with early access.
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
