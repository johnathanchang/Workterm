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

// Step 2: a sentence with three blanks. Each blank spins like a slot-machine reel and lands on
// Isaiah's answer, one after another. Then the number of matching co-ops counts up.
// Three options per reel. Each loop, every reel lands on a random one.
const SLOTS = [
  { label: "role", items: ["Robotics", "Hardware", "Design"] },
  { label: "term", items: ["Fall 2027", "Winter 2028", "Summer 2028"] },
  { label: "location", items: ["Seattle", "Los Angeles", "San Francisco"] },
];
const MATCH_COUNT = 248; // shown when motion is off; otherwise a random count each loop

// A new random answer for each reel, never the exact same set as last time.
function pickTargets(previous: number[]): number[] {
  while (true) {
    const next = SLOTS.map((slot) => Math.floor(Math.random() * slot.items.length));
    if (next.some((v, i) => v !== previous[i])) return next;
  }
}

const GreenTick = () => (
  <svg width="20" height="20" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="10" fill="#1f9d55" />
    <path d="M5.5 10.5l3 3 6-6.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// One reel: the options repeated a few times, ending on the answer. Spinning slides the strip up to the last one.
// Timing for one reel: it spins, stops, then flashes bright yellow. Only then does the next reel start.
const SPIN_MS = 1300;
const FLASH_MS = 600;
const LOOP_PAUSE_MS = 1500; // after both check lines show, wait this long before the next loop

function Slot({ items, target, spun, landed }: { items: string[]; target: number; spun: boolean; landed: boolean }) {
  // Two full turns, then on to the chosen answer, so every spin looks like a real spin.
  const strip = [...items, ...items, ...items.slice(0, target + 1)];
  const last = strip.length - 1;
  return (
    <span className={`slot${landed ? " landed" : ""}`}>
      <span
        className="slot-strip"
        style={{
          transform: spun ? `translateY(-${last * 1.3}em)` : "none",
          transition: spun ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.2, 1)` : "none",
        }}
      >
        {strip.map((item, i) => (
          <span key={i}>{item}</span>
        ))}
      </span>
    </span>
  );
}

export function GoalsDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(ref);
  const done = reducedMotion();
  const [spun, setSpun] = useState(() => SLOTS.map(() => done));
  const [landed, setLanded] = useState(() => SLOTS.map(() => false));
  const [targets, setTargets] = useState(() => SLOTS.map((slot) => slot.items.length - 1));
  const [count, setCount] = useState(done ? MATCH_COUNT : 0);
  const [tailored, setTailored] = useState(done);

  useEffect(() => {
    if (!visible || reducedMotion()) return;
    const signal = { stop: false };
    let last = SLOTS.map(() => -1);
    (async () => {
      while (true) {
        last = pickTargets(last);
        const matches = 120 + Math.floor(Math.random() * 200);
        setTargets(last);
        setSpun(SLOTS.map(() => false));
        setLanded(SLOTS.map(() => false));
        setCount(0);
        setTailored(false);
        await wait(400, signal);
        for (let i = 0; i < SLOTS.length; i++) {
          setSpun((s) => s.map((v, j) => (j === i ? true : v)));
          await wait(SPIN_MS, signal); // reel stops
          setLanded((s) => s.map((v, j) => (j === i ? true : v)));
          await wait(FLASH_MS, signal); // flash finishes before the next reel moves
        }
        for (let k = 1; k <= 20; k++) {
          setCount(Math.round((matches * k) / 20));
          await wait(40, signal);
        }
        await wait(500, signal);
        setTailored(true);
        await wait(LOOP_PAUSE_MS, signal);
      }
    })().catch(() => {});
    return () => {
      signal.stop = true;
    };
  }, [visible]);

  return (
    <div className="mock goals-demo" ref={ref} aria-hidden="true">
      <p className="goal-sentence">
        I want a <Slot items={SLOTS[0].items} target={targets[0]} spun={spun[0]} landed={landed[0]} /> co-op for{" "}
        <Slot items={SLOTS[1].items} target={targets[1]} spun={spun[1]} landed={landed[1]} /> in{" "}
        <Slot items={SLOTS[2].items} target={targets[2]} spun={spun[2]} landed={landed[2]} />
      </p>
      <p className={`goal-count${count > 0 ? " on" : ""}`}>
        <GreenTick />
        <span>
          <strong>{count}</strong> matching co-ops found
        </span>
      </p>
      <p className={`goal-count${tailored ? " on" : ""}`}>
        <GreenTick />
        <span>
          A <b className="goal-bold">tailored resume</b> ready for each one
        </span>
      </p>
    </div>
  );
}

// Step 3: Isaiah's resume gets scanned, the arrow fills, then matching companies' logos drop in. Pure CSS, one 4s loop.
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
          <li key={m.slug} style={{ animationDelay: `${i * 0.075}s` }}>
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
