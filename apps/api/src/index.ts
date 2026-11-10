// apps/api/src/index.ts: the whole API as one fetch handler. No router framework.
import { looksLikePdf, MAX_RESUME_BYTES, rateResume, readPdfText } from "./resume";

interface Env {
  DB: D1Database;
  RESUMES: R2Bucket; // resume PDFs
  APP_ENV: string;
  WEB_ORIGIN: string;
  // Secrets. Locally, put them in apps/api/.dev.vars (gitignored). Test mode keys only for now.
  STRIPE_SECRET_KEY?: string;
  STRIPE_PRICE_MONTHLY?: string; // "price_..." for the Monthly Plan ($25 a month)
  STRIPE_PRICE_TERM?: string; // "price_..." for the Term Plan ($45 every 4 months)
  STRIPE_WEBHOOK_SECRET?: string; // "whsec_..." from `stripe listen` or the webhook endpoint settings
  // Opens /admin/overview. Any long random string. Replaced by admin Google sign-in once Better Auth exists.
  ADMIN_KEY?: string;
}

type Plan = "monthly" | "term";
// Stripe subscription statuses that unlock Pro. Anything else (past_due, canceled, unpaid…) does not.
const ACTIVE_STATUSES = new Set(["active", "trialing"]);
const WEBHOOK_TOLERANCE_SECONDS = 300; // reject messages older than 5 minutes (replay protection)

const MAX_BODY_BYTES = 2_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_EVENTS = new Set([
  "page_view",
  "waitlist_view",
  "waitlist_signup_click",
  // Onboarding funnel (rule 10).
  "onboarding_started",
  "onboarding_step", // source is the screen's name, so we can see where students drop off
  "firm_matched",
  "account_view",
  "paywall_view",
  "trial_start_click",
  "onboarding_completed",
  // Dashboards. Every user-visible feature emits an event (rule 9).
  "welcome_view",
  "dashboard_view",
  "profile_edited",
  "assistant_message",
  // Resume (core feature 2).
  "resume_uploaded",
  "resume_rated",
  "resume_deleted",
]);

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      const route = `${request.method} ${url.pathname}`;
      let response: Response;

      switch (route) {
        case "GET /health":
          response = Response.json({ ok: true, env: env.APP_ENV });
          break;
        case "POST /waitlist":
          response = await joinWaitlist(request, env);
          break;
        case "POST /events":
          response = await logEvent(request, env);
          break;
        case "POST /checkout":
          response = await startCheckout(request, env);
          break;
        case "POST /webhooks/stripe":
          response = await stripeWebhook(request, env);
          break;
        case "GET /me/entitlements":
          response = await getEntitlements(url, env);
          break;
        case "POST /profile":
          response = await saveProfile(request, env);
          break;
        case "GET /me":
          response = await getMe(url, env);
          break;
        case "POST /billing-portal":
          response = await billingPortal(request, env);
          break;
        case "POST /resume":
          response = await uploadResume(request, env);
          break;
        case "GET /resume":
          response = await getResume(url, env);
          break;
        case "DELETE /resume":
          response = await deleteResume(url, env);
          break;
        case "POST /resume/rate":
          response = await rateStoredResume(request, env);
          break;
        case "GET /admin/overview":
          response = await adminOverview(request, env);
          break;
        default:
          response = Response.json({ error: "not_found" }, { status: 404 });
      }

      return withHeaders(response, cors);
    } catch (err) {
      // Later, errors go to Tinybird with every other event. For now, the log.
      console.error("api_error", url.pathname, String(err));
      return withHeaders(Response.json({ error: "internal" }, { status: 500 }), cors);
    }
  },
} satisfies ExportedHandler<Env>;

async function joinWaitlist(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  if (!body) return Response.json({ error: "bad_request" }, { status: 400 });

  const email = cleanText(body.email, 254)?.toLowerCase();
  if (!email || !EMAIL_PATTERN.test(email)) {
    return Response.json({ error: "invalid_email" }, { status: 400 });
  }

  const school = cleanText(body.school, 100);
  const program = cleanText(body.program, 100);
  const source = cleanText(body.source, 50);
  const now = Date.now();

  // ON CONFLICT DO NOTHING means a repeat signup is not an error.
  const result = await env.DB
    .prepare(
      "INSERT INTO waitlist (id, email, school, program, source, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING",
    )
    .bind(crypto.randomUUID(), email, school, program, source, now)
    .run();

  const isNew = (result.meta.changes ?? 0) > 0;
  if (isNew) {
    await env.DB
      .prepare("INSERT INTO events (id, name, source, created_at) VALUES (?, ?, ?, ?)")
      .bind(crypto.randomUUID(), "waitlist_signup", source, now)
      .run();
  }

  return Response.json({ ok: true, already_joined: !isNew }, { status: isNew ? 201 : 200 });
}

