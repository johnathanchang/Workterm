// Internship guides: one short post per type of internship, with a plan to go after it.
// Each post lives at #/blog/<slug>. The footer links to every post.

type Post = {
  slug: string;
  title: string;
  intro: string;
  sections: { heading: string; points: string[] }[];
};

export const POSTS: Post[] = [
  {
    slug: "software-engineering",
    title: "Software engineering co-ops",
    intro:
      "The most common co-op, and the most crowded. Hundreds of students apply to the same posting, so a generic resume gets lost fast.",
    sections: [
      {
        heading: "What they look for",
        points: [
          "Projects you built and can explain: what it does, what you chose, what broke.",
          "One or two languages you know well, not a long list you touched once.",
          "Proof you can work on a team: Git, code review, a design team or a hackathon.",
        ],
      },
      {
        heading: "How to attack it",
        points: [
          "Put your best project first, with one line on the result, like users, speed or a prize.",
          "Match each resume to the posting's stack. If they use React, your React project goes on top.",
          "Apply early in the term. Many teams fill roles in the first few weeks.",
          "Practise one coding problem a day for the interviews, out loud.",
        ],
      },
      {
        heading: "Common mistakes",
        points: ["A skills section with 20 tools and no projects behind them.", "Only applying to big names and ignoring smaller firms."],
      },
    ],
  },
  {
    slug: "data-and-analytics",
    title: "Data and analytics co-ops",
    intro: "Banks, insurers, retailers and startups all hire data students. The title varies: analyst, data science, business intelligence.",
    sections: [
      {
        heading: "What they look for",
        points: [
          "SQL first. Most data co-ops use it every day.",
          "Python or R for cleaning and charts.",
          "A project that starts with a real question and ends with an answer someone could use.",
        ],
      },
      {
        heading: "How to attack it",
        points: [
          "Build one end-to-end project on a public data set, and write up what you found in plain words.",
          "Lead each bullet with the result: what changed because of your analysis.",
          "Read the posting closely. A business intelligence role wants dashboards; a data science role wants models.",
        ],
      },
      {
        heading: "Common mistakes",
        points: ["Listing course names instead of what you did.", "Charts with no takeaway."],
      },
    ],
  },
  {
    slug: "startups",
    title: "Startup internships",
    intro:
      "Startups often hire without posting on job boards. You get more responsibility sooner, and the hiring process is short and personal.",
    sections: [
      {
        heading: "What they look for",
        points: [
          "Someone who can figure things out with little direction.",
          "Range: you can code, write, talk to users or help with sales.",
          "Real interest in what the company does.",
        ],
      },
      {
        heading: "How to attack it",
        points: [
          "Find them where they are: local accelerators, demo days and founder posts.",
          "Email a founder or team lead directly with a short, specific note on why their product matters to you.",
          "Attach a resume tailored to what they are building right now.",
          "Follow up once after a week. Then move on.",
        ],
      },
      {
        heading: "Common mistakes",
        points: ["Sending the same email to fifty startups.", "Asking for a job before showing you know what they make."],
      },
    ],
  },
  {
    slug: "big-tech",
    title: "Big tech internships",
    intro: "Large companies run structured programs with set deadlines, online tests and several interview rounds. Timing matters most.",
    sections: [
      {
        heading: "What they look for",
        points: [
          "Strong basics: data structures, problem solving and clear communication.",
          "Past experience, even a small co-op or a research role.",
          "A clean, one-page resume that is easy to scan in seconds.",
        ],
      },
      {
        heading: "How to attack it",
        points: [
          "Track application windows. Many open months before the term starts.",
          "Get a referral when you can. Reach out to alumni from your school.",
          "Prepare for online assessments with timed practice.",
          "Keep applying to smaller firms in parallel so one rejection does not stall your term.",
        ],
      },
      {
        heading: "Common mistakes",
        points: ["Waiting until the term is close to start applying.", "Putting every application into one or two companies."],
      },
    ],
  },
];

export default function Blog({ slug }: { slug: string }) {
  const post = POSTS.find((p) => p.slug === slug);

  if (!post) {
    return (
      <main className="authpage">
        <div className="card authcard wide policy article">
          <h1 className="authtitle">Internship guides</h1>
          {POSTS.map((p) => (
            <p key={p.slug}>
              <a href={`#/blog/${p.slug}`}>{p.title}</a>
            </p>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="authpage">
      <article className="card authcard wide policy article">
        <p className="eyebrow-small">Internship guide</p>
        <h1 className="authtitle">{post.title}</h1>
        <p className="article-intro">{post.intro}</p>
        {post.sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            <ul>
              {s.points.map((pt) => (
                <li key={pt}>{pt}</li>
              ))}
            </ul>
          </section>
        ))}
        <h2>Where Workterm helps</h2>
        <p>
          Workterm tailors your resume to each posting, finds firms that fit you, including ones that do not post jobs, and drafts emails you
          approve before they send. It cannot promise a placement, but it takes the busywork out of applying.
        </p>
        <p className="fine center">
          <a href="#/">Back to home</a>
        </p>
      </article>
    </main>
  );
}
