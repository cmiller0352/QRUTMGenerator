import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

type SessionSelection = {
  event_id: string;
  slot_id: string;
  label?: string | null;
};

type NormalizedAttendee = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  branch_of_service: string[];
  era_list: string[];
  era: string | null;
  attendee_id: string | null;
  attendee_index: number | null;
};

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-requested-with",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
    },
  });
}

function userError(
  origin: string | null,
  error: string,
  code?: string,
  status = 400,
  extra?: Record<string, unknown>,
) {
  return json({ ok: false, ...(code ? { code } : {}), ...(extra || {}), error }, status, origin);
}

function serverError(origin: string | null, error: string, code = "SERVER_ERROR") {
  return json({ ok: false, code, error }, 500, origin);
}

const ALLOWED_STATUS = new Set([
  "Veteran",
  "Active Duty",
  "Guard/Reserve",
  "Family Member/Caregiver",
  "Provider/Community Partner",
  "Other",
]);

const ALLOWED_ERA = new Set([
  "Pre 9/11",
  "Pre-9/11",
  "Post 9/11",
  "Post-9/11",
  "both",
]);

const ALLOWED_PREFERRED_CONTACT_SIGNUP = new Set(["Email", "Phone", "Text"]);

const ERA_OPTIONAL_STATUS = new Set([
  "Family Member/Caregiver",
  "Provider/Community Partner",
  "Other",
]);

const EVENT_CHOW_CALL_NOVO = "sd26-chow-call-novo-2026-04-14";
const CHOW_CALL_MAX_FAMILY_SIZE = 2;
const CHOW_CALL_EVENT_CAPACITY = 35;