async function logEvent(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  const name = cleanText(body?.name, 50);
  if (!body || !name || !ALLOWED_EVENTS.has(name)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  await env.DB
    .prepare("INSERT INTO events (id, name, source, created_at) VALUES (?, ?, ?, ?)")
    .bind(crypto.randomUUID(), name, cleanText(body.source, 50), Date.now())
    .run();
  return Response.json({ ok: true }, { status: 201 });
}

// Creates a Stripe Checkout page for a subscription (decision 0005) and returns its URL.
// Plain fetch to Stripe's REST API, so no new dependency. The secret key stays on the server.
async function startCheckout(request: Request, env: Env): Promise<Response> {
  const prices: Record<Plan, string | undefined> = { monthly: env.STRIPE_PRICE_MONTHLY, term: env.STRIPE_PRICE_TERM };
  if (!env.STRIPE_SECRET_KEY || !prices.monthly || !prices.term) {
    return Response.json({ error: "payments_not_configured" }, { status: 503 });
  }
  const body = await readJson(request);
  const email = cleanText(body?.email, 254)?.toLowerCase();
  if (!email || !EMAIL_PATTERN.test(email)) {
    return Response.json({ error: "invalid_email" }, { status: 400 });
  }
  const plan = body?.plan;
  if (plan !== "monthly" && plan !== "term") {
    return Response.json({ error: "invalid_plan" }, { status: 400 });
  }

  const form = new URLSearchParams({
    mode: "subscription", // renews automatically until the student cancels
    "line_items[0][price]": prices[plan]!,
    "line_items[0][quantity]": "1",
    customer_email: email,
    client_reference_id: email,
    // Copied onto the subscription, so every later subscription event says whose it is.
    "subscription_data[metadata][email]": email,
    "subscription_data[metadata][plan]": plan,
    // The plan comes back in the address so the thank-you banner can name it.
    success_url: `${env.WEB_ORIGIN}/?checkout=success&plan=${plan}#/welcome`,
    // Sign-up keeps the student's answers in the tab, so a cancel lands back on the plan picker.
    cancel_url: `${env.WEB_ORIGIN}/?checkout=cancelled#/signup`,
  });
  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  if (!stripeRes.ok) {
    console.error("stripe_checkout_failed", stripeRes.status, await stripeRes.text());
    return Response.json({ error: "checkout_failed" }, { status: 502 });
  }
  const session = (await stripeRes.json()) as { id?: string; url?: string };
  if (!session.url) return Response.json({ error: "checkout_failed" }, { status: 502 });

  await logServerEvent(env, "checkout_started", plan);
  return Response.json({ url: session.url });
}

// Stripe calls this when a subscription starts, renews, changes or ends.
// The only thing that writes entitlements.
async function stripeWebhook(request: Request, env: Env): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: "payments_not_configured" }, { status: 503 });
  }
  // Signature is computed over the exact raw text, so read it before any parsing.
  const raw = await request.text();
  const valid = await verifyStripeSignature(raw, request.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return Response.json({ error: "bad_signature" }, { status: 400 });

  let event: { type?: string; created?: number; data?: { object?: Record<string, any> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  if (event.type?.startsWith("customer.subscription.")) {
    await syncSubscription(env, event.data?.object ?? {}, (event.created ?? 0) * 1000);
  }
  // Always answer 200 for valid messages, even ones we ignore, so Stripe stops retrying.
  return Response.json({ received: true });
}

// One entitlement row per Stripe subscription. Each event carries the whole subscription,
// so we just copy its latest state. Events can arrive twice or out of order:
// a row only changes if the event is at least as new as the last one applied.
async function syncSubscription(env: Env, sub: Record<string, any>, eventAt: number): Promise<void> {
  const subId = cleanText(sub.id, 255);
  const email = cleanText(sub.metadata?.email, 254)?.toLowerCase();
  const plan: Plan = sub.metadata?.plan === "monthly" ? "monthly" : "term";
  // Newer Stripe API versions keep the period end on the subscription item instead.
  const periodEnd = Number(sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end);
  if (!subId || !email || !Number.isFinite(periodEnd)) return;

  const status = ACTIVE_STATUSES.has(sub.status) ? "active" : "expired";
  const now = Date.now();
  const existing = await env.DB
    .prepare("SELECT status FROM entitlements WHERE stripe_subscription_id = ?")
    .bind(subId)
    .first<{ status: string }>();

  const result = await env.DB
    .prepare(
      `INSERT INTO entitlements
         (id, email, plan, status, source, stripe_subscription_id, stripe_customer_id, starts_at, expires_at, last_event_at, created_at)
       VALUES (?, ?, ?, ?, 'stripe', ?, ?, ?, ?, ?, ?)
       ON CONFLICT(stripe_subscription_id) DO UPDATE SET
         plan = excluded.plan, status = excluded.status, expires_at = excluded.expires_at, last_event_at = excluded.last_event_at
       WHERE excluded.last_event_at >= entitlements.last_event_at`,
    )
    .bind(crypto.randomUUID(), email, plan, status, subId, cleanText(sub.customer, 255), now, periodEnd * 1000, eventAt, now)
    .run();

  // Key events: the first time a subscription becomes active, and when it ends.
  // Only when this event actually changed the row (not a repeat, not a stale one).
  if ((result.meta.changes ?? 0) === 0) return;
  if (status === "active" && existing?.status !== "active") await logServerEvent(env, "subscription_started", plan);
  if (status === "expired" && existing?.status === "active") await logServerEvent(env, "subscription_ended", plan);
}

async function logServerEvent(env: Env, name: string, source: string): Promise<void> {
  await env.DB
    .prepare("INSERT INTO events (id, name, source, created_at) VALUES (?, ?, ?, ?)")
    .bind(crypto.randomUUID(), name, source, Date.now())
    .run();
}

// Header looks like "t=1700000000,v1=abcdef...". v1 = HMAC-SHA256 of "t.rawBody" with the secret.
async function verifyStripeSignature(raw: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const timestamp = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!timestamp || signatures.length === 0) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > WEBHOOK_TOLERANCE_SECONDS) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  for (const sig of signatures) {
    const bytes = hexToBytes(sig);
    if (!bytes) continue;
    // verify() compares in constant time, so timing cannot leak the signature.
    if (await crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(`${timestamp}.${raw}`))) return true;
  }
  return false;
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  return Uint8Array.from(hex.match(/../g)!, (b) => parseInt(b, 16));
}

