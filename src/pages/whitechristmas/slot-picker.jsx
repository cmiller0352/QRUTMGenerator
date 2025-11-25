// src/pages/whitechristmas/slot-picker.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../../utils/supabaseClient";

const SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || "";

// Branch & Era options (UI)
const BRANCHES = [
  "Army",
  "Army National Guard",
  "Navy",
  "Marine Corps",
  "Air Force",
  "Coast Guard",
  "Space Force",
];
const ERAS = ["Pre-9/11", "Post-9/11"];

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida",
  "Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine",
  "Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska",
  "Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota",
  "Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee",
  "Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"
];

const FAMILY_CHOICES = [2, 3, 4, 5];

function MultiChipGroup({
  label,
  ariaLabel,
  options,
  values,
  setValues,
  idPrefix,
}) {
  const toggle = (val) => {
    setValues((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };
  return (
    <div className="tdp-field">
      <div className="tdp-chips-head">{label}</div>
      <div
        className="chip-grid"
        role="group"
        aria-label={
          ariaLabel || (typeof label === "string" ? label : undefined)
        }
      >
        {options.map((opt) => {
          const pressed = values.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              className="chip-btn"
              aria-pressed={pressed}
              onClick={() => toggle(opt)}
              id={`${idPrefix}-${opt.replace(/\W+/g, "-").toLowerCase()}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function WhiteChristmasSlotPicker({ eventId }) {
  const [slot, setSlot] = useState(null);
  const [slotId, setSlotId] = useState("");

  // Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [digits, setDigits] = useState("");

  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Illinois");
  const [zip, setZip] = useState("");

  const [status, setStatus] = useState("Veteran");
  const [branches, setBranches] = useState([]);
  const [eras, setEras] = useState([]);
  const [eraOther, setEraOther] = useState("");

  const [familySize, setFamilySize] = useState(2);

  const [rhpClient, setRhpClient] = useState(false);
  const [peerContact, setPeerContact] = useState(false);
  const [consent, setConsent] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});

  // Refs for auto-advance
  const addr1Ref = useRef(null);
  const statusSelectRef = useRef(null);

  // Turnstile
  const [scriptReady, setScriptReady] = useState(false);
  const [widgetId, setWidgetId] = useState(null);
  const [captchaToken, setCaptchaToken] = useState("");

  const refreshTurnstile = () => {
    setCaptchaToken("");
    if (window.turnstile && widgetId) window.turnstile.reset(widgetId);
  };

  const fetchSlot = useCallback(async () => {
    const { data } = await supabase
      .from("pickup_slots")
      .select("id,label,capacity,taken,start_utc")
      .eq("event_id", eventId)
      .order("start_utc", { ascending: true });
    if (Array.isArray(data) && data.length > 0) {
      setSlot(data[0]);
      setSlotId(data[0].id);
    } else {
      setSlot(null);
      setSlotId("");
    }
  }, [eventId]);

  useEffect(() => {
    fetchSlot();
  }, [fetchSlot]);

  const remaining = (s) => {
    if (!s) return 0;
    const cap = Number.isFinite(s.capacity) ? s.capacity : 0;
    const t = Number.isFinite(s.taken) ? s.taken : 0;
    return Math.max(0, cap - t);
  };

  const remainingSeats = slot ? remaining(slot) : 0;
  const soldOut = slot ? remainingSeats < 2 : false;
  const familyOptions = slot
    ? FAMILY_CHOICES.filter((n) => n <= remainingSeats)
    : FAMILY_CHOICES;

  useEffect(() => {
    if (!slot) return;
    if (familySize > remainingSeats) {
      const allowed = FAMILY_CHOICES.filter((n) => n <= remainingSeats);
      if (allowed.length > 0) {
        setFamilySize(allowed[allowed.length - 1]);
      }
    }
  }, [familySize, remainingSeats, slot]);

  // Phone mask + auto-advance
  const formatPhone = (d) => {
    const a = d.slice(0, 3);
    const b = d.slice(3, 6);
    const c = d.slice(6, 10);
    if (d.length <= 3) return `(${a}`;
    if (d.length <= 6) return `(${a}) ${b}`;
    return `(${a}) ${b}-${c}`;
  };
  const onPhoneChange = (e) => {
    const nextDigits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setDigits(nextDigits);
    setPhone(formatPhone(nextDigits));
    if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
    if (nextDigits.length === 10) addr1Ref.current?.focus();
  };

  // ZIP max 5 + jump to Status
  const onZipChange = (e) => {
    const next = e.target.value.replace(/\D/g, "").slice(0, 5);
    setZip(next);
    if (errors.zip) setErrors((p) => ({ ...p, zip: undefined }));
    if (next.length === 5) statusSelectRef.current?.focus();
  };

  // Turnstile init
  useEffect(() => {
    if (!SITE_KEY) return;
    if (document.getElementById("cf-turnstile-script")) {
      setScriptReady(!!window.turnstile);
      return;
    }
    const s = document.createElement("script");
    s.id = "cf-turnstile-script";
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => setScriptReady(true);
    document.head.appendChild(s);
  }, []);
  useEffect(() => {
    if (!scriptReady || !window.turnstile || widgetId || !SITE_KEY) return;
    const id = window.turnstile.render("#turnstile-container", {
      sitekey: SITE_KEY,
      size: "invisible",
      callback: setCaptchaToken,
      "expired-callback": () => setCaptchaToken(""),
      "error-callback": () => setCaptchaToken(""),
      retry: "auto",
    });
    setWidgetId(id);
  }, [scriptReady, widgetId]);
  const getTurnstileToken = async () => {
    if (!window.turnstile || !widgetId) return "";
    if (captchaToken) return captchaToken;
    return new Promise((resolve) => {
      const onToken = (e) => {
        resolve(e.detail.token);
        document.removeEventListener("cf-turnstile-token", onToken);
      };
      document.addEventListener("cf-turnstile-token", onToken);
      window.turnstile.execute(widgetId);
      setTimeout(() => {
        document.removeEventListener("cf-turnstile-token", onToken);
        resolve("");
      }, 3000);
    });
  };
  useEffect(() => {
    if (!captchaToken) return;
    const ev = new CustomEvent("cf-turnstile-token", { detail: { token: captchaToken } });
    document.dispatchEvent(ev);
  }, [captchaToken]);

  const isEmail = (v) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(v);

  const scrollToFirstError = (errs) => {
    const order = [
      "firstName","lastName","email","phone",
      "address1","city","state","zip",
      "status","eras","eraOther","branches",
      "familySize","consent",
    ];
    const key = order.find((k) => errs[k]);
    if (!key) return;
    const el = document.querySelector(`[data-field="${key}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const doSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const errs = {};
    if (!firstName.trim()) errs.firstName = "Required";
    if (!lastName.trim()) errs.lastName = "Required";
    if (!email.trim() || !isEmail(email)) errs.email = "Valid email required";
    if (digits.length !== 10) errs.phone = "10 digits";
    if (!address1.trim()) errs.address1 = "Required";
    if (!city.trim()) errs.city = "Required";
    if (!state.trim()) errs.state = "Required";
    if (!/^\d{5}$/.test(zip)) errs.zip = "5 digits";
    if (!status) errs.status = "Required";
    if (eras.length === 0) errs.eras = "Pick at least one";
    if (eras.includes("Other") && eraOther.trim().length < 2) errs.eraOther = "Please describe";
    if (branches.length === 0) errs.branches = "Pick at least one";
    if (slot && familySize > remainingSeats) errs.familySize = "Not enough seats remaining";
    if (!consent) errs.consent = "Required";

    if (Object.keys(errs).length) {
      setErrors(errs);
      scrollToFirstError(errs);
      return;
    }

    if (!slotId) {
      setMessage("⚠️ Event availability is still loading. Please try again.");
      return;
    }

    if (soldOut) {
      setMessage("⚠️ Event full.");
      return;
    }

    setSubmitting(true);

    try {
      const { data: freshSlot } = await supabase
        .from("pickup_slots")
        .select("id,capacity,taken,label")
        .eq("id", slotId)
        .maybeSingle();

      const remainingNow = freshSlot
        ? Math.max(0, (freshSlot.capacity || 0) - (freshSlot.taken || 0))
        : 0;

      if (remainingNow < familySize) {
        await fetchSlot();
        setMessage("⚠️ Not enough seats remain for that party size. Please adjust.");
        refreshTurnstile();
        setSubmitting(false);
        return;
      }
    } catch {
      // Server will enforce remaining capacity if this fails.
    }

    let token = captchaToken;
    if (!token && window.turnstile && widgetId) token = await getTurnstileToken();
    if (!token) {
      setMessage("❌ Human verification failed.");
      setSubmitting(false);
      return;
    }

    const payload = {
      event_id: eventId,
      slot_id: slotId,
      family_size: familySize,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone,
      status,
      branch_of_service: branches,
      era_list: eras,
      era_other: eras.includes("Other") ? eraOther.trim() : null,
      rhp_client_status: rhpClient,
      peer_contact_opt_in: peerContact,
      consent: true,
      address1: address1.trim(),
      address2: address2.trim() || null,
      city: city.trim(),
      state: state.trim(),
      postal_code: zip.trim(),
      cf_turnstile_token: token,
    };

    try {
      const resp = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/reserve-rsvp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.REACT_APP_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const body = await resp.json().catch(() => null);

      if (!resp.ok) {
        if (resp.status === 409) {
          await fetchSlot();
          setMessage("⚠️ It looks like we just ran out of seats. Please try again soon.");
          refreshTurnstile();
          return;
        }
        if (resp.status === 400 && /Human verification/i.test(body?.error || "")) {
          setMessage("❌ Please complete the verification and try again.");
          refreshTurnstile();
          return;
        }
        setMessage(`⚠️ ${body?.error || `HTTP ${resp.status}`}`);
        refreshTurnstile();
        return;
      }

      if (body?.ok || body?.success) {
        window.location.href = "/whitechristmas/thankyou";
      } else {
        setMessage(`⚠️ ${body?.error || "Unknown error"}`);
        refreshTurnstile();
      }
    } catch (err) {
      setMessage(`❌ ${err.message || "Network error"}`);
      refreshTurnstile();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="tdp-form" onSubmit={doSubmit} noValidate>
      {soldOut && slot && (
        <div className="tdp-msg">Event full</div>
      )}

      <fieldset
        disabled={soldOut}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        <div className="tdp-row">
          <label data-field="firstName">
            First name*
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              aria-invalid={!!errors.firstName}
            />
          </label>
          <label data-field="lastName">
            Last name*
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              aria-invalid={!!errors.lastName}
            />
          </label>
        </div>

        <div className="tdp-row">
          <label data-field="email">
            Email*
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
            />
          </label>
          <label data-field="phone">
            Phone*
            <input
              value={phone}
              onChange={onPhoneChange}
              placeholder="(###) ###-####"
              aria-invalid={!!errors.phone}
            />
          </label>
        </div>

        <label data-field="address1">
          Address*
          <input
            ref={addr1Ref}
            value={address1}
            onChange={(e) => setAddress1(e.target.value)}
            aria-invalid={!!errors.address1}
          />
        </label>
        <label className="tdp-muted">
          Address 2 (apt/unit optional)
          <input value={address2} onChange={(e) => setAddress2(e.target.value)} />
        </label>

      <div className="tdp-row tdp-row--location">
        <label data-field="city">
          City*
          <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-invalid={!!errors.city}
            />
          </label>
          <label data-field="state">
            State*
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              aria-invalid={!!errors.state}
            >
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label data-field="zip">
            ZIP*
            <input value={zip} onChange={onZipChange} aria-invalid={!!errors.zip} />
          </label>
        </div>

      <div className="tdp-row tdp-row--status">
        <label data-field="status" className="tdp-status">
          Status*
          <select
            ref={statusSelectRef}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
              aria-invalid={!!errors.status}
            >
              <option>Veteran</option>
              <option>Active Duty</option>
              <option>Guard/Reserve</option>
            </select>
          </label>
          <label data-field="familySize">
            Family size attending (including you)*
            <select
              value={familySize}
              onChange={(e) => setFamilySize(Number(e.target.value))}
              aria-invalid={!!errors.familySize}
            >
              {familyOptions.map((size) => (
                <option key={size} value={size}>
                  {size} {size === 1 ? "guest" : "guests"}
                </option>
              ))}
            </select>
          </label>
        </div>

      <div
        data-field="eras"
        className={`tdp-section ${errors.eras ? "tdp-err-ring" : ""}`}
      >
        <MultiChipGroup
          label={
            <>
              <strong>Service Era</strong>{" "}
              <span className="tdp-label-hint">
                (select all that apply)*
              </span>
            </>
          }
          ariaLabel="Service Era (select all that apply)"
          options={ERAS}
          values={eras}
          setValues={setEras}
          idPrefix="era"
        />
      </div>
        {eras.includes("Other") && (
          <label data-field="eraOther" className="tdp-chip-note">
            If “Other”, please describe
            <input
              value={eraOther}
              onChange={(e) => setEraOther(e.target.value)}
              aria-invalid={!!errors.eraOther}
            />
          </label>
        )}

      <div
        data-field="branches"
        className={`tdp-section ${errors.branches ? "tdp-err-ring" : ""}`}
      >
        <MultiChipGroup
          label={
            <>
              <strong>Branch of Service</strong>{" "}
              <span className="tdp-label-hint">
                (select all that apply)*
              </span>
            </>
          }
          ariaLabel="Branch of Service (select all that apply)"
          options={BRANCHES}
          values={branches}
          setValues={setBranches}
          idPrefix="branch"
        />
      </div>

        <div className="tdp-toggles" data-field="toggles">
          <button
            type="button"
            className={`tdp-toggle ${rhpClient ? "on" : ""}`}
            onClick={() => setRhpClient(!rhpClient)}
            aria-pressed={rhpClient}
          >
            <i /> Select if you are a client of the Road Home Program.
          </button>

          <button
            type="button"
            className={`tdp-toggle ${peerContact ? "on" : ""}`}
            onClick={() => setPeerContact(!peerContact)}
            aria-pressed={peerContact}
          >
            <i /> Would you like a peer from the Road Home Program to reach out
            about our no-cost services for you or your family?
          </button>

          <button
            type="button"
            className={`tdp-toggle ${consent ? "on" : ""} ${
              errors.consent ? "tdp-toggle-error" : ""
            }`}
            onClick={() => setConsent(!consent)}
            aria-pressed={consent}
            data-field="consent"
          >
            <i /> I understand tickets are limited and agree to notify the Road
            Home Program if my plans change.
          </button>
        </div>

        <div id="turnstile-container" style={{ height: 0, overflow: "hidden" }} />

        <button
          type="submit"
          className="tdp-submit"
          disabled={submitting || soldOut}
        >
          {submitting ? "Submitting…" : "Complete RSVP"}
        </button>
      </fieldset>

      {message && (
        <div className={`tdp-msg ${/^(✅|Success)/.test(message) ? "ok" : "err"}`}>
          {message}
        </div>
      )}
    </form>
  );
}
