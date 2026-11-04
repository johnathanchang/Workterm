// Stripe payments for the Worker: start a Checkout, hear back from Stripe, answer "is this student paid?".
// Plain fetch to Stripe's API, no SDK. Secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) never reach the browser.

export interface StripeEnv {
  DB: D1Database;
  WEB_ORIGIN: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

export type PlanId = "month" | "term";

// Prices in cents, US dollars (decision 0005). Inline prices mean nothing to set up in the Stripe dashboard.
const PLANS: Record<PlanId, { name: string; cents: number }> = {
  month: { name: "Workterm Monthly", cents: 2500 },
  term: { name: "Workterm Per term (4 months)", cents: 4500 },
};

const TERM_MONTHS = 4;
const SIGNATURE_TOLERANCE_SECONDS = 300;
const WEBHOOK_MAX_BYTES = 256_000;

// Rules for the random id the browser keeps until sign-in exists. A UUID, nothing else.
const REF_PATTERN = /^[0-9a-f-]{36}$/i;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

// POST /checkout { plan, ref } -> { url }. The browser then goes to that Stripe page.
export async function createCheckout(body: Record<string, unknown> | null, env: StripeEnv): Promise<Response> {
  const plan = body?.plan;
  const ref = body?.ref;
  if ((plan !== "month" && plan !== "term") || typeof ref !== "string" || !REF_PATTERN.test(ref)) {
    return json({ error: "bad_request" }, 400);
  }
  if (!env.STRIPE_SECRET_KEY) return json({ error: "payments_not_configured" }, 503);

  const p = PLANS[plan];
  const form = new URLSearchParams();
  form.set("mode", plan === "month" ? "subscription" : "payment");
  // Checkout Studio settings (fixed). No SDK here, so ui_mode is sent as plain text; see STRIPE_INTEGRATION_TODO.md.
  form.set("ui_mode", "hosted_page");
  form.set("billing_address_collection", "auto");
  form.set("phone_number_collection[enabled]", "true");
  form.set("automatic_tax[enabled]", "false");
  form.set("allow_promotion_codes", "true");
  form.set("saved_payment_method_options[payment_method_save]", "enabled");
  form.set("integration_identifier", "hosted_web_0001");
  form.set("origin_context", "web");
  // Stripe only accepts payment_method_collection on subscriptions and submit_type on one-time payments.
  if (plan === "month") form.set("payment_method_collection", "always");
  else form.set("submit_type", "auto");
  form.set("client_reference_id", ref);
  form.set("success_url", `${env.WEB_ORIGIN}/#/welcome`);
  form.set("cancel_url", `${env.WEB_ORIGIN}/#/pricing`);
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", "usd");
  form.set("line_items[0][price_data][unit_amount]", String(p.cents));
  form.set("line_items[0][price_data][product_data][name]", p.name);
  if (plan === "month") form.set("line_items[0][price_data][recurring][interval]", "month");
  // Stripe copies this onto the subscription, so later events can find the student and the plan.
  form.set("metadata[plan]", plan);
  form.set("metadata[ref]", ref);
  if (plan === "month") {
    form.set("subscription_data[metadata][plan]", plan);
    form.set("subscription_data[metadata][ref]", ref);
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const data = (await res.json().catch(() => null)) as { url?: string; error?: { message?: string } } | null;
  if (!res.ok || !data?.url) {
    console.error("stripe_checkout_failed", res.status, data?.error?.message);
    return json({ error: "checkout_failed" }, 502);
  }
  return json({ url: data.url });
}

// GET /me/entitlements?ref=... -> { active, plan, current_period_end }. The only Pro check.
export async function getEntitlements(url: URL, env: StripeEnv): Promise<Response> {
  const ref = url.searchParams.get("ref") ?? "";
  if (!REF_PATTERN.test(ref)) return json({ error: "bad_request" }, 400);
  const row = await env.DB
    .prepare(
      "SELECT plan, status, current_period_end FROM entitlements WHERE user_ref = ? AND status = 'active' AND (current_period_end IS NULL OR current_period_end > ?) ORDER BY current_period_end DESC LIMIT 1",
    )
    .bind(ref, Date.now())
    .first<{ plan: PlanId; status: string; current_period_end: number | null }>();
  if (!row) return json({ active: false, plan: null, current_period_end: null });
  return json({ active: true, plan: row.plan, current_period_end: row.current_period_end });
}

// POST /webhooks/stripe. Stripe calls this after a payment or a subscription change.
export async function stripeWebhook(request: Request, env: StripeEnv): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET) return json({ error: "payments_not_configured" }, 503);

