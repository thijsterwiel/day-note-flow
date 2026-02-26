import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Create client with user's token for RLS
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!supabaseAnonKey) throw new Error("Missing anon key");

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service role client for inserts
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user from token
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch session (verifies ownership via RLS)
    const { data: session, error: sessionError } = await supabaseUser
      .from("sessions")
      .select("*")
      .eq("id", session_id)
      .maybeSingle();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch transcript chunks
    const { data: chunks, error: chunksError } = await supabaseUser
      .from("transcript_chunks")
      .select("*")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true });

    if (chunksError || !chunks || chunks.length === 0) {
      return new Response(JSON.stringify({ error: "No transcript chunks found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transcript = chunks.map((c: any) => `[${c.start_time}] ${c.text}`).join("\n\n");

    // Detect language (from session or chunks)
    const sessionLanguage = session.language || chunks[0]?.language || "en-US";
    const isNederlands = sessionLanguage.startsWith("nl");

    const systemPrompt = isNederlands
      ? `Je bent een gespreks-samenvatter. Analyseer het transcript en haal gestructureerde informatie eruit. Antwoord ALLEEN door de beschikbare tool te gebruiken.`
      : `You are a meeting/conversation summarizer. Analyze the transcript and extract structured information. Respond ONLY by calling the provided tool.`;

    const userPrompt = isNederlands
      ? `Vat dit transcript samen van sessie "${session.title}":\n\n${transcript}`
      : `Summarize this transcript from session "${session.title}":\n\n${transcript}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
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
                  summaryBullets: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-7 key bullet points summarizing the conversation",
                  },
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
                    description: "Action items identified in the conversation",
                  },
                  agendaSuggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        datetime: { type: "string", description: "ISO datetime or null" },
                        durationMinutes: { type: "number" },
                        context: { type: "string" },
                      },
                      required: ["title"],
                    },
                    description: "Follow-up meetings or agenda suggestions",
                  },
                  reminders: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        triggerDateTime: { type: "string", description: "ISO datetime or null" },
                      },
                      required: ["text"],
                    },
                    description: "Reminders extracted from the conversation",
                  },
                  importantFactsToRemember: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key facts, numbers, or decisions to remember",
                  },
                  openQuestions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Unresolved questions from the conversation",
                  },
                },
                required: [
                  "summaryBullets",
                  "actionItems",
                  "agendaSuggestions",
                  "reminders",
                  "importantFactsToRemember",
                  "openQuestions",
                ],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_summary" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      console.error("AI gateway error:", status, text);

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "AI returned unexpected format" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const summaryJson = JSON.parse(toolCall.function.arguments);
    const now = new Date().toISOString();

    // Insert summary
    const { data: summaryRow, error: sumError } = await supabaseAdmin
      .from("summaries")
      .insert({
        session_id,
        user_id: user.id,
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
      return new Response(JSON.stringify({ error: "Failed to save summary" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert action items, agenda items, reminders, important facts in parallel
    const summaryId = summaryRow.id;

    const promises: Promise<any>[] = [];

    if (summaryJson.actionItems?.length) {
      promises.push(
        supabaseAdmin.from("action_items").insert(
          summaryJson.actionItems.map((item: any) => ({
            summary_id: summaryId,
            task: item.task,
            priority: item.priority || "med",
            due_date: item.dueDate || null,
            context: item.context || null,
          }))
        ).select()
      );
    }

    if (summaryJson.agendaSuggestions?.length) {
      promises.push(
        supabaseAdmin.from("agenda_items").insert(
          summaryJson.agendaSuggestions.map((item: any) => ({
            summary_id: summaryId,
            title: item.title,
            datetime: item.datetime || null,
            duration_minutes: item.durationMinutes || null,
            notes: item.context || null,
          }))
        ).select()
      );
    }

    if (summaryJson.reminders?.length) {
      promises.push(
        supabaseAdmin.from("reminders").insert(
          summaryJson.reminders.map((item: any) => ({
            summary_id: summaryId,
            text: item.text,
            trigger_datetime: item.triggerDateTime || null,
          }))
        ).select()
      );
    }

    if (summaryJson.importantFactsToRemember?.length) {
      promises.push(
        supabaseAdmin.from("important_facts").insert(
          summaryJson.importantFactsToRemember.map((fact: string) => ({
            summary_id: summaryId,
            fact,
          }))
        ).select()
      );
    }

    await Promise.all(promises);

    return new Response(JSON.stringify({ success: true, summary_id: summaryId, raw_json: summaryJson }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Summarize error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