function normStr(v: unknown): string {
  return String(v ?? "").trim();
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function clampArray(arr: unknown, maxLen: number): string[] {
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  for (const item of arr) {
    if (out.length >= maxLen) break;
    const s = String(item ?? "").trim();
    if (!s) continue;
    out.push(s.slice(0, 128));
  }
  return out;
}

function toInt(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function normalizeStatus(raw: unknown): string {
  const v = normStr(raw);
  if (ALLOWED_STATUS.has(v)) return v;

  const map: Record<string, string> = {
    "Guard / Reserve": "Guard/Reserve",
    "Guard & Reserve": "Guard/Reserve",
    "Family Member": "Family Member/Caregiver",
    Caregiver: "Family Member/Caregiver",
    Provider: "Provider/Community Partner",
    "Community Partner": "Provider/Community Partner",
  };

  return map[v] ?? v;
}

function normalizePhoneOptional(phoneRaw: unknown): Ok<{ phone: string | null }> | Err {
  const raw = normStr(phoneRaw);
  if (!raw) return { ok: true, phone: null };

  const digitsOnly = raw.replace(/\D/g, "");
  const phone =
    digitsOnly.length === 11 && digitsOnly.startsWith("1")
      ? digitsOnly.slice(1)
      : digitsOnly;

  if (phone.length !== 10) return { ok: false, error: "Invalid phone" };
  return { ok: true, phone };
}

function normalizePostalCode(zipRaw: unknown): Ok<{ postal_code: string | null }> | Err {
  const raw = normStr(zipRaw);
  if (!raw) return { ok: true, postal_code: null };

  const five = raw.slice(0, 5);
  if (!/^\d{5}$/.test(five)) return { ok: false, error: "ZIP must be 5 digits" };
  return { ok: true, postal_code: five };
}

function normalizePreferredContactSignup(raw: unknown): Ok<{ preferred_contact: string }> | Err {
  const v = normStr(raw) || "Email";
  if (!ALLOWED_PREFERRED_CONTACT_SIGNUP.has(v)) {
    return {
      ok: false,
      error: `Invalid preferred_contact. Allowed: ${Array.from(ALLOWED_PREFERRED_CONTACT_SIGNUP).join(", ")}`,
    };
  }
  return { ok: true, preferred_contact: v };
}

function normalizeEra(eraList: string[], eraRaw: unknown): Ok<{ era: string }> | Err {
  const list = eraList.map((s) => s.trim()).filter(Boolean);

  const hasPre = list.includes("Pre-9/11") || list.includes("Pre 9/11");
  const hasPost = list.includes("Post-9/11") || list.includes("Post 9/11");

  if (hasPre && hasPost) return { ok: true, era: "both" };
  if (hasPre) return { ok: true, era: list.includes("Pre-9/11") ? "Pre-9/11" : "Pre 9/11" };
  if (hasPost) return { ok: true, era: list.includes("Post-9/11") ? "Post-9/11" : "Post 9/11" };

  const fallback = normStr(eraRaw);
  if (fallback && ALLOWED_ERA.has(fallback)) return { ok: true, era: fallback };

  return {
    ok: false,
    error: 'Era is required. Provide era_list including "Pre-9/11" and/or "Post-9/11".',
  };
}

function makeTicketCode(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `RHP-${y}${m}${day}-${rand}`;
}

function makeUniqueTicketCode(issued: Set<string>): string {
  for (let i = 0; i < 5; i += 1) {
    const code = makeTicketCode();
    if (!issued.has(code)) {
      issued.add(code);
      return code;
    }
  }
  const fallback = `${makeTicketCode()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  issued.add(fallback);
  return fallback;
}

function isUniqueViolation(err: any): boolean {
  return err?.code === "23505" ||
    String(err?.message || "").toLowerCase().includes("duplicate key");
}

function duplicateRsvpMessage(reason?: "phone" | "email" | "contact") {
  const r =
    reason === "phone"
      ? "phone number"
      : reason === "email"
        ? "email address"
        : "email or phone number";
  return `It looks like this ${r} has already been used to RSVP for this event. Please refresh the page and try again, or use a different email/phone.`;
}

function isDuplicateSignupEmailError(err: any): boolean {
  if (err?.code === "23505") return true;
  const msg = String(err?.message || "");
  return msg.includes("mailing_list_signups_email_unique") ||
    msg.toLowerCase().includes("duplicate key");
}

async function insertMailingListSignup(sb: any, payload: Record<string, unknown>) {
  const { data, error } = await sb
    .from("mailing_list_signups")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isDuplicateSignupEmailError(error)) {
      return { ok: true as const, id: null };
    }
    return { ok: false as const, error: `Signup insert failed: ${error.message}` };
  }

  return { ok: true as const, id: data?.id ?? null };
}

function parseSessionSelections(raw: unknown): SessionSelection[] {
  if (!Array.isArray(raw)) return [];
  const out: SessionSelection[] = [];

  for (const item of raw) {
    const event_id = normStr((item as any)?.event_id ?? (item as any)?.eventId);
    const slot_id = normStr((item as any)?.slot_id ?? (item as any)?.slotId);
    const label = normStr((item as any)?.label);

    if (!event_id || !slot_id) continue;

    out.push({
      event_id,
      slot_id,
      label: label || null,
    });
  }

  return out;
}

function dedupeSelections(selections: SessionSelection[]): SessionSelection[] {
  const seen = new Set<string>();
  const out: SessionSelection[] = [];

  for (const s of selections) {
    const key = `${s.event_id}::${s.slot_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }

  return out;
}

async function ensureSessionsExist(sb: any, selections: SessionSelection[]) {
  const eventIds = Array.from(new Set(selections.map((s) => s.event_id)));
  const slotIds = Array.from(new Set(selections.map((s) => s.slot_id)));

  const { data: events, error: eventsErr } = await sb
    .from("events")
    .select("id")
    .in("id", eventIds);

  if (eventsErr) {
    return { ok: false as const, error: `Unable to validate events: ${eventsErr.message}` };
  }

  const { data: slots, error: slotsErr } = await sb
    .from("pickup_slots")
    .select("id,event_id")
    .in("id", slotIds);

  if (slotsErr) {
    return { ok: false as const, error: `Unable to validate slots: ${slotsErr.message}` };
  }

  const eventSet = new Set((events || []).map((e: any) => e.id));
  const slotMap = new Map((slots || []).map((s: any) => [s.id, s.event_id]));

  for (const s of selections) {
    if (!eventSet.has(s.event_id)) {
      return { ok: false as const, error: `Invalid event_id: ${s.event_id}` };
    }
    const slotEventId = slotMap.get(s.slot_id);
    if (!slotEventId) {
      return { ok: false as const, error: `Invalid slot_id: ${s.slot_id}` };
    }
    if (slotEventId !== s.event_id) {
      return { ok: false as const, error: `slot_id does not belong to event_id for ${s.event_id}` };
    }
  }

  return { ok: true as const };
}

async function getEventNameMap(sb: any, eventIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!eventIds.length) return out;

  const { data, error } = await sb
    .from("events")
    .select("id,name")
    .in("id", eventIds);

  if (error) {
    console.error("Unable to load event names for webhook payloads:", error.message);
    return out;
  }

  for (const row of data || []) {
    if (row?.id) out.set(row.id, row.name ?? row.id);
  }

  return out;
}

async function sendPowerAutomateWebhook(payload: Record<string, unknown>) {
  const webhookUrl = Deno.env.get("POWER_AUTOMATE_RSVP_WEBHOOK_URL");
  if (!webhookUrl) return;

  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("Power Automate webhook failed:", resp.status, text);
    }
  } catch (err) {
    console.error("Power Automate webhook error:", err);
  }
}

