import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

type JsonErrorCode = "VALIDATION" | "SERVER_ERROR" | "METHOD_NOT_ALLOWED";

type FeedbackRow = {
  event_id: string;
  rsvp_id: string | null;
  attended: boolean;
  reason_scheduling: boolean;
  reason_unexpected: boolean;
  reason_forgot: boolean;
  reason_access: boolean;
  reason_interest: boolean;
  reason_transport: boolean;
  reason_other: string | null;
  rating: number | null;
  comments: string | null;
};

const NO_SHOW_REASON_FIELDS = [
  "reason_scheduling",
  "reason_unexpected",
  "reason_forgot",
  "reason_access",
  "reason_interest",
  "reason_transport",
] as const;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function errorResponse(code: JsonErrorCode, error: string, status: number) {
  return json({ ok: false, code, error }, status);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readBooleanField(
  body: Record<string, unknown>,
  key: string,
  required = false,
): { ok: true; value: boolean } | { ok: false; error: string } {
  const raw = body[key];
  if (typeof raw === "boolean") {
    return { ok: true, value: raw };
  }
  if (raw === undefined && !required) {
    return { ok: true, value: false };
  }
  return { ok: false, error: `${key} must be boolean${required ? " and is required" : ""}.` };
}

function validatePayload(body: Record<string, unknown>):
  | { ok: true; value: FeedbackRow }
  | { ok: false; error: string } {
  const eventId = normalizeOptionalString(body.event_id);
  if (!eventId) {
    return { ok: false, error: "event_id is required." };
  }

  const attendedResult = readBooleanField(body, "attended", true);
  if (!attendedResult.ok) {
    return { ok: false, error: attendedResult.error };
  }
  const attended = attendedResult.value;

  const rsvpIdRaw = body.rsvp_id;
  if (!(rsvpIdRaw === undefined || rsvpIdRaw === null || typeof rsvpIdRaw === "string")) {
    return { ok: false, error: "rsvp_id must be a string when provided." };
  }
  const rsvpId = normalizeOptionalString(rsvpIdRaw);
  if (rsvpId && !UUID_RE.test(rsvpId)) {
    return { ok: false, error: "rsvp_id must be a valid UUID when provided." };
  }

  const reasonFlags = {
    reason_scheduling: false,
    reason_unexpected: false,
    reason_forgot: false,
    reason_access: false,
    reason_interest: false,
    reason_transport: false,
  };

  if (!attended) {
    for (const field of NO_SHOW_REASON_FIELDS) {
      const result = readBooleanField(body, field, false);
      if (!result.ok) {
        return { ok: false, error: result.error };
      }
      reasonFlags[field] = result.value;
    }
  }

  const reasonOtherRaw = body.reason_other;
  if (!(reasonOtherRaw === undefined || reasonOtherRaw === null || typeof reasonOtherRaw === "string")) {
    return { ok: false, error: "reason_other must be a string when provided." };
  }
  const reasonOther = attended ? null : normalizeOptionalString(reasonOtherRaw);

  let rating: number | null = null;
  if (attended) {
    if (!(body.rating === undefined || body.rating === null || Number.isInteger(body.rating))) {
      return { ok: false, error: "rating must be an integer from 1 through 5 when provided." };
    }
    if (body.rating != null) {
      const ratingValue = Number(body.rating);
      if (ratingValue < 1 || ratingValue > 5) {
        return { ok: false, error: "rating must be an integer from 1 through 5 when provided." };
      }
      rating = ratingValue;
    }
  }

  const commentsRaw = body.comments;
  if (!(commentsRaw === undefined || commentsRaw === null || typeof commentsRaw === "string")) {
    return { ok: false, error: "comments must be a string when provided." };
  }
  const comments = attended ? normalizeOptionalString(commentsRaw) : null;

  return {
    ok: true,
    value: {
      event_id: eventId,
      rsvp_id: rsvpId,
      attended,
      reason_scheduling: reasonFlags.reason_scheduling,
      reason_unexpected: reasonFlags.reason_unexpected,
      reason_forgot: reasonFlags.reason_forgot,
      reason_access: reasonFlags.reason_access,
      reason_interest: reasonFlags.reason_interest,
      reason_transport: reasonFlags.reason_transport,
      reason_other: reasonOther,
      rating,
      comments,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "POST required.", 405);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!isPlainObject(body)) {
      return errorResponse("VALIDATION", "Request body must be valid JSON.", 400);
    }

    const validated = validatePayload(body);
    if (!validated.ok) {
      return errorResponse("VALIDATION", validated.error, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(
        "SERVER_ERROR",
        "Missing Supabase service configuration.",
        500,
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await admin.from("event_feedback").insert(validated.value);
    if (error) {
      return errorResponse(
        "SERVER_ERROR",
        error.message || "Failed to save feedback.",
        500,
      );
    }

    return json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return errorResponse("SERVER_ERROR", message, 500);
  }
});
