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

// Called once sign-up has used the answers, so a later visit starts fresh.
export function clearPrefill(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

// Sign-up answers, saved just before the student leaves for Stripe. If they cancel the payment, sign-up reads
// them back and opens the plan picker, so they do not answer every card again. Same rules as above: this tab only,
// never in the URL. The resume file is not saved.
const DRAFT_KEY = "workterm.draft";

export type Draft = {
  name: string;
  school: string;
  program: string;
  level: string;
  experience: string;
  applied: string;
  heard: string;
  struggles: string[];
  goals: string[];
  jobs: string[];
  term: string;
  where: string;
  plan: "monthly" | "term";
  payEmail: string;
};

export function saveDraft(d: Draft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    // Storage blocked. A cancelled payment then starts sign-up fresh.
  }
}

export function readDraft(): Partial<Draft> | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    const d = raw ? (JSON.parse(raw) as Partial<Draft>) : null;
    return typeof d === "object" && d ? d : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear.
  }
}
