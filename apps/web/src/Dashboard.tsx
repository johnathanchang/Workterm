import { FormEvent, useEffect, useRef, useState } from "react";
import { getMe, type Me, openBillingPortal, type Profile, saveProfile, track } from "./api";
import { ALL_ROLES } from "./lists";
import { exampleMatches } from "./Onboarding";
import { clearSession, getSessionEmail, setSessionEmail } from "./session";

const MAX_ROLES = 3;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TABS = [
  ["overview", "Overview"],
  ["matches", "Matches"],
  ["resume", "Resume"],
  ["applications", "Applications"],
  ["assistant", "Ask Workterm"],
  ["preferences", "Preferences"],
  ["plan", "Plan and billing"],
] as const;
type Tab = (typeof TABS)[number][0];

const planName = (plan: Me["plan"]) => (plan === "monthly" ? "Pro Monthly" : "Pro Term");
const dateOf = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

// The student's home after they pay (route #/welcome shows the welcome banner on top, #/dashboard does not).
// Basic on purpose: plan, preferences, resume, matches, an application tracker, and a small helper.
export default function Dashboard({ welcome }: { welcome: boolean }) {
  const [email, setEmail] = useState(getSessionEmail);
  const [me, setMe] = useState<Me | null>(null);
  const [problem, setProblem] = useState<"" | "unavailable" | "error">("");
  const [loading, setLoading] = useState(Boolean(email));
  const [tab, setTab] = useState<Tab>("overview");

  // Load the student. Right after paying, Stripe's message may take a few seconds to arrive, so on the welcome page
  // we ask again (up to 8 times) until the plan shows as active.
  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    let tries = 0;
    const load = async () => {
      const result = await getMe(email);
      if (cancelled) return;
      if (result === "unavailable" || result === "error") {
        setProblem(result);
        setLoading(false);
        return;
      }
      setMe(result);
      setLoading(false);
      if (welcome && !result.pro && ++tries < 8) setTimeout(load, 1500);
    };
    setLoading(true);
    load();
    return () => {
      cancelled = true;
    };
  }, [email, welcome]);

  useEffect(() => {
    if (me) track(welcome ? "welcome_view" : "dashboard_view");
  }, [Boolean(me), welcome]);

  if (!email) return <EmailGate onEmail={(e) => (setSessionEmail(e), setEmail(e))} />;
  if (loading && !me) {
    return (
      <main className="dash">
        <p className="dash-loading">Loading your dashboard…</p>
      </main>
    );
  }
  if (problem === "unavailable") {
    return (
      <main className="authpage">
        <div className="card authcard">
          <h1 className="authtitle">Sign-in opens soon</h1>
          <p className="lead small">Dashboards open to students with Google and Microsoft sign-in. Check back when Workterm opens.</p>
          <a className="btn" href="#/">
            Back to home
          </a>
        </div>
      </main>
    );
  }
  if (!me) {
    return (
      <main className="authpage">
        <div className="card authcard">
          <h1 className="authtitle">We could not load your dashboard</h1>
          <p className="lead small">Please refresh in a moment.</p>
        </div>
      </main>
    );
  }

  const profile = me.profile;
  const first = profile?.name?.trim().split(/\s+/)[0] ?? "";

  return (
    <main className="dash">
      <div className="dash-head">
        <div>
          <p className="eyebrow-small">{welcome ? "Payment received" : "Your dashboard"}</p>
          <h1 className="dash-title">{welcome ? `Welcome to Workterm${first ? `, ${first}` : ""}!` : `Hi${first ? `, ${first}` : ""}`}</h1>
        </div>
        <button
          type="button"
          className="linkish dash-out"
          onClick={() => {
            clearSession();
            setEmail("");
            setMe(null);
          }}
        >
          Not you? Switch account
        </button>
      </div>

      <div className="dash-shell">
        <nav className="dash-nav" aria-label="Dashboard pages">
          {TABS.map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={tab === key ? "dash-tab on" : "dash-tab"}
              aria-current={tab === key ? "page" : undefined}
              onClick={() => {
                setTab(key);
                window.scrollTo({ top: 0 });
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="dash-page">
          {tab === "overview" && (
            <>
              <GettingStarted me={me} go={setTab} />
              <div className="dash-grid">
                <PlanCard me={me} welcome={welcome} />
                <Stats />
                {profile && <Matches profile={profile} limit={3} onMore={() => setTab("matches")} />}
              </div>
            </>
          )}
          {tab === "matches" && (profile ? <Matches profile={profile} limit={8} /> : <Empty text="Finish onboarding to see your matches." />)}
          {tab === "resume" && <ResumeCard />}
          {tab === "applications" && <Stats />}
          {tab === "assistant" && <Assistant profile={profile} />}
          {tab === "preferences" &&
            (profile ? (
              <Preferences email={me.email} profile={profile} onSaved={(p) => setMe({ ...me, profile: p })} />
            ) : (
              <Empty text="Finish onboarding to set your preferences." />
            ))}
          {tab === "plan" && <PlanCard me={me} welcome={welcome} />}
        </div>
      </div>
    </main>
  );
}

// Dev stand-in for "Log in": type the email you paid with. Real Google and Microsoft sign-in replaces it.
function EmailGate({ onEmail }: { onEmail: (email: string) => void }) {
  const [value, setValue] = useState("");
  const [bad, setBad] = useState(false);
  return (
    <main className="authpage">
      <form
        className="card authcard"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          const v = value.trim().toLowerCase();
          if (!EMAIL_PATTERN.test(v)) return setBad(true);
          onEmail(v);
        }}
      >
        <h1 className="authtitle">Open your dashboard</h1>
        <p className="lead small">Type the email you signed up with. (Google and Microsoft sign-in replace this soon.)</p>
        <label>
          Email
          <input type="email" autoComplete="email" value={value} onChange={(e) => setValue(e.target.value)} placeholder="you@school.ca" />
        </label>
        {bad && (
          <p className="error" role="alert">
            Please enter a valid email.
          </p>
        )}
        <button type="submit">Open dashboard</button>
      </form>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <section className="card dash-card">
      <p className="dash-sub">{text}</p>
    </section>
  );
}

