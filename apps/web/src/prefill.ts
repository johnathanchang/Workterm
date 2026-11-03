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
