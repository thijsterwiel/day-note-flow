import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---- Rate limiting (in-memory, per-instance) ----
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= maxPerMinute) return false;
  entry.count++;
  return true;
}

// ---- Token hashing ----
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "dnk_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---- Auth helpers ----
async function authenticateApiToken(
  req: Request,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<{ userId: string; tokenId: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer dnk_")) {
    return json({ error: "Invalid API token format" }, 401);
  }

  const rawToken = authHeader.replace("Bearer ", "");
  const hash = await hashToken(rawToken);

  const { data: token, error } = await supabaseAdmin
    .from("api_tokens")
    .select("id, user_id, revoked_at")
    .eq("token_hash", hash)
    .maybeSingle();

  if (error || !token) return json({ error: "Invalid API token" }, 401);
  if (token.revoked_at) return json({ error: "Token has been revoked" }, 401);

  // Update last_used_at (fire and forget)
  supabaseAdmin
    .from("api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", token.id)
    .then(() => {});

  return { userId: token.user_id, tokenId: token.id };
}

async function authenticateSession(
  req: Request,
  supabaseUrl: string,
  anonKey: string
): Promise<{ userId: string; supabaseUser: ReturnType<typeof createClient> } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ey")) {
    return json({ error: "Missing authorization" }, 401);
  }

  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabaseUser.auth.getUser();
  if (error || !user) return json({ error: "Unauthorized" }, 401);
  return { userId: user.id, supabaseUser };
}

