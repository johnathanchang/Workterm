// apps/api/src/index.ts: the whole API as one fetch handler. No router framework.

interface Env {
  DB: D1Database;
  APP_ENV: string;
  WEB_ORIGIN: string;
}

const MAX_BODY_BYTES = 2_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_EVENTS = new Set(["page_view", "waitlist_view", "waitlist_signup_click"]);

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
