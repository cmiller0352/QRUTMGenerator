import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../turkeydrop/turkeydrop2025/turkeydrop2025.css";
import ShieldIMG from "../../assets/rhp-shield.png";
import ShieldFooterIMG from "../../assets/shield.png";
import { supabase } from "../../utils/supabaseClient";
import { generateTrackingId } from "./tracking";

const SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || "";

const PROOF_NOTICE =
  "Proof of service is required for entry. Please bring a military ID, VA ID, or other proof of service.";

const STATUS_OPTIONS = [
  "Veteran",
  "Active Duty",
  "Guard/Reserve",
  "Family Member/Caregiver",
  "Provider/Community Partner",
  "Other",
];

const SERVICE_STATUSES = new Set(["Veteran", "Active Duty", "Guard/Reserve"]);

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

function parseUtm() {
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get("utm_source"),
    utm_medium: p.get("utm_medium"),
    utm_campaign: p.get("utm_campaign"),
    utm_term: p.get("utm_term"),
    utm_content: p.get("utm_content"),
  };
}

function initialAttendee() {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    digits: "",
    status: "Veteran",
    branches: [],
    eras: [],
  };
}

function MultiChipGroup({ label, options, values, onToggle, idPrefix }) {
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
              onClick={() => onToggle(opt)}
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

export default function SdRsvpPage({ event }) {
  const navigate = useNavigate();
  const utm = useMemo(() => parseUtm(), []);
  const isMultiMode = event?.mode === "multi";
  const isFamilyMode = event?.mode === "family";
  const maxAttendees = Math.max(1, event?.limits?.maxAttendees || 1);
  const maxPartySize = Math.max(1, event?.limits?.maxPartySize || 4);

  const [attendees, setAttendees] = useState([initialAttendee()]);
  const [partySize, setPartySize] = useState(1);
  const [consent, setConsent] = useState(false);

  const [message, setMessage] = useState("");
  const [messageCode, setMessageCode] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [scriptReady, setScriptReady] = useState(false);
  const [widgetId, setWidgetId] = useState(null);
  const [captchaToken, setCaptchaToken] = useState("");

  useEffect(() => {
    if (event?.title) document.title = event.title;
  }, [event?.title]);

  useEffect(() => {
    if (!SITE_KEY) return;
    if (window.turnstile) {
      setScriptReady(true);
      return;
    }
    const existing = document.getElementById("cf-turnstile-script");
    if (existing) {
      let tries = 0;
      const interval = setInterval(() => {
        tries += 1;
        if (window.turnstile) {
          setScriptReady(true);
          clearInterval(interval);
          return;
        }
        if (tries >= 20) clearInterval(interval);
      }, 100);
      return () => clearInterval(interval);
    }
    const s = document.createElement("script");
    s.id = "cf-turnstile-script";
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => setScriptReady(true);
    document.head.appendChild(s);
    return () => {
      s.onload = null;
    };
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

  useEffect(() => {
    if (!captchaToken) return;
    const ev = new CustomEvent("cf-turnstile-token", {
      detail: { token: captchaToken },
    });
    document.dispatchEvent(ev);
  }, [captchaToken]);

  const getTurnstileToken = useCallback(async () => {
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
  }, [captchaToken, widgetId]);

  const refreshTurnstile = useCallback(() => {
    setCaptchaToken("");
    if (window.turnstile && widgetId) window.turnstile.reset(widgetId);
  }, [widgetId]);

  const formatPhone = (d) => {
    const a = d.slice(0, 3);
    const b = d.slice(3, 6);
    const c = d.slice(6, 10);
    if (d.length <= 3) return `(${a}`;
    if (d.length <= 6) return `(${a}) ${b}`;
    return `(${a}) ${b}-${c}`;
  };

  const isEmail = (v) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(v);

  const extractResponseFromError = async (errorObj) => {
    if (!errorObj?.context || typeof errorObj.context.json !== "function") {
      return null;
    }
    try {
      const parsed = await errorObj.context.json();
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // ignore parse failures
    }
    return null;
  };

  const updateAttendee = (index, updater) => {
    setAttendees((prev) =>
      prev.map((attendee, i) => (i === index ? updater(attendee) : attendee))
    );
  };

  const updateAttendeeField = (index, field, value) => {
    updateAttendee(index, (attendee) => ({ ...attendee, [field]: value }));
    const fieldKey = `attendees.${index}.${field}`;
    if (errors[fieldKey]) {
      setErrors((prev) => ({ ...prev, [fieldKey]: undefined }));
    }
  };

  const onPhoneChange = (index, value) => {
    const nextDigits = value.replace(/\D/g, "").slice(0, 10);
    updateAttendee(index, (attendee) => ({
      ...attendee,
      digits: nextDigits,
      phone: formatPhone(nextDigits),
    }));
    const fieldKey = `attendees.${index}.phone`;
    if (errors[fieldKey]) {
      setErrors((prev) => ({ ...prev, [fieldKey]: undefined }));
    }
  };

  const toggleAttendeeChip = (index, field, option) => {
    updateAttendee(index, (attendee) => {
      const current = attendee[field];
      const next = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option];
      return { ...attendee, [field]: next };
    });
    const fieldKey = `attendees.${index}.${field}`;
    if (errors[fieldKey]) {
      setErrors((prev) => ({ ...prev, [fieldKey]: undefined }));
    }
  };

  const addAttendee = () => {
    if (!isMultiMode || attendees.length >= maxAttendees) return;
    setAttendees((prev) => [...prev, initialAttendee()]);
  };

  const removeAttendee = (index) => {
    if (!isMultiMode || attendees.length <= 1) return;
    setAttendees((prev) => prev.filter((_, i) => i !== index));
    setErrors({});
  };

  const scrollToFirstError = (errs) => {
    const keys = Object.keys(errs).filter((key) => errs[key]);
    if (!keys.length) return;
    const firstKey = keys.sort()[0];
    const node = document.querySelector(`[data-field="${firstKey}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageCode("");
    setSubmitting(true);

    const nextErrors = {};

    attendees.forEach((attendee, index) => {
      const prefix = `attendees.${index}`;
      if (!attendee.firstName.trim()) nextErrors[`${prefix}.firstName`] = "Required";
      if (!attendee.lastName.trim()) nextErrors[`${prefix}.lastName`] = "Required";
      if (!attendee.email.trim() || !isEmail(attendee.email.trim())) {
        nextErrors[`${prefix}.email`] = "Required";
      }
      if (attendee.digits.length !== 10) nextErrors[`${prefix}.phone`] = "Required";
      if (!attendee.status) nextErrors[`${prefix}.status`] = "Required";
      if (!attendee.branches.length) {
        nextErrors[`${prefix}.branches`] = "Select at least one branch.";
      }
      if (SERVICE_STATUSES.has(attendee.status) && !attendee.eras.length) {
        nextErrors[`${prefix}.eras`] = `Attendee ${index + 1}: Select at least one era.`;
      }
    });

    if (isFamilyMode) {
      if (!Number.isFinite(partySize) || partySize < 1 || partySize > maxPartySize) {
        nextErrors.partySize = `Party size must be between 1 and ${maxPartySize}.`;
      }
    }

    if (!consent) nextErrors.consent = "Required";

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setMessage("Please fix the highlighted fields and try again.");
      scrollToFirstError(nextErrors);
      setSubmitting(false);
      return;
    }

    let token = captchaToken;
    if (!token && window.turnstile && widgetId) token = await getTurnstileToken();
    if (!token) {
      setMessage("❌ Human verification failed. Please try again.");
      setSubmitting(false);
      return;
    }

    const orderId = generateTrackingId();

    try {
      for (let i = 0; i < attendees.length; i += 1) {
        const attendee = attendees[i];
        const attendeeId = generateTrackingId();

        const payload = {
          event_id: event.event_id,
          slot_id: event.slot_id,
          first_name: attendee.firstName.trim(),
          last_name: attendee.lastName.trim(),
          email: attendee.email.trim(),
          phone: attendee.phone,
          status: attendee.status,
          branch_of_service: attendee.branches,
          era_list: SERVICE_STATUSES.has(attendee.status) ? attendee.eras : [],
          consent: true,
          order_id: orderId,
          attendee_id: attendeeId,
          attendee_index: i,
          page_path: window.location.pathname,
          referrer: document.referrer || null,
          ...utm,
          cf_turnstile_token: token,
        };
        if (isFamilyMode) payload.family_size = partySize;

        const { data, error } = await supabase.functions.invoke("reserve-rsvp", {
          body: payload,
        });

        let responseData = data && typeof data === "object" ? data : null;
        if (!responseData && error) {
          responseData = await extractResponseFromError(error);
        }

        if (error && !responseData) {
          setMessage(`Attendee ${i + 1}: Something went wrong. Please email events@roadhomeprogram.org.`);
          refreshTurnstile();
          return;
        }

        if (responseData?.ok === false) {
          const code = responseData.code || "";
          setMessageCode(code);
          setMessage(`Attendee ${i + 1}: ${responseData.error || "Something went wrong. Please review and try again."}`);
          refreshTurnstile();
          return;
        }

        if (responseData?.ok !== true) {
          setMessage(`Attendee ${i + 1}: Something went wrong. Please email events@roadhomeprogram.org.`);
          refreshTurnstile();
          return;
        }
      }

      const params = new URLSearchParams({
        event: event.key,
        order_id: orderId,
        count: String(isFamilyMode ? partySize : attendees.length),
      });
      if (isFamilyMode) params.set("party_size", String(partySize));
      navigate(`/sd/thank-you?${params.toString()}`);
    } catch {
      setMessage("❌ Something went wrong. Please email events@roadhomeprogram.org.");
      refreshTurnstile();
    } finally {
      setSubmitting(false);
    }
  };

  if (!event) return null;

  return (
    <>
      <main className="tdp-shell">
        <div
          className="tdp-bg"
          style={{ "--bg-url": `url(${ShieldIMG})` }}
          aria-hidden="true"
        />

        <section className="tdp-left">
          <p className="tdp-sub" style={{ margin: 0, fontWeight: 600 }}>
            Road Home Program San Diego Events
          </p>
          <h1 className="tdp-title" style={{ lineHeight: 1.05, marginTop: 4 }}>
            {event.title}
          </h1>
          <p className="tdp-sub" style={{ marginTop: 12 }}>
            Date: {event.dateLabel}
            <br />
            Time: {event.timeLabel}
            <br />
            Venue: {event.venueName}
            <br />
            {event.addressLines?.map((line) => (
              <React.Fragment key={line}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </p>

          <div
            className="tdp-block"
            style={{ marginTop: 24, border: "2px solid #8a6d00", background: "#fff9e6" }}
            role="note"
            aria-label="Proof of service notice"
          >
            <h3 style={{ marginTop: 0 }}>Important</h3>
            <p style={{ marginBottom: 0 }}>{PROOF_NOTICE}</p>
          </div>
        </section>

        <section className="tdp-right">
          <article className="tdp-card">
            <h2 className="tdp-card-title">RSVP</h2>
            <p className="tdp-card-sub">
              General Admission is preselected for this event.
            </p>

            <form className="tdp-form" onSubmit={handleSubmit} noValidate>
              <fieldset disabled={submitting} style={{ border: 0, padding: 0, margin: 0 }}>
                {attendees.map((attendee, index) => {
                  const prefix = `attendees.${index}`;
                  return (
                    <div
                      key={`attendee-${index}`}
                      className="tdp-block"
                      style={{ marginBottom: 16 }}
                    >
                      {isMultiMode && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <h3 style={{ margin: 0 }}>Attendee {index + 1}</h3>
                          <button
                            type="button"
                            className="tdp-ghost-btn"
                            onClick={() => removeAttendee(index)}
                            disabled={attendees.length <= 1}
                          >
                            Remove
                          </button>
                        </div>
                      )}

                      <div className="tdp-row" style={{ marginTop: isMultiMode ? 12 : 0 }}>
                        <label data-field={`${prefix}.firstName`}>
                          First name*
                          <input
                            value={attendee.firstName}
                            onChange={(e) => updateAttendeeField(index, "firstName", e.target.value)}
                            aria-invalid={!!errors[`${prefix}.firstName`]}
                          />
                          {errors[`${prefix}.firstName`] && (
                            <div className="tdp-err">{errors[`${prefix}.firstName`]}</div>
                          )}
                        </label>
                        <label data-field={`${prefix}.lastName`}>
                          Last name*
                          <input
                            value={attendee.lastName}
                            onChange={(e) => updateAttendeeField(index, "lastName", e.target.value)}
                            aria-invalid={!!errors[`${prefix}.lastName`]}
                          />
                          {errors[`${prefix}.lastName`] && (
                            <div className="tdp-err">{errors[`${prefix}.lastName`]}</div>
                          )}
                        </label>
                      </div>

                      <div className="tdp-row">
                        <label data-field={`${prefix}.email`}>
                          Email*
                          <input
                            value={attendee.email}
                            onChange={(e) => updateAttendeeField(index, "email", e.target.value)}
                            aria-invalid={!!errors[`${prefix}.email`]}
                          />
                          {errors[`${prefix}.email`] && (
                            <div className="tdp-err">{errors[`${prefix}.email`]}</div>
                          )}
                        </label>
                        <label data-field={`${prefix}.phone`}>
                          Phone*
                          <input
                            value={attendee.phone}
                            onChange={(e) => onPhoneChange(index, e.target.value)}
                            placeholder="(###) ###-####"
                            aria-invalid={!!errors[`${prefix}.phone`]}
                          />
                          {errors[`${prefix}.phone`] && (
                            <div className="tdp-err">{errors[`${prefix}.phone`]}</div>
                          )}
                        </label>
                      </div>

                      <label data-field={`${prefix}.status`} className="tdp-status">
                        Status*
                        <select
                          value={attendee.status}
                          onChange={(e) => updateAttendeeField(index, "status", e.target.value)}
                          aria-invalid={!!errors[`${prefix}.status`]}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        {errors[`${prefix}.status`] && (
                          <div className="tdp-err">{errors[`${prefix}.status`]}</div>
                        )}
                      </label>

                      <div
                        data-field={`${prefix}.branches`}
                        className={`tdp-section ${errors[`${prefix}.branches`] ? "tdp-err-ring" : ""}`}
                      >
                        <MultiChipGroup
                          label="Branch of Service (select all that apply)*"
                          options={BRANCHES}
                          values={attendee.branches}
                          onToggle={(option) => toggleAttendeeChip(index, "branches", option)}
                          idPrefix={`${event.slug}-attendee-${index + 1}-branch`}
                        />
                        {errors[`${prefix}.branches`] && (
                          <div className="tdp-err">{errors[`${prefix}.branches`]}</div>
                        )}
                      </div>

                      <div
                        data-field={`${prefix}.eras`}
                        className={`tdp-section ${errors[`${prefix}.eras`] ? "tdp-err-ring" : ""}`}
                      >
                        <MultiChipGroup
                          label="Service Era (select all that apply)"
                          options={ERAS}
                          values={attendee.eras}
                          onToggle={(option) => toggleAttendeeChip(index, "eras", option)}
                          idPrefix={`${event.slug}-attendee-${index + 1}-era`}
                        />
                        {errors[`${prefix}.eras`] && (
                          <div className="tdp-err">{errors[`${prefix}.eras`]}</div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isMultiMode && (
                  <button
                    type="button"
                    className="tdp-ghost-btn"
                    onClick={addAttendee}
                    disabled={attendees.length >= maxAttendees}
                    style={{ marginBottom: 16 }}
                  >
                    Add another attendee
                  </button>
                )}

                {isFamilyMode && (
                  <label data-field="partySize" className="tdp-status">
                    Party size*
                    <select
                      value={partySize}
                      onChange={(e) => {
                        setPartySize(Number(e.target.value));
                        if (errors.partySize) {
                          setErrors((prev) => ({ ...prev, partySize: undefined }));
                        }
                      }}
                      aria-invalid={!!errors.partySize}
                    >
                      {Array.from({ length: maxPartySize }, (_, idx) => idx + 1).map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    {errors.partySize && <div className="tdp-err">{errors.partySize}</div>}
                  </label>
                )}

                <label className="tdp-check" data-field="consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      if (errors.consent) {
                        setErrors((prev) => ({ ...prev, consent: undefined }));
                      }
                    }}
                  />
                  <span>I confirm this RSVP is accurate and I will bring proof of service.</span>
                </label>
                {errors.consent && <div className="tdp-err">{errors.consent}</div>}

                {message && (
                  <div className="tdp-msg" role="status" aria-live="polite">
                    {message}
                    {messageCode === "DUPLICATE_RSVP" && (
                      <button
                        type="button"
                        className="tdp-ghost-btn"
                        onClick={() => window.location.reload()}
                        style={{ marginTop: 8 }}
                      >
                        Refresh page
                      </button>
                    )}
                  </div>
                )}

                <div id="turnstile-container" style={{ height: 0, overflow: "hidden" }} />

                <button className="tdp-submit" type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit RSVP"}
                </button>
              </fieldset>
            </form>

            <p className="tdp-help" style={{ marginTop: 16 }}>
              Need assistance? Email{" "}
              <a href="mailto:events@roadhomeprogram.org">
                events@roadhomeprogram.org
              </a>{" "}
              or call <a href="tel:13129428387">(312) 942-8387 (VETS)</a>.
            </p>
          </article>
        </section>
      </main>

      <footer className="tdp-footer" role="contentinfo">
        <div className="tdp-footer__inner">
          <div className="tdp-footer__brand">
            <img
              src={ShieldFooterIMG}
              alt=""
              aria-hidden="true"
              className="tdp-footer__shield"
              decoding="async"
            />
            <div className="tdp-footer__brandtext">
              <div className="tdp-footer__title">Road Home Program</div>
              <div className="tdp-footer__org">
                The National Center of Excellence for Veterans and Their Families
                at Rush
              </div>
              <div className="tdp-footer__contact">
                1645 W. Jackson Blvd., Suite 602, Chicago, IL 60612
                <span className="tdp-dot" aria-hidden>
                  •
                </span>
                <a href="tel:13129428387">(312) 942-8387 (VETS)</a>
              </div>
            </div>
          </div>

          <nav className="tdp-footer__nav" aria-label="Footer">
            <a href="https://roadhomeprogram.org/family-center/">Help for Families</a>
            <a href="https://roadhomeprogram.org/get-care/">Get Care</a>
            <a href="https://roadhomeprogram.org/accelerated-treatment-program/">
              Accelerated Treatment Program
            </a>
            <a href="https://roadhomeprogram.org/outpatient-program/">
              Outpatient Program
            </a>
            <a href="https://roadhomeprogram.org/outreach-and-events/">
              Outreach and Events
            </a>
            <a href="https://roadhomeprogram.org/contact-us/">General Information</a>
            <a
              href="https://www.rush.edu/website-privacy-statement"
              target="_blank"
              rel="noreferrer"
            >
              Privacy Statement
            </a>
            <a href="https://www.rush.edu/disclaimer" target="_blank" rel="noreferrer">
              Disclaimer
            </a>
            <a
              href="https://www.rush.edu/sites/default/files/rush-nondiscrimination-policy.pdf"
              target="_blank"
              rel="noreferrer"
            >
              Nondiscrimination Policy
            </a>
          </nav>

          <div className="tdp-footer__legal">
            © {new Date().getFullYear()} Road Home Program at Rush.
          </div>
        </div>
      </footer>
    </>
  );
}
