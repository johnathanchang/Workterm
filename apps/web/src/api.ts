// Talks to the Workterm API. In dev the Vite proxy forwards these calls to port 8787.
// For a deployed site, set VITE_API_URL to the API address.
const BASE: string = import.meta.env.VITE_API_URL ?? "";

export type JoinResult = "joined" | "already" | "invalid_email" | "error";

export async function joinWaitlist(input: {
  email: string;
  school?: string;
  program?: string;
  source?: string;
}): Promise<JoinResult> {
  try {
    const res = await fetch(`${BASE}/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.status === 400) return "invalid_email";
    if (!res.ok) return "error";
    const data = (await res.json()) as { already_joined?: boolean };
    return data.already_joined ? "already" : "joined";
  } catch {
    return "error";
  }
}

export type PlanId = "month" | "term";

// Asks the API for a Stripe Checkout page. "unavailable" means payments are not switched on yet.
export type CheckoutResult = { url: string } | "unavailable" | "error";

export async function startCheckout(plan: PlanId, ref: string): Promise<CheckoutResult> {
  try {
    const res = await fetch(`${BASE}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, ref }),
    });
    if (res.status === 503) return "unavailable";
    const data = (await res.json().catch(() => null)) as { url?: string } | null;
    return res.ok && data?.url ? { url: data.url } : "error";
  } catch {
    return "error";
  }
}

export type Entitlement = { active: boolean; plan: PlanId | null; current_period_end: number | null };

export async function getEntitlement(ref: string): Promise<Entitlement | null> {
  try {
    const res = await fetch(`${BASE}/me/entitlements?ref=${encodeURIComponent(ref)}`);
    return res.ok ? ((await res.json()) as Entitlement) : null;
  } catch {
    return null;
  }
}

// Fire and forget. A failed tracking call must never break the page.
export type EventName =
  | "page_view"
  | "waitlist_view"
  | "waitlist_signup_click"
  | "onboarding_started"
  | "firm_matched"
  | "account_view"
  | "paywall_view"
  | "checkout_click"
  | "onboarding_completed";

export function track(name: EventName, source?: string): void {
  fetch(`${BASE}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, source }),
    keepalive: true,
  }).catch(() => {});
}