// ---- Route matching ----
function matchRoute(
  method: string,
  pathname: string,
  targetMethod: string,
  pattern: string
): Record<string, string> | null {
  if (method !== targetMethod) return null;
  const patternParts = pattern.split("/");
  const pathParts = pathname.split("/");
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    // Strip the function prefix: /mobile-api/tokens -> /tokens
    const pathname = url.pathname.replace(/^\/mobile-api/, "") || "/";
    const method = req.method;

    // ===================== TOKEN MANAGEMENT (requires session auth) =====================

    // POST /tokens — create token
    if (matchRoute(method, pathname, "POST", "/tokens")) {
      const auth = await authenticateSession(req, supabaseUrl, anonKey);
      if (auth instanceof Response) return auth;

      if (!checkRateLimit(`tokens:${auth.userId}`, 10)) {
        return json({ error: "Rate limit exceeded" }, 429);
      }

      const { name } = await req.json();
      if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
        return json({ error: "name is required (max 100 chars)" }, 400);
      }

      const rawToken = generateToken();
      const hash = await hashToken(rawToken);

      const { data: row, error } = await supabaseAdmin
        .from("api_tokens")
        .insert({ user_id: auth.userId, name: name.trim(), token_hash: hash })
        .select("id, name, created_at")
        .single();

      if (error) {
        console.error("Token create error:", error);
        return json({ error: "Failed to create token" }, 500);
      }

      return json({ token: rawToken, tokenId: row.id, name: row.name, created_at: row.created_at });
    }

    // GET /tokens — list tokens
    if (matchRoute(method, pathname, "GET", "/tokens")) {
      const auth = await authenticateSession(req, supabaseUrl, anonKey);
      if (auth instanceof Response) return auth;

      const { data, error } = await supabaseAdmin
        .from("api_tokens")
        .select("id, name, created_at, last_used_at, revoked_at")
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false });

      if (error) return json({ error: "Failed to fetch tokens" }, 500);
      return json({ tokens: data });
    }

    // DELETE /tokens/:id — revoke token
    let params = matchRoute(method, pathname, "DELETE", "/tokens/:id");
    if (params) {
      const auth = await authenticateSession(req, supabaseUrl, anonKey);
      if (auth instanceof Response) return auth;

      const { error } = await supabaseAdmin
        .from("api_tokens")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", params.id)
        .eq("user_id", auth.userId);

      if (error) return json({ error: "Failed to revoke token" }, 500);
      return json({ success: true });
    }

    // ===================== MOBILE SESSIONS (requires API token auth) =====================

    // GET /sessions — list recent sessions with chunk counts
    if (matchRoute(method, pathname, "GET", "/sessions")) {
      const auth = await authenticateApiToken(req, supabaseAdmin);
      if (auth instanceof Response) return auth;

      const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
      const offset = parseInt(url.searchParams.get("offset") || "0");

      const { data: sessions, error } = await supabaseAdmin
        .from("sessions")
        .select("id, title, start_time, end_time, created_at")
        .eq("user_id", auth.userId)
        .order("start_time", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) return json({ error: "Failed to fetch sessions" }, 500);

      // Fetch chunk counts for each session
      const sessionIds = (sessions || []).map((s: { id: string }) => s.id);
      let chunkCounts: Record<string, number> = {};

      if (sessionIds.length > 0) {
        const { data: chunks } = await supabaseAdmin
          .from("transcript_chunks")
          .select("session_id")
          .in("session_id", sessionIds);

        if (chunks) {
          for (const c of chunks) {
            chunkCounts[c.session_id] = (chunkCounts[c.session_id] || 0) + 1;
          }
        }
      }

      const enriched = (sessions || []).map((s: { id: string; title: string; start_time: string; end_time: string | null; created_at: string }) => ({
        ...s,
        chunk_count: chunkCounts[s.id] || 0,
        has_summary: false, // will enrich below
      }));

      // Check which sessions have summaries
      if (sessionIds.length > 0) {
        const { data: summaries } = await supabaseAdmin
          .from("summaries")
          .select("session_id")
          .in("session_id", sessionIds);

        const summarizedIds = new Set((summaries || []).map((s: { session_id: string }) => s.session_id));
        for (const s of enriched) {
          s.has_summary = summarizedIds.has(s.id);
        }
      }

      return json({ sessions: enriched });
    }

    // POST /sessions — create session
    if (matchRoute(method, pathname, "POST", "/sessions")) {
      const auth = await authenticateApiToken(req, supabaseAdmin);
      if (auth instanceof Response) return auth;

      if (!checkRateLimit(`sessions:${auth.userId}`, 30)) {
        return json({ error: "Rate limit exceeded" }, 429);
      }

      const body = await req.json();
      if (!body.title || typeof body.title !== "string" || body.title.length > 500) {
        return json({ error: "title is required (max 500 chars)" }, 400);
      }

      const { data: session, error } = await supabaseAdmin
        .from("sessions")
        .insert({
          user_id: auth.userId,
          title: body.title.trim(),
          start_time: body.start_time || new Date().toISOString(),
          language: body.language || "en-US",
        })
        .select()
        .single();

      if (error) {
        console.error("Session create error:", error);
        return json({ error: "Failed to create session" }, 500);
      }

      // Log ingest event
      await supabaseAdmin.from("ingest_events").insert({
        user_id: auth.userId,
        type: "session_created",
        payload_json: { session_id: session.id, title: session.title },
      });

      return json({ session });
    }

    // PATCH /sessions/:id — update session
    params = matchRoute(method, pathname, "PATCH", "/sessions/:id");
    if (params) {
      const auth = await authenticateApiToken(req, supabaseAdmin);
      if (auth instanceof Response) return auth;

      const body = await req.json();
      const update: Record<string, unknown> = {};
      if (body.end_time) update.end_time = body.end_time;
      if (body.title && typeof body.title === "string" && body.title.length <= 500) update.title = body.title.trim();

      if (Object.keys(update).length === 0) {
        return json({ error: "No valid fields to update" }, 400);
      }

      const { data: session, error } = await supabaseAdmin
        .from("sessions")
        .update(update)
        .eq("id", params.id)
        .eq("user_id", auth.userId)
        .select()
        .single();

      if (error) return json({ error: "Failed to update session" }, 500);
      return json({ session });
    }

    // POST /sessions/:id/chunks — ingest transcript chunk
    params = matchRoute(method, pathname, "POST", "/sessions/:id/chunks");
    if (params) {
      const auth = await authenticateApiToken(req, supabaseAdmin);
      if (auth instanceof Response) return auth;

      if (!checkRateLimit(`chunks:${auth.tokenId}`, 120)) {
        return json({ error: "Rate limit exceeded" }, 429);
      }
      if (!checkRateLimit(`chunks_user:${auth.userId}`, 300)) {
        return json({ error: "User rate limit exceeded" }, 429);
      }

      const sessionId = params.id;

      // Verify session belongs to user
      const { data: session } = await supabaseAdmin
        .from("sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("user_id", auth.userId)
        .maybeSingle();

      if (!session) return json({ error: "Session not found" }, 404);

      const body = await req.json();
      if (!body.text || typeof body.text !== "string") {
        return json({ error: "text is required" }, 400);
      }
      if (!body.start_time || !body.end_time) {
        return json({ error: "start_time and end_time are required" }, 400);
      }
      if (body.text.length > 10000) {
        return json({ error: "text too long (max 10000 chars)" }, 400);
      }

      // Deduplicate by chunkId
      if (body.chunkId) {
        const { data: existing } = await supabaseAdmin
          .from("transcript_chunks")
          .select("id")
          .eq("session_id", sessionId)
          .eq("id", body.chunkId)
          .maybeSingle();

        if (existing) {
          return json({ chunk: existing, deduplicated: true });
        }
      }

      const insertData: Record<string, unknown> = {
        session_id: sessionId,
        start_time: body.start_time,
        end_time: body.end_time,
        text: body.text,
        confidence: body.confidence ?? null,
      };
      if (body.chunkId) insertData.id = body.chunkId;

      const { data: chunk, error } = await supabaseAdmin
        .from("transcript_chunks")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        // Handle duplicate key (race condition)
        if (error.code === "23505") {
          return json({ chunk: { id: body.chunkId }, deduplicated: true });
        }
        console.error("Chunk insert error:", error);
        return json({ error: "Failed to insert chunk" }, 500);
      }

      // Log ingest event
      await supabaseAdmin.from("ingest_events").insert({
        user_id: auth.userId,
        type: "chunk_ingested",
        payload_json: { session_id: sessionId, chunk_id: chunk.id },
      });

      return json({ chunk, deduplicated: false });
    }

    // POST /sessions/:id/summarize — trigger AI summarization
    params = matchRoute(method, pathname, "POST", "/sessions/:id/summarize");
    if (params) {
      const auth = await authenticateApiToken(req, supabaseAdmin);
      if (auth instanceof Response) return auth;

      if (!checkRateLimit(`summarize:${auth.userId}`, 10)) {
        return json({ error: "Rate limit exceeded" }, 429);
      }

      const sessionId = params.id;

      // Verify session belongs to user
      const { data: session } = await supabaseAdmin
        .from("sessions")
        .select("id, title, start_time, end_time")
        .eq("id", sessionId)
        .eq("user_id", auth.userId)
        .maybeSingle();

      if (!session) return json({ error: "Session not found" }, 404);

      // Fetch transcript chunks
      const { data: chunks } = await supabaseAdmin
        .from("transcript_chunks")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (!chunks || chunks.length === 0) {
        return json({ error: "No transcript chunks found" }, 400);
      }

      const transcript = chunks.map((c: any) => `[${c.start_time}] ${c.text}`).join("\n\n");

      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a meeting/conversation summarizer. Analyze the transcript and extract structured information. Respond ONLY by calling the provided tool." },
            { role: "user", content: `Summarize this transcript from session "${session.title}":\n\n${transcript}` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "create_summary",
                description: "Create a structured summary of the transcript",
                parameters: {
                  type: "object",
                  properties: {
                    summaryBullets: { type: "array", items: { type: "string" }, description: "3-7 key bullet points" },
                    actionItems: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          task: { type: "string" },
                          dueDate: { type: "string", description: "ISO date or null" },
                          priority: { type: "string", enum: ["low", "med", "high"] },
                          context: { type: "string" },
                        },
                        required: ["task", "priority"],
                      },
                    },
                    agendaSuggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          datetime: { type: "string" },
                          durationMinutes: { type: "number" },
                          context: { type: "string" },
                        },
                        required: ["title"],
                      },
                    },
                    reminders: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          text: { type: "string" },
                          triggerDateTime: { type: "string" },
                        },
                        required: ["text"],
                      },
                    },
                    importantFactsToRemember: { type: "array", items: { type: "string" } },
                    openQuestions: { type: "array", items: { type: "string" } },
                  },
                  required: ["summaryBullets", "actionItems", "agendaSuggestions", "reminders", "importantFactsToRemember", "openQuestions"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "create_summary" } },
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) return json({ error: "AI rate limit exceeded. Try again shortly." }, 429);
        if (status === 402) return json({ error: "AI credits exhausted." }, 402);
        console.error("AI gateway error:", status, await aiResponse.text());
        return json({ error: "AI processing failed" }, 500);
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        console.error("No tool call in AI response:", JSON.stringify(aiData));
        return json({ error: "AI returned unexpected format" }, 500);
      }

      const summaryJson = JSON.parse(toolCall.function.arguments);
      const now = new Date().toISOString();

      const { data: summaryRow, error: sumError } = await supabaseAdmin
        .from("summaries")
        .insert({
          session_id: sessionId,
          user_id: auth.userId,
          scope: "session",
          start_time: session.start_time,
          end_time: session.end_time || now,
          model: "google/gemini-3-flash-preview",
          prompt_version: "v1",
          raw_json: summaryJson,
        })
        .select()
        .single();

      if (sumError) {
        console.error("Summary insert error:", sumError);
        return json({ error: "Failed to save summary" }, 500);
      }

      const summaryId = summaryRow.id;
      const inserts: Promise<any>[] = [];

      if (summaryJson.actionItems?.length) {
        inserts.push(supabaseAdmin.from("action_items").insert(
          summaryJson.actionItems.map((i: any) => ({
            summary_id: summaryId, task: i.task, priority: i.priority || "med",
            due_date: i.dueDate || null, context: i.context || null,
          }))
        ));
      }
      if (summaryJson.agendaSuggestions?.length) {
        inserts.push(supabaseAdmin.from("agenda_items").insert(
          summaryJson.agendaSuggestions.map((i: any) => ({
            summary_id: summaryId, title: i.title, datetime: i.datetime || null,
            duration_minutes: i.durationMinutes || null, notes: i.context || null,
          }))
        ));
      }
      if (summaryJson.reminders?.length) {
        inserts.push(supabaseAdmin.from("reminders").insert(
          summaryJson.reminders.map((i: any) => ({
            summary_id: summaryId, text: i.text, trigger_datetime: i.triggerDateTime || null,
          }))
        ));
      }
      if (summaryJson.importantFactsToRemember?.length) {
        inserts.push(supabaseAdmin.from("important_facts").insert(
          summaryJson.importantFactsToRemember.map((f: string) => ({ summary_id: summaryId, fact: f }))
        ));
      }

      await Promise.all(inserts);

      return json({ success: true, summary_id: summaryId, raw_json: summaryJson });
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    console.error("Mobile API error:", e);
    return json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500
    );
  }
});
