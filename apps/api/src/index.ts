// apps/api/src/index.ts: the whole API as one fetch handler. No router framework.

interface Env {
  DB: D1Database;
  APP_ENV: string;
  WEB_ORIGIN: string;
  // Secrets. Locally, put them in apps/api/.dev.vars (gitignored). Test mode keys only for now.
  STRIPE_SECRET_KEY?: string;
  STRIPE_PRICE_ID?: string; // the one-time "co-op term" price, created in the Stripe dashboard
  STRIPE_WEBHOOK_SECRET?: string; // "whsec_..." from the Stripe webhook endpoint settings
}

const TERM_MS = 120 * 24 * 60 * 60 * 1000; // one co-op term, about four months
const WEBHOOK_TOLERANCE_SECONDS = 300; // reject messages older than 5 minutes (replay protection)

const MAX_BODY_BYTES = 2_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_EVENTS = new Set([
  "page_view",
  "waitlist_view",
  "waitlist_signup_click",
  // Onboarding funnel (rule 10).
  "onboarding_started",
  "firm_matched",
  "account_view",
  "paywall_view",
  "trial_start_click",
  "onboarding_completed",
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

// Creates a Stripe Checkout page for one co-op term and returns its URL.
// Plain fetch to Stripe's REST API, so no new dependency. The secret key stays on the server.
async function startCheckout(request: Request, env: Env): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) {
    return Response.json({ error: "payments_not_configured" }, { status: 503 });
  }
  const body = await readJson(request);
  const email = cleanText(body?.email, 254)?.toLowerCase();
  if (!email || !EMAIL_PATTERN.test(email)) {
    return Response.json({ error: "invalid_email" }, { status: 400 });
  }

  const form = new URLSearchParams({
    mode: "payment", // one-time payment per term (decision 0002), not a subscription
    "line_items[0][price]": env.STRIPE_PRICE_ID,
    "line_items[0][quantity]": "1",
    customer_email: email,
    client_reference_id: email,
    success_url: `${env.WEB_ORIGIN}/?checkout=success#/`,
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
    console.error("stripe_checkout_failed", stripeRes.status);
    return Response.json({ error: "checkout_failed" }, { status: 502 });
  }
  const session = (await stripeRes.json()) as { id?: string; url?: string };
  if (!session.url) return Response.json({ error: "checkout_failed" }, { status: 502 });

  await env.DB
    .prepare("INSERT INTO events (id, name, source, created_at) VALUES (?, ?, ?, ?)")
    .bind(crypto.randomUUID(), "checkout_started", "api", Date.now())
    .run();
  return Response.json({ url: session.url });
}

// Stripe calls this after a payment. The only thing that can create an entitlement.
async function stripeWebhook(request: Request, env: Env): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: "payments_not_configured" }, { status: 503 });
  }
  // Signature is computed over the exact raw text, so read it before any parsing.
  const raw = await request.text();
  const valid = await verifyStripeSignature(raw, request.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return Response.json({ error: "bad_signature" }, { status: 400 });

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data?.object ?? {};
    const email = cleanText(session.customer_email ?? session.client_reference_id, 254)?.toLowerCase();
    const sessionId = cleanText(session.id, 255);
    if (session.payment_status === "paid" && email && sessionId) {
      const now = Date.now();
      // UNIQUE stripe_session_id: a repeated webhook changes nothing.
      const result = await env.DB
        .prepare(
          "INSERT INTO entitlements (id, email, plan, status, source, stripe_session_id, starts_at, expires_at, created_at) VALUES (?, ?, 'term', 'active', 'stripe', ?, ?, ?, ?) ON CONFLICT(stripe_session_id) DO NOTHING",
        )
        .bind(crypto.randomUUID(), email, sessionId, now, now + TERM_MS, now)
        .run();
      if ((result.meta.changes ?? 0) > 0) {
        await env.DB
          .prepare("INSERT INTO events (id, name, source, created_at) VALUES (?, ?, ?, ?)")
          .bind(crypto.randomUUID(), "payment_succeeded", "stripe", now)
          .run();
      }
    }
  }
  // Always answer 200 for valid messages, even ones we ignore, so Stripe stops retrying.
  return Response.json({ received: true });
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

// Reads a small JSON body. Returns null if it is too big or not a JSON object.
async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const text = await request.text();
  if (text.length === 0 || text.length > MAX_BODY_BYTES) return null;
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  });
}

function withHeaders(response: Response, extra: Headers): Response {
  const headers = new Headers(response.headers);
  extra.forEach((value, key) => headers.set(key, value));
  return new Response(response.body, { status: response.status, headers });
}
