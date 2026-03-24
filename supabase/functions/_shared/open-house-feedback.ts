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
  reminder_response: string | null;
  preferred_format_needed: boolean | null;
  preferred_format: string | null;
  future_event_interest: string | null;
  attendance_improvement: string | null;
  wants_staff_followup: boolean | null;
  wants_clinic_tour: boolean | null;
  discussion_value: number | null;
  made_staff_connections: string | null;
  staff_shoutouts: string | null;
  understands_mission: string | null;
  further_engagement: string | null;
  giving_interest: string | null;
  met_outreach: boolean;
  met_clinical: boolean;
  met_art_therapy: boolean;
  met_philanthropy: boolean;
  met_alum: boolean;
  additional_feedback: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const NO_SHOW_REASON_FIELDS = [
  "reason_scheduling",
  "reason_unexpected",
  "reason_forgot",
  "reason_access",
  "reason_interest",
  "reason_transport",
] as const;

const MET_FIELDS = [
  "met_outreach",
  "met_clinical",
  "met_art_therapy",
  "met_philanthropy",
  "met_alum",
] as const;

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
  return {
    ok: false,
    error: `${key} must be boolean${required ? " and is required" : ""}.`,
  };
}

function readNullableBooleanField(
  body: Record<string, unknown>,
  key: string,
  required = false,
): { ok: true; value: boolean | null } | { ok: false; error: string } {
  const raw = body[key];
  if (typeof raw === "boolean") {
    return { ok: true, value: raw };
  }
  if (raw === undefined || raw === null) {
    if (required) {
      return { ok: false, error: `${key} is required.` };
    }
    return { ok: true, value: null };
  }
  return { ok: false, error: `${key} must be boolean when provided.` };
}

function readEnumField(
  body: Record<string, unknown>,
  key: string,
  allowed: string[],
  required = false,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const value = normalizeOptionalString(body[key]);
  if (!value) {
    if (required) return { ok: false, error: `${key} is required.` };
    return { ok: true, value: null };
  }
  if (!allowed.includes(value)) {
    return { ok: false, error: `${key} must be one of: ${allowed.join(", ")}.` };
  }
  return { ok: true, value };
}

function readIntRange(
  body: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
  required = false,
): { ok: true; value: number | null } | { ok: false; error: string } {
  const raw = body[key];
  if (raw === undefined || raw === null) {
    if (required) return { ok: false, error: `${key} is required.` };
    return { ok: true, value: null };
  }
  if (!Number.isInteger(raw)) {
    return { ok: false, error: `${key} must be an integer from ${min} through ${max}.` };
  }
  const value = Number(raw);
  if (value < min || value > max) {
    return { ok: false, error: `${key} must be an integer from ${min} through ${max}.` };
  }
  return { ok: true, value };
}

