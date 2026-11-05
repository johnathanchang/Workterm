// Runs the real API code against a local copy of the database. No network needed.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { join } from "node:path";
import { getPlatformProxy } from "wrangler";
import worker from "../src/index";

// Paths are relative to apps/api, so the tests work from the repo root too.
const api = join(import.meta.dir, "..");

let env: any;
let dispose: () => Promise<void>;

beforeAll(async () => {
  const proxy = await getPlatformProxy({ configPath: join(api, "wrangler.jsonc"), persist: false });
  env = proxy.env;
  dispose = proxy.dispose;
  for (const file of ["0001_waitlist.sql", "0002_entitlements.sql"]) {
    const sql = await Bun.file(join(api, "migrations", file)).text();
    // exec wants one statement per line, so strip comments and put each statement on its own line.
    await env.DB.exec(sql.replace(/--.*$/gm, "").replace(/\s+/g, " ").replace(/; /g, ";\n"));
  }
});

afterAll(async () => {
  await dispose?.();
});

const call = (path: string, init?: RequestInit) =>
  worker.fetch(new Request(`http://test${path}`, init) as any, env, { waitUntil() {} } as any);

const post = (path: string, body: unknown) =>
  call(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("health works", async () => {
  const res = await call("/health");
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true, env: "dev" });
});

test("new signup is saved, repeat signup is not an error", async () => {
  const first = await post("/waitlist", { email: " Student@Mac.CA " });
  expect(first.status).toBe(201);
  const second = await post("/waitlist", { email: "student@mac.ca" });
  expect(second.status).toBe(200);
  expect(await second.json()).toEqual({ ok: true, already_joined: true });
  const rows = await env.DB.prepare("SELECT COUNT(*) AS n FROM waitlist WHERE email = ?").bind("student@mac.ca").first();
  expect(rows.n).toBe(1);
});

test("bad email and bad body are rejected", async () => {
  expect((await post("/waitlist", { email: "nope" })).status).toBe(400);
  expect((await call("/waitlist", { method: "POST", body: "hello" })).status).toBe(400);
});

test("events only accept known names", async () => {
  expect((await post("/events", { name: "page_view" })).status).toBe(201);
  expect((await post("/events", { name: "firm_matched" })).status).toBe(201);
  expect((await post("/events", { name: "hack" })).status).toBe(400);
});

test("unknown route is 404", async () => {
  expect((await call("/nope")).status).toBe(404);
});

test("checkout returns 503 when Stripe keys are missing", async () => {
  expect((await post("/checkout", { email: "a@b.ca" })).status).toBe(503);
});

test("checkout creates a Stripe session and logs an event", async () => {
  env.STRIPE_SECRET_KEY = "sk_test_fake";
  env.STRIPE_PRICE_ID = "price_fake";
  const realFetch = globalThis.fetch;
  let sent: { url: string; body: string; auth: string | null } | null = null;
  globalThis.fetch = (async (input: any, init: any) => {
    sent = { url: String(input), body: String(init.body), auth: new Headers(init.headers).get("Authorization") };
    return Response.json({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" });
  }) as any;
  try {
    expect((await post("/checkout", { email: "nope" })).status).toBe(400);
    const res = await post("/checkout", { email: "Student@Mac.CA" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    expect(sent!.url).toBe("https://api.stripe.com/v1/checkout/sessions");
    expect(sent!.auth).toBe("Bearer sk_test_fake");
    expect(sent!.body).toContain("mode=payment");
    expect(sent!.body).toContain("student%40mac.ca");
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE name = 'checkout_started'").first();
    expect(row.n).toBe(1);
  } finally {
    globalThis.fetch = realFetch;
    delete env.STRIPE_SECRET_KEY;
    delete env.STRIPE_PRICE_ID;
  }
});

// Builds a webhook request signed the way Stripe signs it.
async function signedWebhook(payload: object, secret: string, timestamp = Math.floor(Date.now() / 1000)) {
  const raw = JSON.stringify(payload);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${raw}`));
  const sig = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return call("/webhooks/stripe", { method: "POST", headers: { "Stripe-Signature": `t=${timestamp},v1=${sig}` }, body: raw });
}

const paid = { type: "checkout.session.completed", data: { object: { id: "cs_test_9", customer_email: "Paid@Mac.ca", payment_status: "paid" } } };

test("webhook unlocks Pro once, even if Stripe repeats it", async () => {
  env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  try {
    const before = await call("/me/entitlements?email=paid@mac.ca");
    expect((await before.json()).pro).toBe(false);

    expect((await signedWebhook(paid, "whsec_test")).status).toBe(200);
    expect((await signedWebhook(paid, "whsec_test")).status).toBe(200); // repeat

    const rows = await env.DB.prepare("SELECT COUNT(*) AS n FROM entitlements WHERE email = 'paid@mac.ca'").first();
    expect(rows.n).toBe(1);
    const events = await env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE name = 'payment_succeeded'").first();
    expect(events.n).toBe(1);

    const after = await (await call("/me/entitlements?email=paid@mac.ca")).json();
    expect(after.pro).toBe(true);
    expect(after.plan).toBe("term");
  } finally {
    delete env.STRIPE_WEBHOOK_SECRET;
  }
});

test("webhook rejects bad, missing, and stale signatures, and unpaid sessions grant nothing", async () => {
  env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  try {
    const other = { ...paid, data: { object: { ...paid.data.object, id: "cs_test_10", customer_email: "evil@mac.ca" } } };
    expect((await signedWebhook(other, "wrong_secret")).status).toBe(400);
    expect((await call("/webhooks/stripe", { method: "POST", body: JSON.stringify(other) })).status).toBe(400);
    expect((await signedWebhook(other, "whsec_test", Math.floor(Date.now() / 1000) - 3600)).status).toBe(400);

    const unpaid = { ...other, data: { object: { ...other.data.object, payment_status: "unpaid" } } };
    expect((await signedWebhook(unpaid, "whsec_test")).status).toBe(200);
    const body = await (await call("/me/entitlements?email=evil@mac.ca")).json();
    expect(body.pro).toBe(false);
  } finally {
    delete env.STRIPE_WEBHOOK_SECRET;
  }
});
