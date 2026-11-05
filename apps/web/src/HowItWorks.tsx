// Showcase sections on the home page. The cards hold small mock-ups of the product, not real data.
import { GoalsDemo, ResumeDemo, StepRow, TypingDemo } from "./ProfileDemo";

// Resume score rising as Workterm tailors it. Heights are percentages of the chart.
const SCORE_BARS = [22, 26, 29, 33, 37, 42, 46, 52, 57, 63, 68, 74, 80, 86, 93];

const Check = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Same call to action as the hero: scrolls to the early access form.
const StartButton = () => (
  <div className="showcase-cta">
    <button
      type="button"
      className="cta"
      onClick={() => document.getElementById("early-access")?.scrollIntoView({ behavior: "smooth" })}
    >
      Start for free
    </button>
  </div>
);

export function HowItWorks() {
  return (
    <section className="showcase band" id="how-it-works" aria-labelledby="how-title">
      <h2 id="how-title">How it works.</h2>
      <p className="showcase-sub">One resume in. Tailored applications out. You approve every step.</p>

      <div className="show-grid">
        <article className="show-card">
          <h3>Match</h3>
          <p>Tell us what you want. We find roles that fit you and say why.</p>
          <div className="mock mock-fade" aria-hidden="true">
            <div className="mock-row">
              <div>
                <strong>A fintech startup</strong>
                <span>Software developer co-op</span>
              </div>
              <span className="pill green">94% fit</span>
            </div>
            <div className="mock-row">
              <div>
                <strong>A big bank</strong>
                <span>Data analyst co-op</span>
              </div>
              <span className="pill green">88% fit</span>
            </div>
            <div className="mock-row">
              <div>
                <strong>An AI lab</strong>
                <span>Research co-op</span>
              </div>
              <span className="pill green">81% fit</span>
            </div>
          </div>
        </article>

        <article className="show-card">
          <h3>Tailor</h3>
          <p>Your resume, rewritten for each job. You read and edit every line.</p>
          <div className="mock" aria-hidden="true">
            <div className="score-head">
              <span>Resume score</span>
              <strong>
                62 <span>→</span> 91
              </strong>
            </div>
            <div className="bars">
              {SCORE_BARS.map((h, i) => (
                <span key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </article>

        <article className="show-card">
          <h3>Apply</h3>
          <p>Approve each email, then send it from your own Gmail. Daily caps keep it personal.</p>
          <div className="mock" aria-hidden="true">
            <div className="mock-row">
              <div>
                <strong>A fintech startup</strong>
                <span className="meter">
                  <span style={{ width: "100%" }} />
                </span>
              </div>
              <span className="pill green">
                <Check /> Sent
              </span>
            </div>
            <div className="mock-row">
              <div>
                <strong>A big bank</strong>
                <span className="meter">
                  <span style={{ width: "70%" }} />
                </span>
              </div>
              <span className="pill gold">Approved</span>
            </div>
            <div className="mock-row">
              <div>
                <strong>An AI lab</strong>
                <span className="meter">
                  <span style={{ width: "35%" }} />
                </span>
              </div>
              <span className="pill grey">Draft</span>
            </div>
          </div>
        </article>
      </div>

      <StartButton />
    </section>
  );
}

export function CreateProfile() {
  return (
    <section className="showcase" id="profile" aria-labelledby="profile-title">
      <h2 id="profile-title">Set up your profile.</h2>
      <p className="showcase-sub">It takes a few minutes. You can change anything later.</p>

      {/* Three wide rows, one per step. Each slides in and starts its animation as you scroll to it. */}
      <div className="step-rows">
        <StepRow step={1} title="Create an account" text="Start with the basics: your name, your school and your program.">
          <TypingDemo />
        </StepRow>
        <StepRow step={2} title="Pick your goals" text="A few quick questions about your term, the roles you want and where you want to work.">
          <GoalsDemo />
        </StepRow>
        <StepRow step={3} title="Add your resume" text="Upload a PDF. We read it and show the co-ops that fit you best.">
          <ResumeDemo />
        </StepRow>
      </div>

      <StartButton />
    </section>
  );
}

// Compared by kind of tool, plus Simplify by name. Simplify's values come from its public pages.
const RIVALS = ["Workterm", "School job board", "ChatGPT", "Simplify"];

type Cell = boolean | string | { main: string; sub?: string };
const ROWS: { label: string; cells: Cell[]; price?: boolean }[] = [
  { label: "Built around co-op terms", cells: [true, true, false, false] },
  { label: "Rates your resume against each job", cells: [true, false, "If you paste it in", "Paid plan"] },
  { label: "A tailored resume for every job", cells: [true, false, "One at a time, by hand", "Paid plan"] },
  { label: "Finds firms that don't post jobs", cells: [true, false, false, false] },
  { label: "Sends from your Gmail, after you approve", cells: [true, false, false, false] },
  {
    label: "Price",
    price: true,
    cells: [{ main: "$20 a month" }, "Free", "$20 a month", "$39.99 a month"],
  },
];

const Mark = ({ cell }: { cell: Cell }) =>
  cell === true ? (
    <span className="yes" role="img" aria-label="Yes">
      <Check />
    </span>
  ) : cell === false ? (
    <span className="no" role="img" aria-label="No">
      –
    </span>
  ) : typeof cell === "string" ? (
    <span className="part">{cell}</span>
  ) : (
    <span className="price">
      <strong>{cell.main}</strong>
      {cell.sub && <small>{cell.sub}</small>}
    </span>
  );

export function Compare() {
  return (
    <section className="showcase band" id="compare" aria-labelledby="compare-title">
      <h2 id="compare-title">How Workterm compares.</h2>
      <p className="showcase-sub">Other tools do one piece. Workterm covers the whole co-op search.</p>

      <div className="compare-wrap">
        <table className="compare">
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">Feature</span>
              </th>
              {RIVALS.map((r, i) => (
                <th key={r} scope="col" className={i === 0 ? "us" : undefined}>
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label} className={row.price ? "price-row" : undefined}>
                <th scope="row">{row.label}</th>
                {row.cells.map((c, i) => (
                  <td key={i} className={i === 0 ? "us" : undefined}>
                    <Mark cell={c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <StartButton />
    </section>
  );
}