  const raw = await request.text();
  if (raw.length > WEBHOOK_MAX_BYTES) return json({ error: "bad_request" }, 400);
  const valid = await verifySignature(raw, request.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return json({ error: "bad_signature" }, 400);

  let event: StripeEvent;
  try {
    event = JSON.parse(raw) as StripeEvent;
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  if (typeof event.id !== "string" || typeof event.type !== "string") return json({ error: "bad_request" }, 400);

  // Handle each Stripe event once. A repeat gets a quiet "ok".
  const seen = await env.DB
    .prepare("INSERT INTO stripe_events (id, created_at) VALUES (?, ?) ON CONFLICT(id) DO NOTHING")
    .bind(event.id, Date.now())
    .run();
  if ((seen.meta.changes ?? 0) === 0) return json({ ok: true, duplicate: true });

  try {
    await handleEvent(event, env);
  } catch (err) {
    // Forget the id, so Stripe's retry gets another go.
    await env.DB.prepare("DELETE FROM stripe_events WHERE id = ?").bind(event.id).run();
    throw err;
  }
  return json({ ok: true });
}

interface StripeEvent {
  id: string;
  type: string;
  data?: { object?: Record<string, any> };
}

async function handleEvent(event: StripeEvent, env: StripeEnv): Promise<void> {
  const obj = event.data?.object ?? {};
  const now = Date.now();

  if (event.type === "checkout.session.completed") {
    const plan = obj.metadata?.plan;
    const ref = obj.client_reference_id ?? obj.metadata?.ref;
    if ((plan !== "month" && plan !== "term") || typeof ref !== "string" || obj.payment_status === "unpaid") return;

    // One payment covers 4 months. A subscription's end date arrives with the subscription events, so give it a month for now.
    const end = new Date(now);
    end.setUTCMonth(end.getUTCMonth() + (plan === "term" ? TERM_MONTHS : 1));
    await env.DB
      .prepare(
        `INSERT INTO entitlements (id, user_ref, plan, status, stripe_session_id, stripe_customer_id, stripe_subscription_id, current_period_end, created_at, updated_at)
         VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?) ON CONFLICT(stripe_session_id) DO NOTHING`,
      )
      .bind(crypto.randomUUID(), ref, plan, obj.id, obj.customer ?? null, obj.subscription ?? null, end.getTime(), now, now)
      .run();
    return;
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const status = event.type === "customer.subscription.deleted" ? "canceled" : mapStatus(obj.status);
    // Stripe puts the period end on the subscription, or on its first item in newer API versions.
    const seconds: unknown = obj.current_period_end ?? obj.items?.data?.[0]?.current_period_end;
    const end = typeof seconds === "number" ? seconds * 1000 : null;
    await env.DB
      .prepare(
        "UPDATE entitlements SET status = ?, current_period_end = COALESCE(?, current_period_end), updated_at = ? WHERE stripe_subscription_id = ?",
      )
      .bind(status, end, now, obj.id)
      .run();
  }
}

function mapStatus(s: unknown): "active" | "past_due" | "canceled" {
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid") return "past_due";
  return "canceled";
}

// Stripe-Signature looks like "t=1700000000,v1=abcdef...". v1 is HMAC-SHA256 of "t.body" with the webhook secret.
async function verifySignature(raw: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(",").map((kv) => kv.trim().split("=") as [string, string]);
  const t = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || signatures.length === 0) return false;
  const age = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(age) || age > SIGNATURE_TOLERANCE_SECONDS) return false;

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${raw}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return signatures.some((s) => timingSafeEqual(s, expected));
}

// Compares in the same time whether or not the first letters match, so timing cannot leak the signature.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
