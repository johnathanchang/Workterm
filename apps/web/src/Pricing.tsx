import { useEffect, useRef, useState } from "react";
import { startCheckout, track } from "./api";
import { getRef, readPricingContext } from "./prefill";

// Hard paywall (decision 0005): two options, no free plan, no trial.
// The term plan is one-time and never renews. The monthly plan renews every month until the student cancels.
type PlanId = "term" | "month";

const PLANS: { id: PlanId; name: string; price: number; per: string; line: string; button: string; badge?: string; fine: string }[] = [
  {
    id: "month",
    name: "Monthly",
    price: 25,
    per: "a month",
    line: "Pay month to month. Stop the day you land a co-op.",
    button: "Start monthly for $25",
    fine: "Renews every month until you cancel.",
  },
  {
    id: "term",
    name: "Per term",
    price: 45,
    per: "for 4 months",
    line: "One co-op term is 4 months. Pay once and use Workterm for the whole term.",
    button: "Get 4 months for $45",
    badge: "Best value",
    fine: "One payment for 4 months. It does not renew.",
  },
];

const PERKS = [
  "Every matched firm, including ones that do not post jobs",
  "A resume rated and tailored for each job",
  "Emails sent from your own Gmail, only after you approve",
  "Follow-ups and reply tracking",
];

const Check = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// "Software Engineering and Data Analytics"
const listOf = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

export default function Pricing() {
  // Set on the last onboarding screen. Missing if someone opens #/pricing directly, and then the page is not personalized.
  const [ctx] = useState(readPricingContext);
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [problem, setProblem] = useState("");

  // Sends the student to Stripe's page to pay. Their card details never touch our site.
  async function buy(plan: PlanId) {
    track("checkout_click", plan);
    setProblem("");
    setBusy(plan);
    const result = await startCheckout(plan, getRef());
    if (typeof result === "object") {
      window.location.assign(result.url);
      return;
    }
    setBusy(null);
    setProblem(
      result === "unavailable"
        ? "Payments are not open yet. We will let you know when they are."
        : "Something went wrong opening checkout. Please try again.",
    );
  }

  // One paywall_view per visit. StrictMode runs effects twice in dev, so the ref keeps it to one.
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track("paywall_view");
  }, []);

  const first = ctx?.name.trim().split(" ")[0];
  const term = ctx?.term || "next";

  return (
    <main className="pricing">
      <header className="pricing-head">
        <p className="eyebrow-small">Pricing</p>
        <h1 className="authtitle">{first ? `${first}, your` : "Your"} {term} co-op search is ready.</h1>
        <p className="lead small">
          {ctx
            ? `We found ${ctx.firms} firms for ${listOf(ctx.jobs.slice(0, 3))}. Pick a plan to unlock them.`
            : "Pick a plan to unlock your matches, tailored resumes and emails from your Gmail."}
        </p>
      </header>

      <div className="price-grid">
        {PLANS.map((p) => (
          <section key={p.id} className={p.badge ? "price-card best" : "price-card"} aria-labelledby={`plan-${p.id}`}>
            <div className="plan-head">
              <h2 id={`plan-${p.id}`}>{p.name}</h2>
              {p.badge && <span className="pill gold">{p.badge}</span>}
            </div>
            <p className="plan-price big">
              ${p.price} <small>{p.per}</small>
            </p>
            <p className="plan-sub">{p.line}</p>
            <ul className="perks">
              {PERKS.map((x) => (
                <li key={x}>
                  <Check /> {x}
                </li>
              ))}
            </ul>
            <button type="button" disabled={busy !== null} onClick={() => buy(p.id)}>
              {busy === p.id ? "Opening checkout…" : p.button}
            </button>
            <p className="fine center">{p.fine}</p>
          </section>
        ))}
      </div>

      {problem && (
        <p className="notice" role="alert">
          {problem}
        </p>
      )}

      <p className="fine center">
        <strong>Money-back guarantee.</strong> The exact terms are being finalized. We cannot promise a placement.
      </p>
      <p className="fine center">
        <a href="#/refund">Refund policy</a>
      </p>
    </main>
  );
}
