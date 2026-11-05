// "Set up your profile" mock-ups on the home page. Small looping animations, not real data.
// Each one only runs while it is on screen, and shows its finished state when the visitor prefers less motion.
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// True while the element is on screen.
function useOnScreen(ref: RefObject<Element | null>): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return setVisible(true);
    // The bottom 35% of the screen does not count, so things start once the student has scrolled a bit further.
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.3,
      rootMargin: "0px 0px -35% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}

// A wide card for one step: words on one side, the animation on the other.
// It slides in the first time it scrolls into view, then stays.
export function StepRow({ step, title, text, children }: { step: number; title: string; text: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const visible = useOnScreen(ref);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (visible) setShown(true);
  }, [visible]);
  return (
    <article ref={ref} className={`show-card step-row${shown ? " in" : ""}`}>
      <div className="step-copy">
        <span className="step">Step {step}</span>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <div className="step-demo">{children}</div>
    </article>
  );
}

const wait = (ms: number, signal: { stop: boolean }) =>
  new Promise<void>((resolve, reject) => setTimeout(() => (signal.stop ? reject() : resolve()), ms));

// Step 1: name, school and program are typed in, one line after another.
const FIELDS = [
  { label: "Name", value: "Isaiah Walter" },
  { label: "School", value: "UC Berkeley" },
  { label: "Program", value: "Mechanical Engineering" },
];

