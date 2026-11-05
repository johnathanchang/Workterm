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
      Get started
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

// "Your co-op search, two ways": the time to apply to 50 co-ops manually versus with Workterm.
// Our own estimates per application, shown as estimates. Competitors get their own pages in the footer.
const TASKS = [
  { task: "Rewrite your resume for the posting", byHand: 20, us: "Tailored for you. You review it." },
  { task: "Find the right person to email", byHand: 10, us: "Found for you" },
  { task: "Write a personal email", byHand: 10, us: "Drafted for you. You approve it." },
  { task: "Track replies and follow up", byHand: 5, us: "Reply alerts and reminders" },
];
const APPLICATIONS = 50;
const PER_APP_BY_HAND = TASKS.reduce((sum, t) => sum + t.byHand, 0); // 45 minutes
const PER_APP_US = 2; // minutes to read and approve
const HOURS_BY_HAND = Math.round((PER_APP_BY_HAND * APPLICATIONS) / 60); // about 38
const HOURS_US = Math.round((PER_APP_US * APPLICATIONS) / 60); // about 2

export function Compare() {
  return (
    <section className="showcase band" id="compare" aria-labelledby="compare-title">
      <h2 id="compare-title">Your co-op search, two ways.</h2>
      <p className="showcase-sub">Applying to {APPLICATIONS} co-ops. Here is where the time goes.</p>

      <div className="compare-wrap versus">
        <div className="versus-row versus-head">
          <span>For each application</span>
          <span>Manual</span>
          <span className="us">With Workterm</span>
        </div>
        {TASKS.map((t) => (
          <div className="versus-row" key={t.task}>
            <span className="versus-task">{t.task}</span>
            <span className="versus-time">{t.byHand} min</span>
            <span className="us">
              <Check /> {t.us}
            </span>
          </div>
        ))}
        <div className="versus-row versus-total">
          <span className="versus-task">Total per application</span>
          <span className="versus-time">{PER_APP_BY_HAND} min</span>
          <span className="us">
            About {PER_APP_US} min<span className="phone-only">&nbsp;with Workterm</span>
          </span>
        </div>

        <div className="time-bars" aria-label={`${APPLICATIONS} applications: about ${HOURS_BY_HAND} hours manual, about ${HOURS_US} hours with Workterm`}>
          <p className="time-bars-title">{APPLICATIONS} applications</p>
          <div className="time-bar">
            <span className="time-bar-label">Manual</span>
            <span className="time-bar-track">
              <span className="time-bar-fill slow" style={{ width: "100%" }} />
            </span>
            <strong>about {HOURS_BY_HAND} hours</strong>
          </div>
          <div className="time-bar">
            <span className="time-bar-label">With Workterm</span>
            <span className="time-bar-track">
              <span className="time-bar-fill fast" style={{ width: `${(HOURS_US / HOURS_BY_HAND) * 100}%` }} />
            </span>
            <strong>about {HOURS_US} hours</strong>
          </div>
        </div>
      </div>
      <p className="versus-note">Our estimates. Your times will vary. Workterm never sends anything until you approve it.</p>

      <StartButton />
    </section>
  );
}