// Temporary: looks up by email until sign-in (Better Auth) exists. Then it will use the session.
async function getEntitlements(url: URL, env: Env): Promise<Response> {
  const email = cleanText(url.searchParams.get("email"), 254)?.toLowerCase();
  if (!email) return Response.json({ error: "invalid_email" }, { status: 400 });
  const row = await env.DB
    .prepare("SELECT plan, expires_at FROM entitlements WHERE email = ? AND status = 'active' AND expires_at > ? ORDER BY expires_at DESC LIMIT 1")
    .bind(email, Date.now())
    .first<{ plan: string; expires_at: number }>();
  return Response.json({ pro: row !== null, plan: row?.plan ?? null, expires_at: row?.expires_at ?? null });
}

// Until sign-in exists, /me, /profile and /billing-portal find a student by email. That is fine on a dev machine
// and not safe in public (anyone could type someone else's email), so they refuse to run in production.
// Better Auth replaces the email with the signed-in session, and this check goes away.
function emailLookupAllowed(env: Env): boolean {
  return env.APP_ENV !== "production";
}

const jsonList = (value: unknown, maxItems: number, maxLength: number): string => {
  if (!Array.isArray(value)) return "[]";
  const items = value.map((v) => cleanText(v, maxLength)).filter((v): v is string => v !== null);
  return JSON.stringify(items.slice(0, maxItems));
};

