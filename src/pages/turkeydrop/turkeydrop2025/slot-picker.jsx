// src/pages/turkeydrop/turkeydrop2025/slot-picker.jsx
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../../utils/supabaseClient";

const SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || "";

// Branch & Era options (UI)
const BRANCHES = [
  "Army","Army Reserve","Army National Guard",
  "Marine Corps","Marine Corps Reserve",
  "Navy","Navy Reserve",
  "Air Force","Air Force Reserve","Air National Guard",
  "Coast Guard","Coast Guard Reserve",
  "Space Force"
];
const ERAS = [
  "WWII",
  "Korean War Era",
  "Korean War",
  "Vietnam War Era",
  "Vietnam",
  "Cold War",
  "Persian Gulf War",
  "Persian Gulf War/Desert Storm Era",
  "Pre-9/11",
  "Post-9/11",
  "OIF/OEF/OND",
  "Other",
];

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida",
  "Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine",
  "Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska",
  "Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota",
  "Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee",
  "Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"
];

function MultiChipGroup({ label, options, values, setValues, idPrefix }) {
  const toggle = (val) => {
    setValues((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };
  return (
    <div className="tdp-field">
      <div className="tdp-chips-head">{label}</div>
      <div className="chip-grid" role="group" aria-label={label}>
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

export default function SlotPicker({ eventId }) {
  // Slots
  const [slots, setSlots] = useState([]);
  const [slotId, setSlotId] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  //const [emailHint, setEmailHint] = useState("");
  const [phone, setPhone] = useState(""); // formatted display
  const [digits, setDigits] = useState(""); // raw digits

  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Illinois");
  const [zip, setZip] = useState("");

  const [status, setStatus] = useState("Veteran");
  const [branches, setBranches] = useState([]); // array
  const [eras, setEras] = useState([]); // array
  const [eraOther, setEraOther] = useState("");

  const [rhpClient, setRhpClient] = useState(false);
  const [peerContact, setPeerContact] = useState(false);
  const [consent, setConsent] = useState(false);
  const [raffle, setRaffle] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});

  // Refs for auto-advance
  const addr1Ref = useRef(null);
  const statusSelectRef = useRef(null); // ZIP should jump to Status

  // Turnstile
  const [scriptReady, setScriptReady] = useState(false);
  const [widgetId, setWidgetId] = useState(null);
  const [captchaToken, setCaptchaToken] = useState("");

  // Load slots (derive "taken" live via related rsvps(count))
  useEffect(() => {
    const load = async () => {
      setLoadingSlots(true);
      const { data, error } = await supabase
        .from("pickup_slots")
        // Use PostgREST aggregate to count children rsvps per slot
        .select("id,label,capacity,start_utc, rsvps:rsvps(count)")
        .eq("event_id", eventId)
        .order("start_utc", { ascending: true });
      if (!error && data) setSlots(data);
      setLoadingSlots(false);
    };
    load();
  }, [eventId]);

  // Remaining seats based on live rsvps(count)
  const remaining = (s) => {
    const cap = Number.isFinite(s.capacity) ? s.capacity : 0;
    const taken =
      Array.isArray(s.rsvps) && s.rsvps.length ? Number(s.rsvps[0].count || 0) : 0;
    return Math.max(0, cap - taken);
  };

  // Phone mask + auto-advance
  const formatPhone = (d) => {
    const a = d.slice(0, 3),
      b = d.slice(3, 6),
      c = d.slice(6, 10);
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
      "firstName",
      "lastName",
      "email",
      "phone",
      "address1",
      "city",
      "state",
      "zip",
      "status",
      "eras",
      "eraOther",
      "branches",
      "slot",
      "consent",
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
    if (!slotId) errs.slot = "Pick a window";
    if (!consent) errs.consent = "Required";

    if (Object.keys(errs).length) {
      setErrors(errs);
      scrollToFirstError(errs);
      return;
    }

    setSubmitting(true);

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
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone, // server strips non-digits
      status,
      branch_of_service: branches,
      era_list: eras,
      era_other: eras.includes("Other") ? eraOther.trim() : null,
      rhp_client_status: rhpClient,
      peer_contact_opt_in: peerContact,
      raffle_opt_in: raffle,
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
        setMessage(`⚠️ ${body?.error || `HTTP ${resp.status}`}`);
        return;
      }
      if (body?.ok || body?.success) {
        window.location.href = "/turkeydrop2025/thankyou";
      } else {
        setMessage(`⚠️ ${body?.error || "Unknown error"}`);
      }
    } catch (err) {
      setMessage(`❌ ${err.message || "Network error"}`);
    } finally {
      setSubmitting(false);
      setCaptchaToken("");
    }
  };

  return (
    <form className="tdp-form" onSubmit={doSubmit} noValidate>
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

      <div className="tdp-row">
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

      <div className="tdp-row">
        <label data-field="status">
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
        <div />
      </div>

      {/* Service Era chips */}
      <div
        data-field="eras"
        className={`tdp-section ${errors.eras ? "tdp-err-ring" : ""}`}
      >
        <MultiChipGroup
          label="Service Era (select all that apply)*"
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

      {/* Branch chips */}
      <div
        data-field="branches"
        className={`tdp-section ${errors.branches ? "tdp-err-ring" : ""}`}
      >
        <MultiChipGroup
          label="Branch of Service (select all that apply)*"
          options={BRANCHES}
          values={branches}
          setValues={setBranches}
          idPrefix="branch"
        />
      </div>

      {/* Slot grid */}
      <div
        className={`tdp-slotgrid tdp-section ${errors.slot ? "tdp-err-ring" : ""}`}
        data-field="slot"
      >
        <div className="tdp-slotgrid-head">Pickup window*</div>
        <div className="tdp-slotgrid-body">
          {loadingSlots && <div className="tdp-slot skel" />}
          {!loadingSlots &&
            slots.map((s) => {
              const rem = remaining(s);
              const disabled = rem <= 0;
              return (
                <label
                  key={s.id}
                  className={`tdp-slot ${disabled ? "tdp-slot--full" : ""} ${
                    slotId === s.id ? "tdp-slot--sel" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="slot"
                    value={s.id}
                    checked={slotId === s.id}
                    disabled={disabled}
                    onChange={() => setSlotId(s.id)}
                  />
                  <div className="tdp-slot-main">{s.label}</div>
                  <div className="tdp-slot-sub">
                    {disabled ? "FULL" : `${rem} spots left`}
                  </div>
                </label>
              );
            })}
        </div>
      </div>

      {/* Big toggles */}
      <div className="tdp-toggles" data-field="toggles">
        <button
          type="button"
          className={`tdp-toggle ${rhpClient ? "on" : ""}`}
          onClick={() => setRhpClient(!rhpClient)}
          aria-pressed={rhpClient}
        >
          <i /> Select if you are you a client of the Road Home Program.
        </button>

        <button
          type="button"
          className={`tdp-toggle ${peerContact ? "on" : ""}`}
          onClick={() => setPeerContact(!peerContact)}
          aria-pressed={peerContact}
        >
          <i /> Would you like to be contacted by a peer, veteran, or family member
          of the RHP team about our no cost mental health services available to you
          and/or your family?
        </button>

        <button
          type="button"
          className={`tdp-toggle ${raffle ? "on" : ""}`}
          onClick={() => setRaffle(!raffle)}
          aria-pressed={raffle}
        >
          <i /> Enter me in the Mattoon Texas Roadhouse raffle for a chance to win
          one of 5 $40 restaurant gift cards.
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
          <i /> I understand one meal kit per household and agree to bring a valid
          Mil/Vet ID or DD214 for pickup.
        </button>
      </div>

      <div id="turnstile-container" style={{ height: 0, overflow: "hidden" }} />

      <button type="submit" className="tdp-submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Complete RSVP"}
      </button>

      {message && (
        <div className={`tdp-msg ${/^(✅|Success)/.test(message) ? "ok" : "err"}`}>
          {message}
        </div>
      )}
    </form>
  );
}
