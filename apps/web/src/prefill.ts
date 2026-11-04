// Answers from the home page form, carried into sign-up so students don't type them twice.
// Kept in sessionStorage (this tab only, gone when it closes), never in the URL, so it stays out of browser history.
const KEY = "workterm.prefill";

export type Prefill = { name: string; school: string; program: string };

export function savePrefill(p: Prefill): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Storage can be blocked, for example in a private window. Sign-up still works, just empty.
  }
}

export function readPrefill(): Partial<Prefill> {
  try {
    const raw = sessionStorage.getItem(KEY);
    const p = raw ? (JSON.parse(raw) as Partial<Prefill>) : {};
    return typeof p === "object" && p ? p : {};
  } catch {
    return {};
  }
}

// What the pricing page needs to speak to this student. Same rules: this tab only, never in the URL.
const PRICING_KEY = "workterm.pricing";

export type PricingContext = {
  name: string;
  term: string;
  jobs: string[];
  firms: number;
  top: { firm: string; role: string; fit: number }[];
};

export function savePricingContext(c: PricingContext): void {
  try {
    sessionStorage.setItem(PRICING_KEY, JSON.stringify(c));
  } catch {
    // Pricing still works without it, just not personalized.
  }
}

export function readPricingContext(): PricingContext | null {
  try {
    const raw = sessionStorage.getItem(PRICING_KEY);
    const c = raw ? (JSON.parse(raw) as Partial<PricingContext>) : null;
    if (!c || typeof c !== "object" || !Array.isArray(c.top) || !Array.isArray(c.jobs)) return null;
    return { name: String(c.name ?? ""), term: String(c.term ?? ""), jobs: c.jobs, firms: Number(c.firms) || c.top.length, top: c.top };
  } catch {
    return null;
  }
}

// Called once sign-up has used the answers, so a later visit starts fresh.
export function clearPrefill(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