const parseList = (raw: string | null): string[] => {
  try {
    const v: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

// Saves the onboarding answers (or edits from the dashboard). One row per email.
async function saveProfile(request: Request, env: Env): Promise<Response> {
  if (!emailLookupAllowed(env)) return Response.json({ error: "not_available" }, { status: 403 });
  const body = await readJson(request, 6_000);
  const email = cleanText(body?.email, 254)?.toLowerCase();
  if (!body || !email || !EMAIL_PATTERN.test(email)) return Response.json({ error: "invalid_email" }, { status: 400 });

  const now = Date.now();
  await env.DB
    .prepare(
      `INSERT INTO profiles
         (email, name, school, program, level, experience, applied, struggles, goals, jobs, term, place, heard_from, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         name = excluded.name, school = excluded.school, program = excluded.program, level = excluded.level,
         experience = excluded.experience, applied = excluded.applied, struggles = excluded.struggles,
         goals = excluded.goals, jobs = excluded.jobs, term = excluded.term, place = excluded.place,
         heard_from = COALESCE(excluded.heard_from, profiles.heard_from), updated_at = excluded.updated_at`,
    )
    .bind(
      email,
      cleanText(body.name, 100),
      cleanText(body.school, 100),
      cleanText(body.program, 100),
      cleanText(body.level, 50),
      cleanText(body.experience, 100),
      cleanText(body.applied, 50),
      jsonList(body.struggles, 10, 100),
      jsonList(body.goals, 10, 100),
      jsonList(body.jobs, 10, 100),
      cleanText(body.term, 50),
      cleanText(body.place, 100),
      cleanText(body.heard_from, 100),
      now,
      now,
    )
    .run();
  return Response.json({ ok: true });
}

// The customer dashboard's one call: profile plus plan status.
async function getMe(url: URL, env: Env): Promise<Response> {
  if (!emailLookupAllowed(env)) return Response.json({ error: "not_available" }, { status: 403 });
  const email = cleanText(url.searchParams.get("email"), 254)?.toLowerCase();
  if (!email || !EMAIL_PATTERN.test(email)) return Response.json({ error: "invalid_email" }, { status: 400 });

  const profile = await env.DB.prepare("SELECT * FROM profiles WHERE email = ?").bind(email).first<Record<string, any>>();
  const ent = await env.DB
    .prepare("SELECT plan, expires_at FROM entitlements WHERE email = ? AND status = 'active' AND expires_at > ? ORDER BY expires_at DESC LIMIT 1")
    .bind(email, Date.now())
    .first<{ plan: string; expires_at: number }>();

  const resume = await env.DB
    .prepare("SELECT filename, size, uploaded_at FROM resumes WHERE email = ?")
    .bind(email)
    .first<{ filename: string; size: number; uploaded_at: number }>();

  return Response.json({
    email,
    resume,
    profile: profile
      ? {
          name: profile.name,
          school: profile.school,
          program: profile.program,
          level: profile.level,
          experience: profile.experience,
          applied: profile.applied,
          struggles: parseList(profile.struggles),
          goals: parseList(profile.goals),
          jobs: parseList(profile.jobs),
          term: profile.term,
          place: profile.place,
        }
      : null,
    pro: ent !== null,
    plan: ent?.plan ?? null,
    renews_at: ent?.expires_at ?? null,
  });
}

const emailParam = (value: unknown): string | null => {
  const email = cleanText(value, 254)?.toLowerCase();
  return email && EMAIL_PATTERN.test(email) ? email : null;
};

// Saves one resume per student: the PDF in R2, its text in D1. A new upload replaces the old one.
async function uploadResume(request: Request, env: Env): Promise<Response> {
  if (!emailLookupAllowed(env)) return Response.json({ error: "not_available" }, { status: 403 });
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_RESUME_BYTES + 10_000) return Response.json({ error: "too_big" }, { status: 413 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const email = emailParam(form.get("email"));
  const file = form.get("file") as unknown as File | string | null;
  if (!email || !file || typeof file === "string") return Response.json({ error: "bad_request" }, { status: 400 });
  if (file.size > MAX_RESUME_BYTES) return Response.json({ error: "too_big" }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!looksLikePdf(bytes)) return Response.json({ error: "not_pdf" }, { status: 415 });
  const text = await readPdfText(bytes);
  if (!text) return Response.json({ error: "no_text" }, { status: 422 });

  const old = await env.DB.prepare("SELECT r2_key FROM resumes WHERE email = ?").bind(email).first<{ r2_key: string }>();
  const key = `resumes/${crypto.randomUUID()}.pdf`;
  await env.RESUMES.put(key, bytes, { httpMetadata: { contentType: "application/pdf" } });
  const filename = (cleanText(file.name, 200) ?? "resume.pdf").replace(/[^\w .()-]/g, "_");
  const now = Date.now();
  await env.DB
    .prepare(
      `INSERT INTO resumes (email, filename, size, r2_key, text, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET filename = excluded.filename, size = excluded.size, r2_key = excluded.r2_key,
         text = excluded.text, uploaded_at = excluded.uploaded_at`,
    )
    .bind(email, filename, bytes.length, key, text, now)
    .run();
  if (old) await env.RESUMES.delete(old.r2_key);

  return Response.json({ ok: true, resume: { filename, size: bytes.length, uploaded_at: now } }, { status: 201 });
}

async function getResume(url: URL, env: Env): Promise<Response> {
  if (!emailLookupAllowed(env)) return Response.json({ error: "not_available" }, { status: 403 });
  const email = emailParam(url.searchParams.get("email"));
  if (!email) return Response.json({ error: "invalid_email" }, { status: 400 });
  const resume = await env.DB
    .prepare("SELECT filename, size, uploaded_at FROM resumes WHERE email = ?")
    .bind(email)
    .first<{ filename: string; size: number; uploaded_at: number }>();
  return Response.json({ resume });
}

// The student can always remove their resume (rule 7). The file and the text both go.
async function deleteResume(url: URL, env: Env): Promise<Response> {
  if (!emailLookupAllowed(env)) return Response.json({ error: "not_available" }, { status: 403 });
  const email = emailParam(url.searchParams.get("email"));
  if (!email) return Response.json({ error: "invalid_email" }, { status: 400 });
  const row = await env.DB.prepare("SELECT r2_key FROM resumes WHERE email = ?").bind(email).first<{ r2_key: string }>();
  if (row) {
    await env.RESUMES.delete(row.r2_key);
    await env.DB.prepare("DELETE FROM resumes WHERE email = ?").bind(email).run();
  }
  return Response.json({ ok: true });
}

// Rates the saved resume against the student's target roles. Rule-based for now (see resume.ts).
async function rateStoredResume(request: Request, env: Env): Promise<Response> {
  if (!emailLookupAllowed(env)) return Response.json({ error: "not_available" }, { status: 403 });
  const body = await readJson(request);
  const email = emailParam(body?.email);
  if (!email) return Response.json({ error: "invalid_email" }, { status: 400 });
  const resume = await env.DB.prepare("SELECT text FROM resumes WHERE email = ?").bind(email).first<{ text: string }>();
  if (!resume) return Response.json({ error: "no_resume" }, { status: 404 });
  const profile = await env.DB.prepare("SELECT jobs FROM profiles WHERE email = ?").bind(email).first<{ jobs: string }>();
  return Response.json({ rating: rateResume(resume.text, parseList(profile?.jobs ?? null)) });
}

// Opens Stripe's billing portal, where a student updates their card or cancels.
// Needs the portal switched on in the Stripe dashboard. Until then Stripe refuses and the page shows a friendly note.
async function billingPortal(request: Request, env: Env): Promise<Response> {
  if (!emailLookupAllowed(env)) return Response.json({ error: "not_available" }, { status: 403 });
  if (!env.STRIPE_SECRET_KEY) return Response.json({ error: "payments_not_configured" }, { status: 503 });
  const body = await readJson(request);
  const email = cleanText(body?.email, 254)?.toLowerCase();
  if (!email || !EMAIL_PATTERN.test(email)) return Response.json({ error: "invalid_email" }, { status: 400 });

  const row = await env.DB
    .prepare("SELECT stripe_customer_id FROM entitlements WHERE email = ? AND stripe_customer_id IS NOT NULL ORDER BY created_at DESC LIMIT 1")
    .bind(email)
    .first<{ stripe_customer_id: string }>();
  if (!row) return Response.json({ error: "no_customer" }, { status: 404 });

  const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ customer: row.stripe_customer_id, return_url: `${env.WEB_ORIGIN}/#/dashboard` }),
  });
  if (!res.ok) {
    console.error("stripe_portal_failed", res.status, await res.text());
    return Response.json({ error: "portal_unavailable" }, { status: 502 });
  }
  const session = (await res.json()) as { url?: string };
  return session.url ? Response.json({ url: session.url }) : Response.json({ error: "portal_unavailable" }, { status: 502 });
}

