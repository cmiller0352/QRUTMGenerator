import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, code: "METHOD_NOT_ALLOWED", error: "POST required." }, 405);
  }

  try {
    const body = await req.json().catch(() => null);
    const rsvpId = typeof body?.rsvp_id === "string" ? body.rsvp_id.trim() : "";

    if (!rsvpId) {
      return json({
        ok: false,
        code: "VALIDATION",
        error: "rsvp_id is required.",
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json(
        {
          ok: false,
          code: "CONFIG_ERROR",
          error: "Missing Supabase service configuration.",
        },
        500
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error, count } = await admin
      .from("checkins")
      .delete({ count: "exact" })
      .eq("rsvp_id", rsvpId);

    if (error) {
      return json({
        ok: false,
        code: error.code || "DB_ERROR",
        error: error.message || "Failed to undo check-in.",
      });
    }

    return json({ ok: true, deleted: Number(count) || 0 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return json({ ok: false, code: "UNEXPECTED", error: msg }, 500);
  }
});