export function TypingDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(ref);
  const [typed, setTyped] = useState<string[]>(() =>
    reducedMotion() ? FIELDS.map((f) => f.value) : FIELDS.map(() => ""),
  );
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (!visible || reducedMotion()) return;
    const signal = { stop: false };
    (async () => {
      while (true) {
        setTyped(FIELDS.map(() => ""));
        await wait(500, signal);
        for (let i = 0; i < FIELDS.length; i++) {
          setActive(i);
          const value = FIELDS[i].value;
          for (let n = 1; n <= value.length; n++) {
            setTyped((t) => t.map((s, j) => (j === i ? value.slice(0, n) : s)));
            await wait(55 + Math.random() * 60, signal);
          }
          await wait(450, signal);
        }
        setActive(-1);
        await wait(2600, signal);
      }
    })().catch(() => {});
    return () => {
      signal.stop = true;
    };
  }, [visible]);

  return (
    <div className="mock" ref={ref} aria-hidden="true">
      {FIELDS.map((f, i) => (
        <div className={`mock-field type-field${active === i ? " focus" : ""}`} key={f.label}>
          <span>{f.label}</span>
          <strong>
            {typed[i] || " "}
            {active === i && <i className="caret" />}
          </strong>
          {/* Green tick once the line is fully typed. */}
          {typed[i] === f.value && (
            <svg className="field-done" width="20" height="20" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="10" fill="#1f9d55" />
              <path d="M5.5 10.5l3 3 6-6.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

// Step 2: three questions. Each answer pops in with a "bang", one after another, then the loop restarts.

// A gear outline: teeth around a circle. Used in the machine-design drawing.
function gearPath(cx: number, cy: number, r: number, teeth: number, depth: number): string {
  const pts: string[] = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const corners = [
      [a, r - depth],
      [a + step * 0.15, r],
      [a + step * 0.45, r],
      [a + step * 0.6, r - depth],
    ];
    for (const [ang, rad] of corners) pts.push(`${(cx + rad * Math.cos(ang)).toFixed(1)},${(cy + rad * Math.sin(ang)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}
const BIG_GEAR = gearPath(0, 0, 22, 12, 5);
const SMALL_GEAR = gearPath(0, 0, 13, 8, 4);

// Summer: a warm sky with a slowly turning sun.
const SummerArt = () => (
  <svg viewBox="0 0 120 84">
    <rect width="120" height="84" fill="#ffe9b0" />
    <g transform="translate(60 44)">
      <g className="sun-rays">
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="0" y1="-21" x2="0" y2="-28" stroke="#f5a300" strokeWidth="3" strokeLinecap="round" transform={`rotate(${i * 30})`} />
        ))}
      </g>
    </g>
    <circle cx="60" cy="44" r="15" fill="#ffcc00" />
    <path d="M10 26 q6 -7 13 -2 q6 -4 10 2 z M86 18 q5 -6 11 -2 q5 -3 9 2 z" fill="#fff8ec" />
  </svg>
);

// Mechanical design: a blueprint with two meshing gears and a dimension line.
const MachineArt = () => (
  <svg viewBox="0 0 120 84">
    <rect width="120" height="84" fill="#12395f" />
    {Array.from({ length: 15 }, (_, i) => (
      <line key={`v${i}`} x1={i * 8 + 4} y1="0" x2={i * 8 + 4} y2="84" stroke="#ffffff" strokeOpacity="0.1" />
    ))}
    {Array.from({ length: 11 }, (_, i) => (
      <line key={`h${i}`} x1="0" y1={i * 8 + 4} x2="120" y2={i * 8 + 4} stroke="#ffffff" strokeOpacity="0.1" />
    ))}
    <g transform="translate(44 40)">
      <path className="gear spin" d={BIG_GEAR} fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
      <circle r="6" fill="none" stroke="#fff" strokeWidth="1.5" />
      <line x1="-30" y1="0" x2="30" y2="0" stroke="#7fc4ff" strokeDasharray="3 2" />
    </g>
    <g transform="translate(76 20)">
      <path className="gear spin-back" d={SMALL_GEAR} fill="none" stroke="#7fc4ff" strokeWidth="1.5" strokeLinejoin="round" />
      <circle r="3.5" fill="none" stroke="#7fc4ff" strokeWidth="1.5" />
    </g>
    <g stroke="#fff" strokeWidth="1">
      <line x1="22" y1="74" x2="66" y2="74" />
      <line x1="22" y1="70" x2="22" y2="78" />
      <line x1="66" y1="70" x2="66" y2="78" />
    </g>
    <text x="44" y="71" fill="#fff" fontSize="7" textAnchor="middle" fontFamily="monospace">Ø44</text>
    <rect x="84" y="50" width="28" height="24" fill="none" stroke="#fff" strokeWidth="1" />
    <circle cx="98" cy="62" r="6" fill="none" stroke="#7fc4ff" strokeWidth="1" />
  </svg>
);

// San Francisco: sunset over the bay, the Golden Gate Bridge and the skyline.
const BRIDGE_HANGERS = Array.from({ length: 8 }, (_, i) => {
  const x = 26 + i * 4;
  const t = (x - 22) / 36;
  return { x, y: 30 + 44 * t * (1 - t) };
});
const SfArt = () => (
  <svg viewBox="0 0 120 84">
    <defs>
      <linearGradient id="sf-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#6b3fa0" />
        <stop offset="0.55" stopColor="#f2667a" />
        <stop offset="1" stopColor="#ffc46b" />
      </linearGradient>
    </defs>
    <rect width="120" height="84" fill="url(#sf-sky)" />
    <circle cx="80" cy="54" r="11" fill="#ffe08a" />
    <path d="M0 60 Q14 50 30 58 T64 60 L64 64 L0 64 Z" fill="#4a2b5e" />
    <g fill="#2a1838">
      <rect x="84" y="46" width="6" height="18" />
      <polygon points="97,24 94,64 100,64" />
      <rect x="102" y="40" width="5" height="24" />
      <rect x="108" y="32" width="6" height="32" rx="3" />
      <rect x="115" y="48" width="5" height="16" />
    </g>
    <rect y="63" width="120" height="21" fill="#2b2f6b" />
    <g stroke="#ffe08a" strokeOpacity="0.6" strokeWidth="1">
      <line x1="72" y1="68" x2="88" y2="68" />
      <line x1="75" y1="73" x2="85" y2="73" />
    </g>
    <g stroke="#c0362c" fill="none">
      <path d="M-2 46 L22 30 Q40 52 58 30 L82 46" strokeWidth="1.2" />
      {BRIDGE_HANGERS.map((h) => (
        <line key={h.x} x1={h.x} y1={h.y} x2={h.x} y2="58" strokeWidth="0.6" />
      ))}
      <line x1="0" y1="58" x2="82" y2="58" strokeWidth="2" />
    </g>
    <g fill="#c0362c">
      <rect x="20.5" y="27" width="3" height="37" />
      <rect x="56.5" y="27" width="3" height="37" />
    </g>
  </svg>
);

const GOALS = [
  { q: "Term?", a: "Summer 2028", art: <SummerArt /> },
  { q: "Role?", a: "Mechanical design", art: <MachineArt /> },
  { q: "Location?", a: "San Francisco", art: <SfArt /> },
];

export function GoalsDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(ref);
  // How many answers have popped in so far (0 to 3).
  const [shown, setShown] = useState(() => (reducedMotion() ? GOALS.length : 0));

  useEffect(() => {
    if (!visible || reducedMotion()) return;
    const signal = { stop: false };
    (async () => {
      while (true) {
        setShown(0);
        await wait(700, signal);
        for (let i = 1; i <= GOALS.length; i++) {
          setShown(i);
          await wait(1100, signal);
        }
        await wait(3200, signal);
      }
    })().catch(() => {});
    return () => {
      signal.stop = true;
    };
  }, [visible]);

  return (
    <div className="mock goals-demo" ref={ref} aria-hidden="true">
      {GOALS.map((g, i) => (
        <div key={g.q} className={`goal-tile${i < shown ? " on" : ""}`}>
          <span className="goal-q">{g.q}</span>
          <div className="goal-art">{g.art}</div>
          <span className="goal-a">
            <svg className="burst" viewBox="-50 -50 100 100">
              {Array.from({ length: 10 }, (_, k) => (
                <line key={k} x1="0" y1="-30" x2="0" y2="-44" transform={`rotate(${k * 36})`} />
              ))}
            </svg>
            {g.a}
          </span>
        </div>
      ))}
    </div>
  );
}

// Step 3: Isaiah's resume gets scanned, the arrow fills, then matching companies' logos drop in. Pure CSS, one 8s loop.
// Matched companies, shown as logos in their own brand colours (from Simple Icons, the same set the home page uses).
const LOGO_CDN = "https://cdn.jsdelivr.net/npm/simple-icons@11.0.0/icons";
const MATCHES = [
  { name: "Tesla", slug: "tesla", color: "#cc0000" },
  { name: "Boeing", slug: "boeing", color: "#1d439c" },
  { name: "SpaceX", slug: "spacex", color: "#000000" },
  { name: "Airbus", slug: "airbus", color: "#00205b" },
];

// The resume, line by line. kind: h = section heading, b = bold line, t = normal line.
const RESUME: { kind: "h" | "b" | "t"; text: string; right?: string }[] = [
  { kind: "h", text: "EDUCATION" },
  { kind: "b", text: "University of California, Berkeley", right: "May 2028" },
  { kind: "t", text: "B.S. Mechanical Engineering · GPA 3.7" },
  { kind: "h", text: "EXPERIENCE" },
  { kind: "b", text: "Berkeley Formula SAE – Chassis Engineer", right: "2025–" },
  { kind: "t", text: "• Designed steel chassis in SolidWorks, 8% lighter" },
  { kind: "t", text: "• Ran FEA in ANSYS to check torsional stiffness" },
  { kind: "b", text: "Hybrid Robotics Lab – Undergrad Researcher", right: "2026–" },
  { kind: "t", text: "• Machined actuator mounts on CNC mill and lathe" },
  { kind: "t", text: "• Built a MATLAB model of leg dynamics" },
  { kind: "h", text: "PROJECTS" },
  { kind: "b", text: "CalSol Solar Car – Suspension" },
  { kind: "t", text: "• Double-wishbone design, 3D-printed prototypes" },
  { kind: "h", text: "SKILLS" },
  { kind: "t", text: "SolidWorks · Fusion 360 · ANSYS · MATLAB · GD&T" },
  { kind: "t", text: "CNC machining · 3D printing · Python" },
];

function ResumeSheet() {
  let y = 34;
  const rows = RESUME.map((r, i) => {
    y += r.kind === "h" ? (i === 0 ? 9 : 14) : 10.5;
    const at = y;
    if (r.kind === "h")
      return (
        <g key={i}>
          <text x="10" y={at} fontSize="7.5" fontWeight="800" fill="#990000" letterSpacing="0.6">
            {r.text}
          </text>
          <line x1="10" y1={at + 2.5} x2="160" y2={at + 2.5} stroke="#e3c3c3" strokeWidth="0.6" />
        </g>
      );
    return (
      <g key={i} fontSize="6.2" fill={r.kind === "b" ? "#3b0000" : "#6b4a4a"} fontWeight={r.kind === "b" ? 700 : 400}>
        <text x="10" y={at}>
          {r.text}
        </text>
        {r.right && (
          <text x="160" y={at} textAnchor="end" fontWeight="400">
            {r.right}
          </text>
        )}
      </g>
    );
  });
  return (
    <svg viewBox="0 0 170 220" className="resume-sheet">
      <rect width="170" height="220" fill="#fff" />
      <text x="85" y="19" textAnchor="middle" fontSize="13" fontWeight="800" fill="#3b0000" letterSpacing="1">
        ISAIAH WALTER
      </text>
      <text x="85" y="28" textAnchor="middle" fontSize="5.4" fill="#6b4a4a">
        Berkeley, CA · iwalter@berkeley.edu · linkedin.com/in/isaiahw
      </text>
      {rows}
    </svg>
  );
}

export function ResumeDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(ref);
  // Starts the first time it is seen, then keeps playing, so it never freezes halfway through a scan.
  const [play, setPlay] = useState(false);
  useEffect(() => {
    if (visible) setPlay(true);
  }, [visible]);
  return (
    <div className={`mock resume-demo${play ? " play" : ""}`} ref={ref} aria-hidden="true">
      <div className="resume-page">
        <ResumeSheet />
        <span className="scanner" />
      </div>
      {/* The whole arrow, head included, fills from left to right. The clip sits on a group so it never stretches with the fill. */}
      <svg className="fill-arrow" viewBox="0 0 40 24">
        <defs>
          <clipPath id="arrow-clip">
            <path d="M2 8h22V2l14 10-14 10v-6H2z" />
          </clipPath>
        </defs>
        <g clipPath="url(#arrow-clip)">
          <rect className="fill-arrow-bar" x="0" y="0" width="40" height="24" />
        </g>
        <path d="M2 8h22V2l14 10-14 10v-6H2z" fill="none" stroke="#990000" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
      <ul className="job-list job-logos">
        {MATCHES.map((m, i) => (
          <li key={m.slug} style={{ animationDelay: `${i * 0.15}s` }}>
            <span
              className="job-logo"
              role="img"
              aria-label={m.name}
              style={{
                background: m.color,
                WebkitMaskImage: `url(${LOGO_CDN}/${m.slug}.svg)`,
                maskImage: `url(${LOGO_CDN}/${m.slug}.svg)`,
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