async function ensureChowCallCapacity(
  sb: any,
  slotId: string,
  requestedTickets: number,
) {
  const { data, error } = await sb
    .from("v_slot_capacity")
    .select("seats_remaining, capacity")
    .eq("slot_id", slotId)
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: `Unable to validate capacity: ${error.message}` };
  }

  const remaining = Number(data?.seats_remaining);
  const capacity = Number(data?.capacity);
  const remainingSafe = Number.isFinite(remaining)
    ? remaining
    : (Number.isFinite(capacity) ? Math.max(0, capacity) : CHOW_CALL_EVENT_CAPACITY);

  if (requestedTickets > remainingSafe) {
    return {
      ok: false as const,
      error: "That event is full or does not have enough remaining seats for your party size.",
    };
  }

  return { ok: true as const };
}

function normalizeAttendee(raw: any, fallbackIndex: number): Ok<{ attendee: NormalizedAttendee }> | Err {
  const first_name = normStr(raw?.first_name ?? raw?.firstName);
  const last_name = normStr(raw?.last_name ?? raw?.lastName);
  const email = normStr(raw?.email ?? raw?.email_address ?? raw?.emailAddress).toLowerCase();

  if (!first_name || !last_name) return { ok: false, error: "First and last name are required" };
  if (!email || !isEmail(email)) return { ok: false, error: "A valid email is required" };

  const status = normalizeStatus(raw?.status ?? raw?.veteran_affiliation ?? raw?.veteranAffiliation);
  if (!status || !ALLOWED_STATUS.has(status)) {
    return {
      ok: false,
      error: `Invalid status. Allowed: ${Array.from(ALLOWED_STATUS).join(", ")}`,
    };
  }

  const phoneNorm = normalizePhoneOptional(raw?.phone ?? raw?.phone_number ?? raw?.phoneNumber ?? "");
  if (!phoneNorm.ok) return { ok: false, error: phoneNorm.error };

  const era_list = clampArray(raw?.era_list ?? raw?.eraList, 10);
  const branch_of_service = clampArray(raw?.branch_of_service ?? raw?.branchOfService, 10);

  let era: string | null = null;
  if (ERA_OPTIONAL_STATUS.has(status)) {
    if (era_list.length) {
      const eraNorm = normalizeEra(era_list, raw?.era);
      if (!eraNorm.ok) return { ok: false, error: eraNorm.error };
      era = eraNorm.era;
    }
  } else {
    const eraNorm = normalizeEra(era_list, raw?.era);
    if (!eraNorm.ok) return { ok: false, error: eraNorm.error };
    era = eraNorm.era;
  }

  const attendee_id = normStr(raw?.attendee_id ?? raw?.attendeeId) || null;

  let attendee_index: number | null = fallbackIndex;
  if (raw?.attendee_index !== undefined || raw?.attendeeIndex !== undefined) {
    const n = Number(raw?.attendee_index ?? raw?.attendeeIndex);
    attendee_index = Number.isFinite(n) ? Math.trunc(n) : fallbackIndex;
  }

  return {
    ok: true,
    attendee: {
      first_name,
      last_name,
      email,
      phone: phoneNorm.phone,
      status,
      branch_of_service,
      era_list,
      era,
      attendee_id,
      attendee_index,
    },
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json({ ok: false, code: "METHOD_NOT_ALLOWED", error: "Method not allowed" }, 405, origin);
  }

  try {
    const b = await req.json().catch(() => ({} as any));

    const BYPASS = Deno.env.get("TURNSTILE_BYPASS") === "1";
    const secretKey = Deno.env.get("TURNSTILE_SECRET_KEY");
    const turnstileToken = b?.cf_turnstile_token ?? b?.cfTurnstileToken;

    let turnstilePassed = false;

    if (!BYPASS) {
      if (!secretKey) {
        return serverError(origin, "Server misconfigured (TURNSTILE_SECRET_KEY missing)", "CONFIG_ERROR");
      }

      if (!turnstileToken) {
        return userError(origin, "Human verification failed. Please try again.", "TURNSTILE_MISSING", 400);
      }

      const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: secretKey,
          response: turnstileToken,
          remoteip: req.headers.get("cf-connecting-ip") ?? undefined,
        }),
      });

      if (!resp.ok) {
        return userError(origin, "Human verification failed. Please try again.", "TURNSTILE_VERIFY_HTTP", 502);
      }

      const verify = await resp.json().catch(() => ({}));
      turnstilePassed = !!verify?.success;
      console.log("[reserve-rsvp][debug] turnstile", {
        success: turnstilePassed,
        bypass: false,
      });

      if (!turnstilePassed) {
        return userError(origin, "Human verification failed. Please try again.", "TURNSTILE_VERIFY_FAIL", 400);
      }
    } else {
      turnstilePassed = true;
      console.log("[reserve-rsvp][debug] turnstile", {
        success: true,
        bypass: true,
      });
    }

    const supabaseUrl = Deno.env.get("SB_URL") ?? Deno.env.get("SUPABASE_URL");
    const supabaseKey =
      Deno.env.get("SB_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return serverError(origin, "Server misconfigured: missing env vars", "CONFIG_ERROR");
    }

    const sb = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const consent = !!(b.consent ?? b.accept_terms ?? b.acceptTerms ?? false);
    if (!consent) {
      return userError(origin, "Consent is required", "VALIDATION", 400);
    }

    const postalRaw = b.postal_code ?? b.zip ?? b.zip_code ?? b.postalCode ?? "";
    const postalNorm = normalizePostalCode(postalRaw);
    if (!postalNorm.ok) return userError(origin, postalNorm.error, "VALIDATION", 400);

    const page_path = normStr(b.page_path ?? b.pagePath) || null;
    const referrer = normStr(b.referrer ?? b.referer) || null;

    const utm_source = normStr(b.utm_source ?? b.utmSource) || null;
    const utm_medium = normStr(b.utm_medium ?? b.utmMedium) || null;
    const utm_campaign = normStr(b.utm_campaign ?? b.utmCampaign) || null;
    const utm_term = normStr(b.utm_term ?? b.utmTerm) || null;
    const utm_content = normStr(b.utm_content ?? b.utmContent) || null;

    const notes = normStr(b.notes) || null;
    const source = normStr(b.source) || "rsvp";

    const city = normStr(b.city) || "";
    const state = normStr(b.state ?? b.state_region ?? b.region) || "";
    const country = normStr(b.country) || null;

    const requireLocation = !!(b.require_location ?? b.requireLocation ?? false);

    const preferredRaw =
      b.preferred_contact ??
      b.preferredContact ??
      b.communication_preference ??
      b.communicationPreference ??
      "Email";
    const preferredNorm = normalizePreferredContactSignup(preferredRaw);
    if (!preferredNorm.ok) return userError(origin, preferredNorm.error, "VALIDATION", 400);

    const interests = clampArray(b.interests ?? b.interest_list ?? b.interestList ?? [], 50);

    const peer_contact_opt_in = !!(b.peer_contact_opt_in ?? b.peerContactOptIn ?? false);
    const raffle_opt_in = !!(b.raffle_opt_in ?? b.raffleOptIn ?? false);
    const mailingOptIn =
      !!(
        b.mailing_list_opt_in ?? b.mailingListOptIn ?? b.add_to_mailing_list ?? b.addToMailingList ??
          false
      );

    const family_size_raw = Math.max(1, Math.min(10, toInt(b.family_size ?? b.familySize, 1)));

    const sessionSelectionsRaw = parseSessionSelections(b.session_selections ?? b.sessionSelections);

    const legacyEventId = normStr(b.event_id ?? b.eventId);
    const legacySlotId = normStr(b.slot_id ?? b.slotId);

    const sessionSelections = dedupeSelections(
      sessionSelectionsRaw.length
        ? sessionSelectionsRaw
        : (legacyEventId && legacySlotId
            ? [{ event_id: legacyEventId, slot_id: legacySlotId, label: null }]
            : []),
    );

    const isRsvpMode = sessionSelections.length > 0;

    if (isRsvpMode) {
      const sessionCheck = await ensureSessionsExist(sb, sessionSelections);
      if (!sessionCheck.ok) return userError(origin, sessionCheck.error, "VALIDATION", 400);

      if (requireLocation) {
        if (!city) return userError(origin, "City is required", "VALIDATION", 400);
        if (!state) return userError(origin, "State/region is required", "VALIDATION", 400);
        if (!country) return userError(origin, "Country is required", "VALIDATION", 400);
      }

      for (const s of sessionSelections) {
        if (s.event_id === EVENT_CHOW_CALL_NOVO && family_size_raw > CHOW_CALL_MAX_FAMILY_SIZE) {
          return userError(
            origin,
            `Chow Call registration is limited to ${CHOW_CALL_MAX_FAMILY_SIZE} people per RSVP.`,
            "VALIDATION",
            400,
          );
        }
      }

      const attendeesInput = Array.isArray(b.attendees) ? b.attendees : null;
      const attendees: NormalizedAttendee[] = [];

      if (attendeesInput && attendeesInput.length > 0) {
        for (let i = 0; i < attendeesInput.length; i += 1) {
          const norm = normalizeAttendee(attendeesInput[i], i);
          if (!norm.ok) {
            return userError(origin, `Attendee ${i + 1}: ${norm.error}`, "VALIDATION", 400, {
              attendee_index: i,
            });
          }
          attendees.push(norm.attendee);
        }
      } else {
        const norm = normalizeAttendee(b, 0);
        if (!norm.ok) return userError(origin, norm.error, "VALIDATION", 400);
        attendees.push(norm.attendee);
      }

      const order_id = normStr(b.order_id ?? b.orderId) || null;

      const chowCallSelection = sessionSelections.find((s) => s.event_id === EVENT_CHOW_CALL_NOVO);
      if (chowCallSelection) {
        const requestedTickets = attendees.length * family_size_raw;
        if (requestedTickets > CHOW_CALL_EVENT_CAPACITY) {
          return userError(
            origin,
            `Chow Call capacity is capped at ${CHOW_CALL_EVENT_CAPACITY} seats.`,
            "CAPACITY_REACHED",
            409,
          );
        }

        const capacityCheck = await ensureChowCallCapacity(
          sb,
          chowCallSelection.slot_id,
          requestedTickets,
        );
        if (!capacityCheck.ok) {
          const code = capacityCheck.error.includes("Unable to validate")
            ? "CAPACITY_CHECK_FAILED"
            : "CAPACITY_REACHED";
          return userError(
            origin,
            capacityCheck.error,
            code,
            code === "CAPACITY_REACHED" ? 409 : 500,
          );
        }
      }

      for (const s of sessionSelections) {
        for (const attendee of attendees) {
          const contactFilters: string[] = [];
          if (attendee.email) contactFilters.push(`email.eq.${attendee.email}`);
          if (attendee.phone) contactFilters.push(`phone.eq.${attendee.phone}`);

          if (!contactFilters.length) continue;

          const { data: existing, error: existingErr } = await sb
            .from("rsvps")
            .select("id,email,phone")
            .eq("event_id", s.event_id)
            .or(contactFilters.join(","))
            .limit(1);

          console.log("[reserve-rsvp][debug] duplicate_check", {
            event_id: s.event_id,
            slot_id: s.slot_id,
            attendee_index: attendee.attendee_index,
            attendee_id: attendee.attendee_id,
            order_id,
            turnstile_passed: turnstilePassed,
            query_error: existingErr?.message ?? null,
            matched_count: Array.isArray(existing) ? existing.length : 0,
          });

          if (!existingErr && Array.isArray(existing) && existing.length > 0) {
            const matchedPhone = attendee.phone
              ? String(existing[0]?.phone ?? "") === attendee.phone
              : false;
            const matchedEmail =
              String(existing[0]?.email ?? "").toLowerCase() === attendee.email;
            const reason = matchedPhone ? "phone" : matchedEmail ? "email" : "contact";

            return userError(
              origin,
              duplicateRsvpMessage(reason),
              "DUPLICATE_RSVP",
              409,
              { duplicate_event_id: s.event_id, duplicate_slot_id: s.slot_id },
            );
          }
        }
      }

      // Bug fix: create all RSVP rows first and insert in a single statement so multi-attendee
      // submissions are atomic (all succeed or all fail) instead of partial per-request saves.
      const issuedTickets = new Set<string>();
      const rows: Record<string, unknown>[] = [];
      const rowMeta = new Map<string, { attendee: NormalizedAttendee; selection: SessionSelection }>();

      for (const s of sessionSelections) {
        for (const attendee of attendees) {
          const ticket_code = makeUniqueTicketCode(issuedTickets);

          const insertPayload: Record<string, unknown> = {
            event_id: s.event_id,
            slot_id: s.slot_id,
            first_name: attendee.first_name,
            last_name: attendee.last_name,
            email: attendee.email,
            phone: attendee.phone,
            status: attendee.status,
            era: attendee.era,
            raffle_opt_in,
            ticket_code,
            branch_of_service: attendee.branch_of_service.length ? attendee.branch_of_service : null,
            era_list: attendee.era_list.length ? attendee.era_list : null,
            peer_contact_opt_in,
            family_size: family_size_raw,
            ...(city ? { city } : {}),
            ...(state ? { state } : {}),
            ...(country ? { country } : {}),
          };

          if (postalNorm.postal_code) insertPayload.postal_code = postalNorm.postal_code;
          if (page_path) insertPayload.page_path = page_path;
          if (referrer) insertPayload.referrer = referrer;
          if (utm_source) insertPayload.utm_source = utm_source;
          if (utm_medium) insertPayload.utm_medium = utm_medium;
          if (utm_campaign) insertPayload.utm_campaign = utm_campaign;
          if (utm_term) insertPayload.utm_term = utm_term;
          if (utm_content) insertPayload.utm_content = utm_content;

          if (order_id) insertPayload.order_id = order_id;
          if (attendee.attendee_id) insertPayload.attendee_id = attendee.attendee_id;
          if (attendee.attendee_index !== null) insertPayload.attendee_index = attendee.attendee_index;

          console.log("[reserve-rsvp][debug] prepared_row", {
            event_id: s.event_id,
            slot_id: s.slot_id,
            attendee_index: attendee.attendee_index,
            attendee_id: attendee.attendee_id,
            order_id,
            generated_ticket_code: ticket_code,
            turnstile_passed: turnstilePassed,
          });

          rows.push(insertPayload);
          rowMeta.set(ticket_code, { attendee, selection: s });
        }
      }

      const { data: inserted, error: insertErr } = await sb
        .from("rsvps")
        .insert(rows)
        .select("id,event_id,slot_id,ticket_code");

      if (insertErr) {
        console.error("[reserve-rsvp][debug] insert_error", {
          code: insertErr.code,
          message: insertErr.message,
          details: insertErr.details,
          hint: insertErr.hint,
          row_count: rows.length,
        });

        if (isUniqueViolation(insertErr)) {
          return userError(origin, duplicateRsvpMessage("contact"), "DUPLICATE_RSVP", 409);
        }

        return userError(origin, insertErr.message || "Unable to complete registration.", "INSERT_FAILED", 500);
      }

      const insertedRows = Array.isArray(inserted) ? inserted : [];

      const eventIds = Array.from(new Set(sessionSelections.map((s) => s.event_id)));
      const eventNameMap = await getEventNameMap(sb, eventIds);

      for (const row of insertedRows) {
        const ticket = String((row as any)?.ticket_code || "");
        const meta = rowMeta.get(ticket);
        if (!meta) continue;

        await sendPowerAutomateWebhook({
          rsvp_id: (row as any)?.id,
          event_id: meta.selection.event_id,
          event_name: eventNameMap.get(meta.selection.event_id) ?? meta.selection.event_id,
          slot_label: meta.selection.label ?? "",
          first_name: meta.attendee.first_name,
          last_name: meta.attendee.last_name,
          email: meta.attendee.email,
          phone: meta.attendee.phone ?? "",
          status: meta.attendee.status,
          era: meta.attendee.era ?? "",
          city: city || "",
          state: state || "",
          country: country ?? "",
          postal_code: postalNorm.postal_code ?? "",
          branch_of_service: meta.attendee.branch_of_service.length ? meta.attendee.branch_of_service : [],
          era_list: meta.attendee.era_list.length ? meta.attendee.era_list : [],
          peer_contact_opt_in,
          raffle_opt_in,
          family_size: family_size_raw,
          mailing_list_opt_in: mailingOptIn,
          page_path: page_path ?? "",
          referrer: referrer ?? "",
          source,
          utm_source: utm_source ?? "",
          utm_medium: utm_medium ?? "",
          utm_campaign: utm_campaign ?? "",
          utm_term: utm_term ?? "",
          utm_content: utm_content ?? "",
          created_at: new Date().toISOString(),
        });
      }

      let signup_id: string | null = null;

      if (mailingOptIn) {
        const primary = attendees[0];
        const inferredInterests = interests.length ? interests : ["MST webinar updates"];

        const signupPayload: Record<string, unknown> = {
          source,
          page_path,
          first_name: primary.first_name,
          last_name: primary.last_name,
          email: primary.email,
          phone: primary.phone,
          postal_code: postalNorm.postal_code,
          veteran_affiliation: primary.status,
          preferred_contact: preferredNorm.preferred_contact,
          interests: inferredInterests,
          consent: true,
          notes,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_term,
          utm_content,
        };

        const ins = await insertMailingListSignup(sb, signupPayload);
        if (!ins.ok) return userError(origin, ins.error, "SIGNUP_INSERT_FAILED", 500);
        signup_id = ins.id;
      }

      return json({
        ok: true,
        mode: "rsvp",
        inserted_count: insertedRows.length,
        session_count: sessionSelections.length,
        attendee_count: attendees.length,
        sessions: sessionSelections,
        signup_id,
      }, 200, origin);
    }

    // Signup-only mode remains single-person and backward compatible.
    const single = normalizeAttendee(b, 0);
    if (!single.ok) return userError(origin, single.error, "VALIDATION", 400);

    const signupPayload: Record<string, unknown> = {
      source: source || "mailing-list",
      page_path,
      first_name: single.attendee.first_name,
      last_name: single.attendee.last_name,
      email: single.attendee.email,
      phone: single.attendee.phone,
      postal_code: postalNorm.postal_code,
      veteran_affiliation: single.attendee.status,
      preferred_contact: preferredNorm.preferred_contact,
      interests,
      consent: true,
      notes,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
    };

    const ins = await insertMailingListSignup(sb, signupPayload);
    if (!ins.ok) return userError(origin, ins.error, "SIGNUP_INSERT_FAILED", 500);

    return json({ ok: true, mode: "signup", id: ins.id }, 200, origin);
  } catch (err) {
    console.error("reserve-rsvp error:", err);
    return serverError(origin, (err as any)?.message || "Server error");
  }
});
