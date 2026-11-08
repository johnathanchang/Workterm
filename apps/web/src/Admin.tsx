import { FormEvent, useEffect, useState } from "react";
import { type AdminOverview, getAdminOverview } from "./api";
import { getAdminKey, setAdminKey } from "./session";

// For the Workterm team only. The API checks the admin key on every call, so this page shows nothing without it.
// Later, Google sign-in with an allow-list of team emails replaces the key.
export default function Admin() {
  const [key, setKey] = useState(getAdminKey);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (k: string) => {
    setLoading(true);
    setError("");
    const result = await getAdminOverview(k);
    setLoading(false);
    if (typeof result === "string") {
      setData(null);
      setAdminKey("");
      setKey("");
      setError(
        result === "unauthorized"
          ? "That key is not right."
          : result === "not_configured"
            ? "The admin key is not set on the server yet (ADMIN_KEY)."
            : "Could not load the numbers. Try again.",
      );
      return;
    }
    setData(result);
  };

  useEffect(() => {
    if (key) load(key);
    // Only on first load. After that, the form and the refresh button call load themselves.
  }, []);

  if (!data) {
    return (
      <main className="authpage">
        <form
          className="card authcard"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            const k = (new FormData(e.currentTarget as HTMLFormElement).get("key") as string).trim();
            if (!k) return;
            setAdminKey(k);
            setKey(k);
            load(k);
          }}
        >
          <h1 className="authtitle">Admin</h1>
          <p className="lead small">Team only. Enter the admin key.</p>
          <label>
            Admin key
            <input name="key" type="password" autoComplete="off" />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading}>
            {loading ? "Checking…" : "Open admin"}
          </button>
        </form>
      </main>
    );
  }

  const { totals, events, steps, breakdowns, recent } = data;
  const count = (name: string) => events[name] ?? 0;
  // The money path, step by step. Counts are events from the last 30 days, so one student can count more than once.
  const funnel: [string, number][] = [
    ["Started onboarding", count("onboarding_started")],
    ["Saw matches", count("firm_matched")],
    ["Saw the plans", count("paywall_view")],
    ["Clicked pay", count("trial_start_click")],
    ["Checkout opened", count("checkout_started")],
    ["Subscribed", count("subscription_started")],
  ];
  const top = Math.max(1, ...funnel.map(([, n]) => n));
  const stepRows = Object.entries(steps).sort((a, b) => b[1] - a[1]);
  const stepTop = Math.max(1, ...stepRows.map(([, n]) => n));

  return (
    <main className="dash">
      <div className="dash-head">
        <div>
          <p className="eyebrow-small">Admin</p>
          <h1 className="dash-title">What is going on</h1>
        </div>
        <div className="dash-actions">
          <button type="button" className="ghost-btn" onClick={() => load(key)} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            className="linkish dash-out"
            onClick={() => {
              setAdminKey("");
              setKey("");
              setData(null);
            }}
          >
            Lock
          </button>
        </div>
      </div>

      <ul className="kpis">
        <Kpi label="Paying students" value={totals.paying} note={`${totals.monthly} monthly · ${totals.term} term`} />
        <Kpi label="Monthly revenue" value={`$${totals.mrr}`} note="Rough, from active plans" />
        <Kpi label="Students signed up" value={totals.students} note="Finished onboarding to the plan page" />
        <Kpi label="Waitlist" value={totals.waitlist} note="Emails from the home page" />
      </ul>

      <div className="dash-grid">
        <section className="card dash-card dash-wide">
          <h2>Funnel, last 30 days</h2>
          <Bars rows={funnel} max={top} />
        </section>

        <section className="card dash-card">
          <h2>Where onboarding is reached</h2>
          {stepRows.length === 0 ? <p className="dash-sub">No data yet.</p> : <Bars rows={stepRows} max={stepTop} />}
        </section>

        <Breakdown title="Schools" rows={breakdowns.schools} />
        <Breakdown title="Programs" rows={breakdowns.programs} />
        <Breakdown title="Year of study" rows={breakdowns.levels} />
        <Breakdown title="How they found us" rows={breakdowns.heard_from} />
        <Breakdown title="Where they want to work" rows={breakdowns.places} />

        <section className="card dash-card dash-wide">
          <h2>Newest students</h2>
          {recent.length === 0 ? (
            <p className="dash-sub">No one yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>School</th>
                    <th>Program</th>
                    <th>Year</th>
                    <th>Joined</th>
                    <th>Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.email}>
                      <td>
                        {r.name ?? "–"}
                        <small>{r.email}</small>
                      </td>
                      <td>{r.school ?? "–"}</td>
                      <td>{r.program ?? "–"}</td>
                      <td>{r.level ?? "–"}</td>
                      <td>{new Date(r.created_at).toLocaleDateString()}</td>
                      <td>{r.paid ? <span className="pill green">Paying</span> : <span className="pill grey">Not yet</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      <p className="fine center">Updated {new Date(data.generated_at).toLocaleTimeString()}</p>
    </main>
  );
}

const Kpi = ({ label, value, note }: { label: string; value: number | string; note: string }) => (
  <li className="card kpi">
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{note}</small>
  </li>
);

function Bars({ rows, max }: { rows: [string, number][]; max: number }) {
  return (
    <ul className="metric-bars">
      {rows.map(([label, n]) => (
        <li key={label}>
          <span className="bar-label">{label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${Math.max(2, (n / max) * 100)}%` }} />
          </span>
          <span className="bar-n">{n}</span>
        </li>
      ))}
    </ul>
  );
}

function Breakdown({ title, rows }: { title: string; rows: { label: string; n: number }[] }) {
  return (
    <section className="card dash-card">
      <h2>{title}</h2>
      {rows.length === 0 ? <p className="dash-sub">No data yet.</p> : <Bars rows={rows.map((r) => [r.label, r.n])} max={rows[0]!.n} />}
    </section>
  );
}
