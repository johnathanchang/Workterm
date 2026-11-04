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
    await env.DB.exec(sql.replace(/--.*$/gm, "").replace(/\s+/g, " "));
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

// ---- Payments (Stripe). Stripe's own API is faked, so no network and no real keys. ----

const REF = "11111111-2222-4333-8444-555555555555";
const SECRET = "whsec_test_secret";
const withStripe = { STRIPE_SECRET_KEY: "sk_test_fake", STRIPE_WEBHOOK_SECRET: SECRET };
const callWith = (extra: object, path: string, init?: RequestInit) =>
  worker.fetch(new Request(`http://test${path}`, init) as any, { ...env, ...extra }, { waitUntil() {} } as any);

// Signs a body the way Stripe does: HMAC-SHA256 of "timestamp.body".
async function signed(body: string, secret = SECRET, t = Math.floor(Date.now() / 1000)) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${body}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `t=${t},v1=${hex}`;
}

const webhook = async (event: object, header?: string) => {
  const body = JSON.stringify(event);
  return callWith(withStripe, "/webhooks/stripe", {
    method: "POST",
    headers: { "Stripe-Signature": header ?? (await signed(body)) },
    body,
  });
};

const paid = (id: string, plan: string, extra: object = {}) => ({
  id,
  type: "checkout.session.completed",
  data: { object: { id: `cs_${id}`, client_reference_id: REF, customer: "cus_1", payment_status: "paid", metadata: { plan, ref: REF }, ...extra } },
});

const entitlement = async () => (await callWith(withStripe, `/me/entitlements?ref=${REF}`)).json() as Promise<any>;

test("checkout needs a valid plan and id, and a configured key", async () => {
  const post2 = (extra: object, body: unknown) =>
    callWith(extra, "/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  expect((await post2(withStripe, { plan: "free", ref: REF })).status).toBe(400);
  expect((await post2(withStripe, { plan: "term", ref: "not-a-uuid" })).status).toBe(400);
  const none = await post2({}, { plan: "term", ref: REF });
  expect(none.status).toBe(503);
  expect(await none.json()).toEqual({ error: "payments_not_configured" });
});

test("checkout asks Stripe for the right price and returns its page", async () => {
  const real = globalThis.fetch;
  let sent: URLSearchParams | undefined;
  let auth = "";
  globalThis.fetch = (async (_url: any, init: any) => {
    sent = init.body as URLSearchParams;
    auth = init.headers.Authorization;
    return Response.json({ url: "https://checkout.stripe.com/c/pay/cs_test_1" });
  }) as any;
  try {
    const post2 = (plan: string) =>
      callWith(withStripe, "/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, ref: REF }) });

    const term = await post2("term");
    expect(await term.json()).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    expect(auth).toBe("Bearer sk_test_fake");
    expect(sent!.get("mode")).toBe("payment");
    expect(sent!.get("line_items[0][price_data][unit_amount]")).toBe("4500");
    expect(sent!.get("line_items[0][price_data][recurring][interval]")).toBeNull();
    expect(sent!.get("client_reference_id")).toBe(REF);
    expect(sent!.get("ui_mode")).toBe("hosted_page");
    expect(sent!.get("allow_promotion_codes")).toBe("true");
    expect(sent!.get("submit_type")).toBe("auto");
    expect(sent!.get("payment_method_collection")).toBeNull();

    await post2("month");
    expect(sent!.get("mode")).toBe("subscription");
    expect(sent!.get("payment_method_collection")).toBe("always");
    expect(sent!.get("submit_type")).toBeNull();
    expect(sent!.get("line_items[0][price_data][unit_amount]")).toBe("2500");
    expect(sent!.get("line_items[0][price_data][recurring][interval]")).toBe("month");
  } finally {
    globalThis.fetch = real;
  }
});

test("webhook rejects a missing, wrong or stale signature", async () => {
  const body = JSON.stringify(paid("evt_bad", "term"));
  const send = (header?: string) =>
    callWith(withStripe, "/webhooks/stripe", { method: "POST", headers: header ? { "Stripe-Signature": header } : {}, body });
  expect((await send()).status).toBe(400);
  expect((await send(await signed(body, "whsec_wrong"))).status).toBe(400);
  expect((await send(await signed(body, SECRET, Math.floor(Date.now() / 1000) - 3600))).status).toBe(400);
  expect((await entitlement()).active).toBe(false);
});

test("a paid term unlocks access once, even if Stripe repeats the event", async () => {
  expect((await webhook(paid("evt_term", "term"))).status).toBe(200);
  const again = await webhook(paid("evt_term", "term"));
  expect(await again.json()).toEqual({ ok: true, duplicate: true });
  const e = await entitlement();
  expect(e.active).toBe(true);
  expect(e.plan).toBe("term");
  // About 4 months out.
  const days = (e.current_period_end - Date.now()) / 86_400_000;
  expect(days).toBeGreaterThan(115);
  expect(days).toBeLessThan(125);
  const rows = await env.DB.prepare("SELECT COUNT(*) AS n FROM entitlements WHERE user_ref = ?").bind(REF).first();
  expect(rows.n).toBe(1);
});

test("a canceled subscription loses access", async () => {
  await env.DB.prepare("DELETE FROM entitlements WHERE user_ref = ?").bind(REF).run();
  await webhook(paid("evt_month", "month", { subscription: "sub_1" }));
  expect((await entitlement()).plan).toBe("month");
  const soon = Math.floor(Date.now() / 1000) + 86_400 * 30;
  await webhook({ id: "evt_upd", type: "customer.subscription.updated", data: { object: { id: "sub_1", status: "active", current_period_end: soon } } });
  expect((await entitlement()).current_period_end).toBe(soon * 1000);
  await webhook({ id: "evt_del", type: "customer.subscription.deleted", data: { object: { id: "sub_1", status: "canceled" } } });
  expect((await entitlement()).active).toBe(false);
});

test("entitlements needs a valid id", async () => {
  expect((await call("/me/entitlements")).status).toBe(400);
  expect((await call("/me/entitlements?ref=zzz")).status).toBe(400);
});
