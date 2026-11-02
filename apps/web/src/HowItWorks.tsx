// Two showcase sections on the home page. The cards hold small mock-ups of the product, not real data.

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
    <section className="showcase" aria-labelledby="profile-title">
      <h2 id="profile-title">Set up your profile.</h2>
      <p className="showcase-sub">It takes a few minutes. You can change anything later.</p>

      <div className="show-grid">
        <article className="show-card">
          <span className="step">Step 1</span>
          <h3>Create an account</h3>
          <p>Start with the basics: your school, your program and your year.</p>
          <div className="mock" aria-hidden="true">
            <div className="mock-field">
              <span>School</span>
              <strong>University of Waterloo</strong>
            </div>
            <div className="mock-field">
              <span>Program</span>
              <strong>Computer Engineering</strong>
            </div>
            <div className="mock-field">
              <span>Year</span>
              <div className="chips">
                <span className="chip">1st</span>
                <span className="chip on">2nd</span>
                <span className="chip">3rd</span>
                <span className="chip">4th</span>
              </div>
            </div>
          </div>
        </article>

        <article className="show-card">
          <span className="step">Step 2</span>
          <h3>Pick your goals</h3>
          <p>A few quick questions about your term, the roles you want and where you want to work.</p>
          <div className="mock" aria-hidden="true">
            <div className="mock-field">
              <span>Term</span>
              <div className="chips">
                <span className="chip on">Summer 2027</span>
                <span className="chip">Fall 2027</span>
              </div>
            </div>
            <div className="mock-field">
              <span>Roles</span>
              <div className="chips">
                <span className="chip on">Software</span>
                <span className="chip on">Data</span>
                <span className="chip">Product</span>
              </div>
            </div>
            <div className="mock-field">
              <span>Location</span>
              <div className="chips">
                <span className="chip on">Toronto</span>
                <span className="chip">Waterloo</span>
                <span className="chip on">Remote</span>
              </div>
            </div>
          </div>
        </article>

        <article className="show-card">
          <span className="step">Step 3</span>
          <h3>Add your resume</h3>
          <p>Upload a PDF. Then we find your firms and show your first matches.</p>
          <div className="mock" aria-hidden="true">
            <div className="mock-row">
              <span className="file-icon">PDF</span>
              <div>
                <strong>resume.pdf</strong>
                <span className="meter">
                  <span style={{ width: "100%" }} />
                </span>
              </div>
              <span className="pill green">
                <Check /> Uploaded
              </span>
            </div>
            <div className="mock-row">
              <span className="spinner" />
              <div>
                <strong>Finding your firms…</strong>
                <span className="meter">
                  <span className="loading" />
                </span>
              </div>
            </div>
          </div>
        </article>
      </div>

      <StartButton />
    </section>
  );
}
