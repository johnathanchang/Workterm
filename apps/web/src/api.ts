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

// Fire and forget. A failed tracking call must never break the page.
export function track(name: "page_view" | "waitlist_view" | "waitlist_signup_click", source?: string): void {
  fetch(`${BASE}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, source }),
    keepalive: true,
  }).catch(() => {});
}
