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
  // Tests never use the real keys in .dev.vars. Each Stripe test sets fake ones and mocks fetch.
  for (const k of Object.keys(env)) if (k.startsWith("STRIPE_")) delete env[k];
  for (const file of ["0001_waitlist.sql", "0002_entitlements.sql", "0003_subscriptions.sql", "0004_profiles.sql", "0005_resumes.sql"]) {
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
  expect((await post("/events", { name: "onboarding_step", source: "struggle" })).status).toBe(201);
  expect((await post("/events", { name: "hack" })).status).toBe(400);
});

test("unknown route is 404", async () => {
  expect((await call("/nope")).status).toBe(404);
});

test("checkout returns 503 when Stripe keys are missing", async () => {
  expect((await post("/checkout", { email: "a@b.ca", plan: "term" })).status).toBe(503);
});

test("checkout creates a subscription session for the chosen plan", async () => {
  Object.assign(env, { STRIPE_SECRET_KEY: "sk_test_fake", STRIPE_PRICE_MONTHLY: "price_month", STRIPE_PRICE_TERM: "price_term" });
  const realFetch = globalThis.fetch;
  let sent: { url: string; body: string; auth: string | null } | null = null;
  globalThis.fetch = (async (input: any, init: any) => {
    sent = { url: String(input), body: String(init.body), auth: new Headers(init.headers).get("Authorization") };
    return Response.json({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" });
  }) as any;
  try {
    expect((await post("/checkout", { email: "nope", plan: "term" })).status).toBe(400);
    expect((await post("/checkout", { email: "a@b.ca", plan: "yearly" })).status).toBe(400);

    const res = await post("/checkout", { email: "Student@Mac.CA", plan: "monthly" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    const form = new URLSearchParams(sent!.body);
    expect(sent!.url).toBe("https://api.stripe.com/v1/checkout/sessions");
    expect(sent!.auth).toBe("Bearer sk_test_fake");
    expect(form.get("mode")).toBe("subscription");
    expect(form.get("line_items[0][price]")).toBe("price_month");
    expect(form.get("subscription_data[metadata][email]")).toBe("student@mac.ca");
    expect(form.get("subscription_data[metadata][plan]")).toBe("monthly");
    expect(form.get("success_url")).toBe("http://localhost:5173/?checkout=success&plan=monthly#/welcome");
    expect(form.get("cancel_url")).toBe("http://localhost:5173/?checkout=cancelled#/signup");

    const termRes = await post("/checkout", { email: "a@b.ca", plan: "term" });
    expect(termRes.status).toBe(200);
    const termForm = new URLSearchParams(sent!.body);
    expect(termForm.get("line_items[0][price]")).toBe("price_term");
    expect(termForm.get("subscription_data[metadata][plan]")).toBe("term");
    expect(termForm.get("success_url")).toBe("http://localhost:5173/?checkout=success&plan=term#/welcome");

    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE name = 'checkout_started'").first();
    expect(row.n).toBe(2);
  } finally {
    globalThis.fetch = realFetch;
    for (const k of ["STRIPE_SECRET_KEY", "STRIPE_PRICE_MONTHLY", "STRIPE_PRICE_TERM"]) delete env[k];
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

// A subscription event as Stripe sends it. created is the event time in seconds.
const inAMonth = Math.floor(Date.now() / 1000) + 30 * 86400;
const subEvent = (type: string, status: string, created: number, email = "Paid@Mac.ca", id = "sub_1") => ({
  type: `customer.subscription.${type}`,
  created,
  data: { object: { id, customer: "cus_1", status, metadata: { email, plan: "monthly" }, items: { data: [{ current_period_end: inAMonth }] } } },
});
const pro = async (email: string) => (await (await call(`/me/entitlements?email=${email}`)).json()) as any;

test("subscription unlocks Pro, repeats are harmless, cancel locks it again", async () => {
  env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  try {
    expect((await pro("paid@mac.ca")).pro).toBe(false);

    expect((await signedWebhook(subEvent("created", "active", 100), "whsec_test")).status).toBe(200);
    expect((await signedWebhook(subEvent("created", "active", 100), "whsec_test")).status).toBe(200); // repeat
    const rows = await env.DB.prepare("SELECT COUNT(*) AS n FROM entitlements WHERE email = 'paid@mac.ca'").first();
    expect(rows.n).toBe(1);
    const after = await pro("paid@mac.ca");
    expect(after.pro).toBe(true);
    expect(after.plan).toBe("monthly");
    expect(after.expires_at).toBe(inAMonth * 1000);

    // An older event arriving late must not undo a newer one.
    await signedWebhook(subEvent("deleted", "canceled", 300), "whsec_test");
    await signedWebhook(subEvent("updated", "active", 200), "whsec_test");
    expect((await pro("paid@mac.ca")).pro).toBe(false);

    const started = await env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE name = 'subscription_started'").first();
    const ended = await env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE name = 'subscription_ended'").first();
    expect([started.n, ended.n]).toEqual([1, 1]);
  } finally {
    delete env.STRIPE_WEBHOOK_SECRET;
  }
});

test("webhook rejects bad, missing, and stale signatures; unpaid subscriptions grant nothing", async () => {
  env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  try {
    const evil = subEvent("created", "active", 100, "evil@mac.ca", "sub_2");
    expect((await signedWebhook(evil, "wrong_secret")).status).toBe(400);
    expect((await call("/webhooks/stripe", { method: "POST", body: JSON.stringify(evil) })).status).toBe(400);
    expect((await signedWebhook(evil, "whsec_test", Math.floor(Date.now() / 1000) - 3600)).status).toBe(400);
    expect((await pro("evil@mac.ca")).pro).toBe(false);

    await signedWebhook(subEvent("created", "incomplete", 100, "late@mac.ca", "sub_3"), "whsec_test");
    expect((await pro("late@mac.ca")).pro).toBe(false);
  } finally {
    delete env.STRIPE_WEBHOOK_SECRET;
  }
});

test("profile is saved, read back with plan status, and a repeat updates it", async () => {
  const answers = { email: "Ada@Mac.ca", name: "Ada", school: "McMaster", program: "Engineering", level: "2nd year", jobs: ["Software", "Data"], struggles: ["a"], heard_from: "TikTok" };
  expect((await post("/profile", answers)).status).toBe(200);
  expect((await post("/profile", { ...answers, term: "Winter 2027" })).status).toBe(200);
  const me = await (await call("/me?email=ada@mac.ca")).json();
  expect(me.profile.name).toBe("Ada");
  expect(me.profile.jobs).toEqual(["Software", "Data"]);
  expect(me.profile.term).toBe("Winter 2027");
  expect(me.pro).toBe(false);
  expect((await post("/profile", { name: "No email" })).status).toBe(400);
});

test("profile, me and billing portal refuse to run in production", async () => {
  const prod = { ...env, APP_ENV: "production" };
  const get = (path: string, init?: RequestInit) => worker.fetch(new Request(`http://test${path}`, init) as any, prod, { waitUntil() {} } as any);
  expect((await get("/me?email=ada@mac.ca")).status).toBe(403);
  expect((await get("/profile", { method: "POST", body: JSON.stringify({ email: "a@b.ca" }) })).status).toBe(403);
});

test("admin overview needs the key, then returns the numbers", async () => {
  env.ADMIN_KEY = "test-admin-key";
  expect((await call("/admin/overview")).status).toBe(401);
  expect((await call("/admin/overview", { headers: { Authorization: "Bearer wrong" } })).status).toBe(401);
  const res = await call("/admin/overview", { headers: { Authorization: "Bearer test-admin-key" } });
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.totals.students).toBeGreaterThanOrEqual(1);
  expect(data.breakdowns.schools[0].label).toBe("McMaster");
  expect(data.recent[0].email).toBe("ada@mac.ca");
  delete env.ADMIN_KEY;
  expect((await call("/admin/overview", { headers: { Authorization: "Bearer test-admin-key" } })).status).toBe(503);
});

// A tiny real PDF with one page of text, built by hand so the test needs no files.
function makePdf(lines: string[]): Uint8Array {
  const stream = "BT /F1 11 Tf 40 760 Td 14 TL " + lines.map((l) => `(${l.replace(/[()\\]/g, "")}) Tj T*`).join(" ") + " ET";
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(out);
}

const RESUME_LINES = [
  "Alan Smith alan@school.ca",
  "Education University of Calgary Biomedical Engineering 2027",
  "Experience Research Assistant Led a clinical lab study with 40 patients and improved data entry time by 30%",
  "Built a SQL dashboard in Python and Excel for the lab team, presented results to 25 staff",
  "Projects Designed a low cost patient monitor, organized a team of 5 students",
  "Skills Python SQL Excel research analysis",
];

const upload = (email: string, bytes: Uint8Array, name = "alan.pdf") => {
  const form = new FormData();
  form.set("email", email);
  form.set("file", new File([bytes], name, { type: "application/pdf" }));
  return call("/resume", { method: "POST", body: form });
};

test("resume: upload, read, rate, replace and delete", async () => {
  const email = "alan@school.ca";
  await post("/profile", { email, name: "Alan", jobs: ["Healthcare / Clinical", "Data Analytics"] });

  const up = await upload(email, makePdf(RESUME_LINES));
  expect(up.status).toBe(201);
  expect((await up.json() as any).resume.filename).toBe("alan.pdf");

  const me = await (await call(`/me?email=${email}`)).json() as any;
  expect(me.resume.filename).toBe("alan.pdf");

  const rated = await (await post("/resume/rate", { email })).json() as any;
  expect(rated.rating.score).toBeGreaterThan(30);
  expect(rated.rating.roles.length).toBe(2);
  expect(rated.rating.gaps.length).toBeLessThanOrEqual(3);

  // A second upload replaces the first: still one file in storage.
  await upload(email, makePdf(RESUME_LINES), "alan2.pdf");
  expect(((await (await call(`/resume?email=${email}`)).json()) as any).resume.filename).toBe("alan2.pdf");
  expect((await env.RESUMES.list()).objects.length).toBe(1);

  expect((await call(`/resume?email=${email}`, { method: "DELETE" })).status).toBe(200);
  expect(((await (await call(`/resume?email=${email}`)).json()) as any).resume).toBeNull();
  expect((await env.RESUMES.list()).objects.length).toBe(0);
  expect((await post("/resume/rate", { email })).status).toBe(404);
});

test("resume: rejects files that are not a readable PDF", async () => {
  expect((await upload("a@school.ca", new TextEncoder().encode("hello, not a pdf"))).status).toBe(415);
  expect((await upload("a@school.ca", makePdf(["Hi"]))).status).toBe(422);
  expect((await upload("not-an-email", makePdf(RESUME_LINES))).status).toBe(400);
});