function validatePayload(body: Record<string, unknown>):
  | { ok: true; value: FeedbackRow }
  | { ok: false; error: string } {
  const eventId = normalizeOptionalString(body.event_id);
  if (!eventId) {
    return { ok: false, error: "event_id is required." };
  }

  const attendedResult = readBooleanField(body, "attended", true);
  if (!attendedResult.ok) return { ok: false, error: attendedResult.error };
  const attended = attendedResult.value;

  const rsvpIdRaw = body.rsvp_id;
  if (!(rsvpIdRaw === undefined || rsvpIdRaw === null || typeof rsvpIdRaw === "string")) {
    return { ok: false, error: "rsvp_id must be a string when provided." };
  }
  const rsvpId = normalizeOptionalString(rsvpIdRaw);
  if (rsvpId && !UUID_RE.test(rsvpId)) {
    return { ok: false, error: "rsvp_id must be a valid UUID when provided." };
  }

  const row: FeedbackRow = {
    event_id: eventId,
    rsvp_id: rsvpId,
    attended,
    reason_scheduling: false,
    reason_unexpected: false,
    reason_forgot: false,
    reason_access: false,
    reason_interest: false,
    reason_transport: false,
    reason_other: null,
    rating: null,
    comments: null,
    reminder_response: null,
    preferred_format_needed: null,
    preferred_format: null,
    future_event_interest: null,
    attendance_improvement: null,
    wants_staff_followup: null,
    wants_clinic_tour: null,
    discussion_value: null,
    made_staff_connections: null,
    staff_shoutouts: null,
    understands_mission: null,
    further_engagement: null,
    giving_interest: null,
    met_outreach: false,
    met_clinical: false,
    met_art_therapy: false,
    met_philanthropy: false,
    met_alum: false,
    additional_feedback: normalizeOptionalString(body.additional_feedback),
  };

  const rating = readIntRange(body, "rating", 1, 5, false);
  if (!rating.ok) return { ok: false, error: rating.error };
  row.rating = rating.value;

  const commentsRaw = body.comments;
  if (!(commentsRaw === undefined || commentsRaw === null || typeof commentsRaw === "string")) {
    return { ok: false, error: "comments must be a string when provided." };
  }
  row.comments = normalizeOptionalString(commentsRaw);

  if (attended) {
    const discussionValue = readIntRange(body, "discussion_value", 1, 5, true);
    if (!discussionValue.ok) return { ok: false, error: discussionValue.error };
    row.discussion_value = discussionValue.value;

    const madeStaffConnections = readEnumField(
      body,
      "made_staff_connections",
      ["yes", "no", "not_sure"],
      true,
    );
    if (!madeStaffConnections.ok) return { ok: false, error: madeStaffConnections.error };
    row.made_staff_connections = madeStaffConnections.value;

    row.staff_shoutouts = normalizeOptionalString(body.staff_shoutouts);

    const understandsMission = readEnumField(
      body,
      "understands_mission",
      ["yes", "somewhat", "no"],
      true,
    );
    if (!understandsMission.ok) return { ok: false, error: understandsMission.error };
    row.understands_mission = understandsMission.value;

    const furtherEngagement = readEnumField(
      body,
      "further_engagement",
      ["learn_more_services", "future_events", "no"],
      true,
    );
    if (!furtherEngagement.ok) return { ok: false, error: furtherEngagement.error };
    row.further_engagement = furtherEngagement.value;

    const givingInterest = readEnumField(
      body,
      "giving_interest",
      ["yes_more_info", "maybe_future", "no"],
      true,
    );
    if (!givingInterest.ok) return { ok: false, error: givingInterest.error };
    row.giving_interest = givingInterest.value;

    let metSelected = false;
    for (const field of MET_FIELDS) {
      const result = readBooleanField(body, field, false);
      if (!result.ok) return { ok: false, error: result.error };
      row[field] = result.value;
      if (result.value) metSelected = true;
    }

    if (!metSelected) {
      return { ok: false, error: "At least one met_* selection is required." };
    }
  } else {
    let reasonSelected = false;
    for (const field of NO_SHOW_REASON_FIELDS) {
      const result = readBooleanField(body, field, false);
      if (!result.ok) return { ok: false, error: result.error };
      row[field] = result.value;
      if (result.value) reasonSelected = true;
    }

    const reasonOtherRaw = body.reason_other;
    if (!(reasonOtherRaw === undefined || reasonOtherRaw === null || typeof reasonOtherRaw === "string")) {
      return { ok: false, error: "reason_other must be a string when provided." };
    }
    row.reason_other = normalizeOptionalString(reasonOtherRaw);
    if (!reasonSelected && !row.reason_other) {
      return { ok: false, error: "At least one no-show reason or reason_other is required." };
    }

    const reminderResponse = readEnumField(
      body,
      "reminder_response",
      ["helpful", "received_not_enough", "dont_remember"],
      true,
    );
    if (!reminderResponse.ok) return { ok: false, error: reminderResponse.error };
    row.reminder_response = reminderResponse.value;

    const preferredFormatNeeded = readNullableBooleanField(
      body,
      "preferred_format_needed",
      true,
    );
    if (!preferredFormatNeeded.ok) return { ok: false, error: preferredFormatNeeded.error };
    row.preferred_format_needed = preferredFormatNeeded.value;

    const preferredFormatRaw = body.preferred_format;
    if (!(preferredFormatRaw === undefined || preferredFormatRaw === null || typeof preferredFormatRaw === "string")) {
      return { ok: false, error: "preferred_format must be a string when provided." };
    }
    row.preferred_format = normalizeOptionalString(preferredFormatRaw);
    if (row.preferred_format_needed && !row.preferred_format) {
      return { ok: false, error: "preferred_format is required when preferred_format_needed is true." };
    }

    const futureEventInterest = readEnumField(
      body,
      "future_event_interest",
      ["yes", "no", "maybe"],
      true,
    );
    if (!futureEventInterest.ok) return { ok: false, error: futureEventInterest.error };
    row.future_event_interest = futureEventInterest.value;

    row.attendance_improvement = normalizeOptionalString(body.attendance_improvement);
    if (!row.attendance_improvement) {
      return { ok: false, error: "attendance_improvement is required." };
    }

    const wantsStaffFollowup = readNullableBooleanField(
      body,
      "wants_staff_followup",
      true,
    );
    if (!wantsStaffFollowup.ok) return { ok: false, error: wantsStaffFollowup.error };
    row.wants_staff_followup = wantsStaffFollowup.value;

    const wantsClinicTour = readNullableBooleanField(
      body,
      "wants_clinic_tour",
      true,
    );
    if (!wantsClinicTour.ok) return { ok: false, error: wantsClinicTour.error };
    row.wants_clinic_tour = wantsClinicTour.value;
  }

  return { ok: true, value: row };
}

export async function handleOpenHouseFeedback(req: Request) {
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
}
