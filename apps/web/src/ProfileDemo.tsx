// "Set up your profile" mock-ups on the home page. Small looping animations, not real data.
// Each one only runs while it is on screen, and shows its finished state when the visitor prefers less motion.
import { useEffect, useRef, useState, type RefObject } from "react";

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// True while the element is on screen.
function useOnScreen(ref: RefObject<Element | null>): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return setVisible(true);
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}

const wait = (ms: number, signal: { stop: boolean }) =>
  new Promise<void>((resolve, reject) => setTimeout(() => (signal.stop ? reject() : resolve()), ms));

// Step 1: name, school and program are typed in, one line after another.
const FIELDS = [
  { label: "Name", value: "Isaiah Walter" },
  { label: "School", value: "UC Berkeley" },
  { label: "Program", value: "Computer Science" },
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

// Step 2: a cursor moves around and clicks goal chips, like a student picking.
const GROUPS = [
  { label: "Term", chips: ["Summer 2027", "Fall 2027"] },
  { label: "Roles", chips: ["Software", "Data", "Product"] },
  { label: "Location", chips: ["New York", "San Francisco"] },
];
const CLICKS = ["Summer 2027", "Software", "Data", "New York", "San Francisco"];

const Tick = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Plus = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export function GoalsDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const visible = useOnScreen(ref);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(reducedMotion() ? CLICKS : []));
  const [cursor, setCursor] = useState({ x: 0, y: 0, shown: false, pressing: false });

  useEffect(() => {
    if (!visible || reducedMotion()) return;
    const signal = { stop: false };
    // Center of a chip, measured from the top-left of the mock.
    const spot = (name: string) => {
      const box = ref.current!.getBoundingClientRect();
      const chip = chipRefs.current[name]!.getBoundingClientRect();
      return { x: chip.left - box.left + chip.width * 0.55, y: chip.top - box.top + chip.height * 0.6 };
    };
    (async () => {
      while (true) {
        setPicked(new Set());
        const box = ref.current!.getBoundingClientRect();
        setCursor({ x: box.width * 0.85, y: box.height + 10, shown: true, pressing: false });
        await wait(700, signal);
        for (const name of CLICKS) {
          setCursor((c) => ({ ...c, ...spot(name) }));
          await wait(750, signal);
          setCursor((c) => ({ ...c, pressing: true }));
          setPicked((p) => new Set(p).add(name));
          await wait(180, signal);
          setCursor((c) => ({ ...c, pressing: false }));
          await wait(250, signal);
        }
        setCursor((c) => ({ ...c, x: box.width * 0.85, y: box.height + 10 }));
        await wait(2400, signal);
      }
    })().catch(() => {});
    return () => {
      signal.stop = true;
    };
  }, [visible]);

  return (
    <div className="mock goals-demo" ref={ref} aria-hidden="true">
      {GROUPS.map((g) => (
        <div className="goal-group" key={g.label}>
          <span>{g.label}</span>
          <div className="chips">
            {g.chips.map((name) => {
              const on = picked.has(name);
              return (
                <span
                  key={name}
                  ref={(el) => {
                    chipRefs.current[name] = el;
                  }}
                  className={`goal-chip${on ? " on" : ""}`}
                >
                  {on ? <Tick /> : <Plus />}
                  {name}
                </span>
              );
            })}
          </div>
        </div>
      ))}
      {cursor.shown && (
        <svg
          className={`demo-cursor${cursor.pressing ? " press" : ""}`}
          style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
          width="22"
          height="22"
          viewBox="0 0 24 24"
        >
          <path d="M4 2l15 9.5-6.6 1.3L9.6 19z" fill="#1d1d1f" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

// Step 3: a portrait resume, an arrow that fills up, then co-op matches appear. Pure CSS, one 7s loop.
const JOBS = [
  { role: "Software Dev", firm: "Shopify · Toronto", score: 94 },
  { role: "Data Engineer", firm: "RBC · Toronto", score: 89 },
  { role: "Backend Dev", firm: "Wealthsimple · Remote", score: 86 },
  { role: "ML Research", firm: "Cohere · Toronto", score: 81 },
];

export function ResumeDemo() {
  return (
    <div className="mock resume-demo" aria-hidden="true">
      <div className="resume-page">
        <b className="r-name" />
        <b className="r-sub" />
        {[90, 70, 84, 60, 88, 74, 66, 80].map((w, i) => (
          <i key={i} style={{ width: `${w}%` }} className={i === 3 ? "r-head" : undefined} />
        ))}
      </div>
      <svg className="fill-arrow" viewBox="0 0 40 24">
        <defs>
          <clipPath id="arrow-clip">
            <path d="M2 8h22V2l14 10-14 10v-6H2z" />
          </clipPath>
        </defs>
        <path d="M2 8h22V2l14 10-14 10v-6H2z" fill="none" stroke="#990000" strokeWidth="1.6" strokeLinejoin="round" />
        <rect className="fill-arrow-bar" clipPath="url(#arrow-clip)" x="0" y="0" width="40" height="24" />
      </svg>
      <ul className="job-list">
        {JOBS.map((j, i) => (
          <li key={j.role} style={{ animationDelay: `${i * 0.15}s` }}>
            <div>
              <strong>{j.role}</strong>
              <span>{j.firm}</span>
            </div>
            <em>{j.score}%</em>
          </li>
        ))}
      </ul>
    </div>
  );
}
