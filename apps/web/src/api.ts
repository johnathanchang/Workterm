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

export type CheckoutResult = { url: string } | { error: "invalid_email" | "not_configured" | "error" };

// Asks the API for a Stripe Checkout page for a subscription. The browser never sees a Stripe key.
export async function startCheckout(email: string, plan: "monthly" | "term"): Promise<CheckoutResult> {
  try {
    const res = await fetch(`${BASE}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, plan }),
    });
    if (res.status === 400) return { error: "invalid_email" };
    if (res.status === 503) return { error: "not_configured" };
    if (!res.ok) return { error: "error" };
    const data = (await res.json()) as { url?: string };
    return data.url ? { url: data.url } : { error: "error" };
  } catch {
    return { error: "error" };
  }
}

// Fire and forget. A failed tracking call must never break the page.
export type EventName =
  | "page_view"
  | "waitlist_view"
  | "waitlist_signup_click"
  | "onboarding_started"
  | "onboarding_step"
  | "firm_matched"
  | "account_view"
  | "paywall_view"
  | "trial_start_click"
  | "onboarding_completed"
  | "welcome_view"
  | "dashboard_view"
  | "profile_edited"
  | "assistant_message";

export function track(name: EventName, source?: string): void {
  fetch(`${BASE}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, source }),
    keepalive: true,
  }).catch(() => {});
}

// What the student told us in onboarding. The dashboard shows it and lets them edit it.
export type Profile = {
  name: string | null;
  school: string | null;
  program: string | null;
  level: string | null;
  experience: string | null;
  applied: string | null;
  struggles: string[];
  goals: string[];
  jobs: string[];
  term: string | null;
  place: string | null;
};

export async function saveProfile(input: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type Me = { email: string; profile: Profile | null; pro: boolean; plan: "monthly" | "term" | null; renews_at: number | null };

// Temporary: looks the student up by email until sign-in exists. The API refuses this in production.
export async function getMe(email: string): Promise<Me | "unavailable" | "error"> {
  try {
    const res = await fetch(`${BASE}/me?email=${encodeURIComponent(email)}`);
    if (res.status === 403) return "unavailable";
    if (!res.ok) return "error";
    return (await res.json()) as Me;
  } catch {
    return "error";
  }
}

// Stripe's billing page, where a student updates a card or cancels.
export async function openBillingPortal(email: string): Promise<{ url: string } | { error: string }> {
  try {
    const res = await fetch(`${BASE}/billing-portal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) return { error: res.status === 502 ? "portal_unavailable" : "error" };
    const data = (await res.json()) as { url?: string };
    return data.url ? { url: data.url } : { error: "error" };
  } catch {
    return { error: "error" };
  }
}

type Counted = { label: string; n: number }[];
export type AdminOverview = {
  generated_at: number;
  totals: { waitlist: number; students: number; paying: number; monthly: number; term: number; mrr: number };
  events: Record<string, number>;
  steps: Record<string, number>;
  breakdowns: { schools: Counted; programs: Counted; levels: Counted; heard_from: Counted; places: Counted };
  recent: { name: string | null; email: string; school: string | null; program: string | null; level: string | null; created_at: number; paid: number }[];
};

export async function getAdminOverview(key: string): Promise<AdminOverview | "unauthorized" | "not_configured" | "error"> {
  try {
    const res = await fetch(`${BASE}/admin/overview`, { headers: { Authorization: `Bearer ${key}` } });
    if (res.status === 401) return "unauthorized";
    if (res.status === 503) return "not_configured";
    if (!res.ok) return "error";
    return (await res.json()) as AdminOverview;
  } catch {
    return "error";
  }
}