function GettingStarted({ me, go }: { me: Me; go: (t: Tab) => void }) {
  const steps: { done: boolean; label: string; note: string; tab?: Tab }[] = [
    { done: me.pro, label: "Payment confirmed", note: me.pro ? `${planName(me.plan)} is on.` : "Confirming with Stripe, this takes a few seconds…", tab: "plan" },
    { done: Boolean(me.profile?.jobs.length), label: "Your roles are saved", note: me.profile?.jobs.join(", ") || "Pick your roles in Preferences.", tab: "preferences" },
    { done: false, label: "Add your resume", note: "Coming next. We will rate it against each role.", tab: "resume" },
    { done: false, label: "Connect Gmail or Outlook", note: "Coming next. Emails go from your own inbox, only after you approve." },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <section className="card dash-card welcome-card">
      <h2>
        Your first steps <span className="pill grey">{doneCount} of {steps.length}</span>
      </h2>
      <div className="step-bar" aria-hidden="true">
        <span style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ol className="checklist">
        {steps.map((s) => (
          <li key={s.label} className={s.done ? "done" : ""}>
            <span className="tick" aria-hidden="true">
              {s.done ? "✓" : ""}
            </span>
            <span>
              <strong>{s.label}</strong>
              <small>{s.note}</small>
            </span>
            {!s.done && s.tab && (
              <button type="button" className="linkish step-go" onClick={() => go(s.tab!)}>
                Open
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function PlanCard({ me, welcome }: { me: Me; welcome: boolean }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  async function manage() {
    setBusy(true);
    setNote("");
    const result = await openBillingPortal(me.email);
    if ("url" in result) {
      window.location.href = result.url;
      return;
    }
    setBusy(false);
    setNote(
      result.error === "portal_unavailable"
        ? "Billing changes are not switched on yet. Email us and we will sort it out."
        : "Something went wrong. Please try again.",
    );
  }
  return (
    <section className="card dash-card">
      <h2>Your plan</h2>
      {me.pro ? (
        <>
          <p className="dash-big">
            {planName(me.plan)} <span className="pill green">Active</span>
          </p>
          {me.renews_at && <p className="dash-sub">Renews on {dateOf(me.renews_at)}. Cancel anytime.</p>}
          <button type="button" className="ghost-btn" onClick={manage} disabled={busy}>
            {busy ? "Opening…" : "Manage billing"}
          </button>
        </>
      ) : (
        <>
          <p className="dash-big">
            No active plan <span className="pill grey">{welcome ? "Checking" : "Inactive"}</span>
          </p>
          <p className="dash-sub">{welcome ? "If you just paid, this updates in a few seconds." : "Start a plan to apply to your matches."}</p>
          {!welcome && (
            <a className="btn" href="#/signup">
              Choose a plan
            </a>
          )}
        </>
      )}
      {note && (
        <p className="notice" role="status">
          {note}
        </p>
      )}
    </section>
  );
}

// The key events from rule 9. All zero until the real app runs; they show the student where the work will appear.
function Stats() {
  const items = [
    ["Matched", "firm_matched"],
    ["Drafted", "email_drafted"],
    ["Approved", "email_approved"],
    ["Sent", "email_sent"],
    ["Replies", "reply_received"],
  ];
  return (
    <section className="card dash-card">
      <h2>Your applications</h2>
      <ul className="stat-row">
        {items.map(([label]) => (
          <li key={label}>
            <strong>0</strong>
            <span>{label}</span>
          </li>
        ))}
      </ul>
      <p className="dash-sub">Drafts, approvals and replies show up here once sending opens. Nothing is ever sent without your approval.</p>
    </section>
  );
}

function Preferences({ email, profile, onSaved }: { email: string; profile: Profile; onSaved: (p: Profile) => void }) {
  const [jobs, setJobs] = useState(profile.jobs);
  const [place, setPlace] = useState(profile.place ?? "");
  const [term, setTerm] = useState(profile.term ?? "");
  const [custom, setCustom] = useState("");
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");
  const full = jobs.length >= MAX_ROLES;

  const chips = [...jobs, ...ALL_ROLES.filter((r) => !jobs.includes(r)).slice(0, 12)];
  const toggle = (j: string) => setJobs((cur) => (cur.includes(j) ? cur.filter((x) => x !== j) : cur.length < MAX_ROLES ? [...cur, j] : cur));

  async function save(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const next: Profile = { ...profile, jobs, place: place.trim() || null, term: term.trim() || null };
    const ok = await saveProfile({ email, ...next, place: next.place ?? "", term: next.term ?? "" });
    if (!ok) return setStatus("error");
    track("profile_edited");
    onSaved(next);
    setStatus("saved");
  }

  return (
    <form className="card dash-card dash-wide" onSubmit={save}>
      <h2>Preferred jobs</h2>
      <p className="dash-sub">Pick up to {MAX_ROLES}. Fewer roles make sharper tailored resumes.</p>
      <div className="chips role-chips" role="group" aria-label="Preferred roles">
        {chips.map((r) => (
          <button type="button" key={r} className={jobs.includes(r) ? "chip on" : "chip"} aria-pressed={jobs.includes(r)} onClick={() => toggle(r)}>
            {r}
          </button>
        ))}
      </div>
      <div className="dash-row">
        <label>
          Add your own role
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const v = custom.trim().slice(0, 40);
              if (v && !jobs.includes(v) && !full) setJobs([...jobs, v]);
              setCustom("");
            }}
            placeholder="Press Enter to add"
            maxLength={40}
          />
        </label>
        <label>
          Where
          <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Remote, or a city" maxLength={100} />
        </label>
        <label>
          Next term
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Winter 2027" maxLength={50} />
        </label>
      </div>
      <div className="dash-actions">
        <button type="submit" disabled={status === "saving" || jobs.length === 0}>
          {status === "saving" ? "Saving…" : "Save changes"}
        </button>
        {status === "saved" && <span className="dash-ok">Saved</span>}
        {status === "error" && <span className="error">Could not save. Try again.</span>}
      </div>
    </form>
  );
}

function Matches({ profile, limit, onMore }: { profile: Profile; limit: number; onMore?: () => void }) {
  const matches = exampleMatches(profile.jobs, profile.place ?? "", profile.program ?? "").slice(0, limit);
  return (
    <section className="card dash-card dash-wide">
      <h2>Your matches</h2>
      <p className="dash-sub">Examples for now. Real companies, found from live data, arrive with the full app.</p>
      <ol className="matches">
        {matches.map((m) => (
          <li key={m.firm}>
            <div>
              <span className="match-title">
                <strong>{m.firm}</strong>
                {m.hidden && <span className="match-tag">NOT POSTED</span>}
              </span>
              <span className="match-role">{m.role}</span>
            </div>
            <div className="match-side">
              <span className="pill green">{m.fit}% fit</span>
            </div>
          </li>
        ))}
      </ol>
      {onMore && (
        <button type="button" className="linkish step-go" onClick={onMore}>
          See all matches
        </button>
      )}
    </section>
  );
}

// The resume stays in this browser for now. Rating and tailoring arrive with the full app.
function ResumeCard() {
  const [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  return (
    <section className="card dash-card">
      <h2>Your resume</h2>
      <p className="dash-sub">{file ? file.name : "No resume added yet."}</p>
      <input
        ref={input}
        type="file"
        accept=".pdf,.doc,.docx"
        hidden
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button type="button" className="ghost-btn" onClick={() => input.current?.click()}>
        {file ? "Replace resume" : "Add resume"}
      </button>
      <p className="notice">Preview: the file stays in your browser. Rating and editing arrive with the full app.</p>
    </section>
  );
}

// A small helper. Scripted answers for now. The real one streams from DeepSeek through the API (stack rule), logs each
// call with its cost, and never sees more of the student than the minimum it needs.
const PROMPTS = ["What should I do first?", "How do I get more replies?", "Help me with my resume"];

function reply(question: string, profile: Profile | null): string {
  const q = question.toLowerCase();
  const role = profile?.jobs[0] ?? "your target role";
  if (q.includes("resume") || q.includes("cv"))
    return `For ${role}, lead with one project that shows the work, not a list of duties. Use numbers where you can ("cut load time 30%"). Keep it to one page, and only claim what is true.`;
  if (q.includes("repl") || q.includes("email") || q.includes("follow"))
    return "Short emails get answered. Name one specific thing about the company, say what you can do for them, and ask one small question. Follow up once after a week. You approve every email before it sends.";
  if (q.includes("first") || q.includes("start"))
    return `Start with your ${role} matches above, then add your resume so we can rate it against them. After that, connect your inbox and approve your first drafts.`;
  return "I can help with your resume, your emails and which companies to try first. The full assistant opens with the full app.";
}

function Assistant({ profile }: { profile: Profile | null }) {
  const [log, setLog] = useState<{ from: "me" | "bot"; text: string }[]>([]);
  const [draft, setDraft] = useState("");
  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    track("assistant_message");
    setLog((cur) => [...cur, { from: "me", text: t }, { from: "bot", text: reply(t, profile) }]);
    setDraft("");
  };
  return (
    <section className="card dash-card dash-wide">
      <h2>
        Ask Workterm <span className="pill grey">Preview</span>
      </h2>
      <p className="dash-sub">Your co-op helper. These are example answers; the live AI helper arrives with the full app.</p>
      <div className="chat" aria-live="polite">
        {log.map((m, i) => (
          <p key={i} className={m.from === "me" ? "bubble me" : "bubble"}>
            {m.text}
          </p>
        ))}
      </div>
      <div className="chips">
        {PROMPTS.map((p) => (
          <button type="button" key={p} className="chip" onClick={() => send(p)}>
            {p}
          </button>
        ))}
      </div>
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask about your resume, emails or companies" maxLength={300} aria-label="Ask Workterm" />
        <button type="submit">Send</button>
      </form>
    </section>
  );
}
