// Runs the real API code against a local copy of the database. No network needed.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { getPlatformProxy } from "wrangler";
import worker from "../src/index";

let env: any;
let dispose: () => Promise<void>;

beforeAll(async () => {
  const proxy = await getPlatformProxy({ configPath: "wrangler.jsonc", persist: false });
  env = proxy.env;
  dispose = proxy.dispose;
  const sql = await Bun.file("migrations/0001_waitlist.sql").text();
  await env.DB.exec(sql.replace(/--.*$/gm, "").replace(/\s+/g, " "));
});

afterAll(async () => {
  await dispose();
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
  expect((await post("/events", { name: "hack" })).status).toBe(400);
});

test("unknown route is 404", async () => {
  expect((await call("/nope")).status).toBe(404);
});