// Compares two secrets without leaking where they differ.
async function safeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const xa = new Uint8Array(x);
  const ya = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < xa.length; i++) diff |= xa[i]! ^ ya[i]!;
  return diff === 0;
}

// Numbers for the admin dashboard. Protected by ADMIN_KEY sent as "Authorization: Bearer <key>".
async function adminOverview(request: Request, env: Env): Promise<Response> {
  if (!env.ADMIN_KEY) return Response.json({ error: "admin_not_configured" }, { status: 503 });
  const given = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!(await safeEqual(given, env.ADMIN_KEY))) return Response.json({ error: "unauthorized" }, { status: 401 });

  const now = Date.now();
  const since = now - 30 * 24 * 60 * 60 * 1000;
  const count = async (sql: string, ...args: unknown[]) =>
    (await env.DB.prepare(sql).bind(...args).first<{ n: number }>())?.n ?? 0;
  const rows = async <T>(sql: string, ...args: unknown[]) => (await env.DB.prepare(sql).bind(...args).all<T>()).results;
  // Top values of one profile column, e.g. schools. Column names are fixed here, never user input.
  const top = (column: "school" | "program" | "level" | "heard_from" | "place") =>
    rows<{ label: string; n: number }>(
      `SELECT ${column} AS label, COUNT(*) AS n FROM profiles WHERE ${column} IS NOT NULL GROUP BY ${column} ORDER BY n DESC, label LIMIT 8`,
    );

  const [waitlist, students, monthly, term, events, steps, schools, programs, levels, heard, places, recent] = await Promise.all([
    count("SELECT COUNT(*) AS n FROM waitlist"),
    count("SELECT COUNT(*) AS n FROM profiles"),
    count("SELECT COUNT(*) AS n FROM entitlements WHERE status = 'active' AND expires_at > ? AND plan = 'monthly'", now),
    count("SELECT COUNT(*) AS n FROM entitlements WHERE status = 'active' AND expires_at > ? AND plan = 'term'", now),
    rows<{ name: string; n: number }>("SELECT name, COUNT(*) AS n FROM events WHERE created_at > ? GROUP BY name", since),
    rows<{ label: string; n: number }>(
      "SELECT source AS label, COUNT(*) AS n FROM events WHERE name = 'onboarding_step' AND created_at > ? GROUP BY source",
      since,
    ),
    top("school"),
    top("program"),
    top("level"),
    top("heard_from"),
    top("place"),
    rows<Record<string, unknown>>(
      `SELECT p.name, p.email, p.school, p.program, p.level, p.created_at,
              EXISTS (SELECT 1 FROM entitlements e WHERE e.email = p.email AND e.status = 'active' AND e.expires_at > ?) AS paid
       FROM profiles p ORDER BY p.created_at DESC LIMIT 20`,
      now,
    ),
  ]);

  return Response.json({
    generated_at: now,
    totals: {
      waitlist,
      students,
      paying: monthly + term,
      monthly,
      term,
      // Monthly $25, Term $45 per 4 months. A rough monthly recurring revenue in dollars.
      mrr: Math.round(monthly * 25 + (term * 45) / 4),
    },
    events: Object.fromEntries(events.map((e) => [e.name, e.n])),
    steps: Object.fromEntries(steps.map((s) => [s.label, s.n])),
    breakdowns: { schools, programs, levels, heard_from: heard, places },
    recent,
  });
}

// Reads a small JSON body. Returns null if it is too big or not a JSON object.
async function readJson(request: Request, maxBytes = MAX_BODY_BYTES): Promise<Record<string, unknown> | null> {
  const text = await request.text();
  if (text.length === 0 || text.length > maxBytes) return null;
  try {
    const value: unknown = JSON.parse(text);
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

// Turns user input into a trimmed string, or null if empty or not text.
function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function corsHeaders(env: Env): Headers {
  return new Headers({
    "Access-Control-Allow-Origin": env.WEB_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  });
}

function withHeaders(response: Response, extra: Headers): Response {
  const headers = new Headers(response.headers);
  extra.forEach((value, key) => headers.set(key, value));
  return new Response(response.body, { status: response.status, headers });
}
