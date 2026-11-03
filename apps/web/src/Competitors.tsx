// Comparison pages: one short, fair page per major competitor. Each lives at #/compare/<slug>.
// The footer links to every page. Keep claims general and check them against each product's public site before launch.

type Rival = {
  slug: string;
  name: string;
  intro: string;
  theyDo: string[];
  weDo: string[];
  pickThem: string;
  pickUs: string;
};

export const RIVALS: Rival[] = [
  {
    slug: "simplify",
    name: "Simplify",
    intro: "Simplify is a job search helper with a browser extension that fills in application forms for you, plus a job board and resume tools.",
    theyDo: [
      "Autofills application forms on many job sites.",
      "Tracks the jobs you applied to in one place.",
      "Has a large job board with new grad and internship listings.",
    ],
    weDo: [
      "Built around co-op terms, not just a general job search.",
      "Writes a tailored resume for each job and rates it against the posting.",
      "Finds firms that do not post jobs, then drafts emails from your own Gmail. You approve each one.",
    ],
    pickThem: "You mostly apply through job boards and want faster forms.",
    pickUs: "You want to reach firms directly and need a resume built for each role.",
  },
  {
    slug: "handshake",
    name: "Handshake",
    intro: "Handshake is the job board many schools run for students. Employers post roles and recruit on campus.",
    theyDo: [
      "Connects you with employers who already recruit at your school.",
      "Lists internships, co-ops and career fairs in one place.",
      "Is free for students and often tied to your career office.",
    ],
    weDo: [
      "Goes past posted roles. We also find firms that are not hiring in public.",
      "Rates and rewrites your resume for each job, which a job board does not do.",
      "Helps you apply to many firms at once with emails you approve.",
    ],
    pickThem: "Your school has strong employer ties and you want to use them.",
    pickUs: "You want more shots than the posted roles give you. Use both.",
  },
  {
    slug: "offerloop",
    name: "Offerloop",
    intro: "Offerloop helps students reach out to people at big companies, mostly in banking, consulting and tech.",
    theyDo: [
      "Focuses on networking emails to professionals at large firms.",
      "Suits students aiming at a short list of well known employers.",
    ],
    weDo: [
      "Covers any student's co-op search, not only the biggest names.",
      "Adds resume rating, a tailored resume for every job, and a skill coach.",
      "Priced per co-op term, about $30 to $40, so you do not pay for months you do not need.",
    ],
    pickThem: "You are set on banking, consulting or big tech and want contacts there.",
    pickUs: "You want a full co-op search, across many kinds of firms, in one tool.",
  },
  {
    slug: "whali",
    name: "Whali",
    intro: "Whali is an outreach tool for students going after roles at large companies, much like Offerloop.",
    theyDo: [
      "Helps you find contacts and send outreach to big firms.",
      "Aims at competitive fields such as finance, consulting and tech.",
    ],
    weDo: [
      "Built around the co-op calendar and the way co-op terms work.",
      "Checks your resume against each job before you send anything.",
      "Sends from your own Gmail with daily caps, one unique email per firm, and your approval first.",
    ],
    pickThem: "You want outreach help aimed at top employers only.",
    pickUs: "You want matches that fit your program, school and term.",
  },
  {
    slug: "teal",
    name: "Teal",
    intro: "Teal is a career tool with a resume builder and a job tracker that works for any kind of job seeker.",
    theyDo: [
      "Builds resumes and scores them against a job description.",
      "Tracks applications and saved jobs.",
      "Serves people at every career stage, not only students.",
    ],
    weDo: [
      "Made for students chasing co-ops, with matching built in.",
      "Finds the firms for you, so you are not starting from a blank list.",
      "Drafts and sends the emails too, after you approve them.",
    ],
    pickThem: "You are well into your career and want a general resume and tracking tool.",
    pickUs: "You are a student who needs a co-op, and you want the whole search handled.",
  },
];

export default function Competitor({ slug }: { slug: string }) {
  const rival = RIVALS.find((r) => r.slug === slug);

  if (!rival) {
    return (
      <main className="authpage">
        <div className="card authcard wide policy article">
          <h1 className="authtitle">How Workterm compares</h1>
          {RIVALS.map((r) => (
            <p key={r.slug}>
              <a href={`#/compare/${r.slug}`}>Workterm vs {r.name}</a>
            </p>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="authpage">
      <article className="card authcard wide policy article">
        <p className="eyebrow-small">Comparison</p>
        <h1 className="authtitle">Workterm vs {rival.name}</h1>
        <p className="article-intro">{rival.intro}</p>

        <h2>What {rival.name} does well</h2>
        <ul>
          {rival.theyDo.map((pt) => (
            <li key={pt}>{pt}</li>
          ))}
        </ul>

        <h2>What Workterm does</h2>
        <ul>
          {rival.weDo.map((pt) => (
            <li key={pt}>{pt}</li>
          ))}
        </ul>

        <h2>Which one fits you</h2>
        <p>
          <strong>Pick {rival.name} if:</strong> {rival.pickThem}
        </p>
        <p>
          <strong>Pick Workterm if:</strong> {rival.pickUs}
        </p>

        <p className="fine">
          Based on each product's public pages. Features and prices change, so check {rival.name} for the latest. Workterm cannot promise a
          placement.
        </p>
        <p className="fine center">
          <a href="#/signup">Start for free</a> · <a href="#/">Back to home</a>
        </p>
      </article>
    </main>
  );
}
