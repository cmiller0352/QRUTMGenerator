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

function normalizeIds(body: any): { ok: true; ids: string[] } | { ok: false; error: string } {
  const ids = new Set<string>();

  if (typeof body?.rsvp_id === "string") {
    const trimmed = body.rsvp_id.trim();
    if (trimmed) ids.add(trimmed);
  }

  if (Array.isArray(body?.rsvp_ids)) {
    for (const value of body.rsvp_ids) {
      if (typeof value !== "string") continue;
      const trimmed = value.trim();
      if (trimmed) ids.add(trimmed);
    }
  }

  const normalized = Array.from(ids);
  if (!normalized.length) {
    return {
      ok: false,
      error: "At least one valid RSVP ID is required.",
    };
  }

  return { ok: true, ids: normalized };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, code: "METHOD_NOT_ALLOWED", error: "POST required." }, 405);
  }

  try {
    const body = await req.json().catch(() => null);
    const normalized = normalizeIds(body);

    if (!normalized.ok) {
      return json({
        ok: false,
        code: "VALIDATION",
        error: normalized.error,
      }, 400);
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

    const rows = normalized.ids.map((rsvp_id) => ({ rsvp_id }));
    const { error } = await admin
      .from("checkins")
      .upsert(rows, { onConflict: "rsvp_id" });

    if (error) {
      return json({
        ok: false,
        code: error.code || "DB_ERROR",
        error: error.message || "Failed to persist check-in.",
      });
    }

    return json({ ok: true, checked_in_count: normalized.ids.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return json({ ok: false, code: "UNEXPECTED", error: msg }, 500);
  }
});
