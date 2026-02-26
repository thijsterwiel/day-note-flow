import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { assertExists } from "https://deno.land/std@0.224.0/assert/assert_exists.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://kncfxmooqnjdawrrrcaq.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuY2Z4bW9vcW5qZGF3cnJyY2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NDY0MzYsImV4cCI6MjA4NzAyMjQzNn0.XMVngWQcxo-xP4gnZtxiPQJSBMMEol25K_0H_531690";

const MOBILE_API = `${SUPABASE_URL}/functions/v1/mobile-api`;

// Helper: create a test user session token + API token via the mobile-api /tokens endpoint
// Since we can't easily get a dnk_ token in tests without a logged-in user,
// we'll test the summarize-session function directly which uses session auth.

const SUMMARIZE_URL = `${SUPABASE_URL}/functions/v1/summarize-session`;

Deno.test("summarize-session: rejects missing session_id", async () => {
  const res = await fetch(SUMMARIZE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });

  const body = await res.json();
  assertEquals(res.status, 400);
  assertEquals(body.error, "session_id is required");
});

Deno.test("summarize-session: rejects unauthenticated request", async () => {
  const res = await fetch(SUMMARIZE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Using anon key as auth - should fail as it's not a valid user token
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ session_id: "00000000-0000-0000-0000-000000000000" }),
  });

  const body = await res.json();
  // Should be 401 (unauthorized) since anon key isn't a user JWT
  assert(res.status === 401 || res.status === 404, `Expected 401 or 404, got ${res.status}`);
  await res.text().catch(() => {}); // consume body
});

Deno.test("mobile-api: rejects request without API token", async () => {
  const res = await fetch(`${MOBILE_API}/sessions`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  const body = await res.json();
  assertEquals(res.status, 401);
  assertExists(body.error);
});

Deno.test("mobile-api: rejects invalid token format for session creation", async () => {
  const res = await fetch(`${MOBILE_API}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer invalid_token",
    },
    body: JSON.stringify({ title: "Test NL sessie", language: "nl-NL" }),
  });

  const body = await res.json();
  assertEquals(res.status, 401);
  assertExists(body.error);
});

Deno.test("mobile-api: OPTIONS returns CORS headers", async () => {
  const res = await fetch(`${MOBILE_API}/sessions`, {
    method: "OPTIONS",
  });

  assertEquals(res.status, 200);
  const allow = res.headers.get("access-control-allow-origin");
  assertEquals(allow, "*");
  await res.text(); // consume body
});

Deno.test("mobile-api: returns 404 for unknown routes", async () => {
  const res = await fetch(`${MOBILE_API}/nonexistent`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer dnk_0000000000000000000000000000000000000000000000000000000000000000",
    },
  });

  const body = await res.json();
  assertEquals(res.status, 404);
  assertEquals(body.error, "Not found");
});

Deno.test("summarize-session: CORS preflight works", async () => {
  const res = await fetch(SUMMARIZE_URL, {
    method: "OPTIONS",
  });

  assertEquals(res.status, 200);
  const allow = res.headers.get("access-control-allow-origin");
  assertEquals(allow, "*");
  await res.text();
});
