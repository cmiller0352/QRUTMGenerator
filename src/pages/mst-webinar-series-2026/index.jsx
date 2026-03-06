import React, { useCallback, useEffect, useMemo, useState } from "react";
import "../turkeydrop/turkeydrop2025/turkeydrop2025.css";
import ShieldIMG from "../../assets/rhp-shield.png";
import ShieldFooterIMG from "../../assets/shield.png";
import { supabase } from "../../utils/supabaseClient";

const SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || "";

const SESSION_EVENT_IDS = [
  "mst-webinar-2026-04-08",
  "mst-webinar-2026-04-15",
  "mst-webinar-2026-04-22",
  "mst-webinar-2026-04-29",
];

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

export default function MstWebinarSeries2026Page() {
  const utm = useMemo(() => parseUtm(), []);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [digits, setDigits] = useState("");
  const [status, setStatus] = useState(STATUS_OPTIONS[0]);
  const [branches, setBranches] = useState([]);
  const [eras, setEras] = useState([]);
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [addToMailingList, setAddToMailingList] = useState(true);
  const [sessionOptions, setSessionOptions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionLoadError, setSessionLoadError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageCode, setMessageCode] = useState("");
  const [errors, setErrors] = useState({});

  const [scriptReady, setScriptReady] = useState(false);
  const [widgetId, setWidgetId] = useState(null);
  const [captchaToken, setCaptchaToken] = useState("");

  const showServiceFields = SERVICE_STATUSES.has(status);

  useEffect(() => {
    document.title = "MST and Healing Webinar Series RSVP";
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSessions = async () => {
      setLoadingSessions(true);
      setSessionLoadError("");

      const { data, error } = await supabase
        .from("pickup_slots")
        .select("id, event_id, label, start_utc, end_utc")
        .in("event_id", SESSION_EVENT_IDS);

      if (!isMounted) return;

      if (error) {
        setSessionOptions([]);
        setSessionLoadError(
          "We could not load webinar sessions right now. Please refresh and try again."
        );
        setLoadingSessions(false);
        return;
      }

      const sorted = (data || []).sort(
        (a, b) =>
          SESSION_EVENT_IDS.indexOf(a.event_id) - SESSION_EVENT_IDS.indexOf(b.event_id)
      );

      const options = sorted.map((row) => ({
        event_id: row.event_id,
        slot_id: row.id,
        label: row.label,
      }));

      setSessionOptions(options);
      setSelectedSessionIds((prev) =>
        prev.filter((id) => options.some((opt) => opt.event_id === id))
      );

      if (!options.length) {
        setSessionLoadError("No webinar sessions are currently available.");
      }

      setLoadingSessions(false);
    };

    loadSessions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!showServiceFields) {
      setBranches([]);
      setEras([]);
    }
  }, [showServiceFields]);

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

    const script = document.createElement("script");
    script.id = "cf-turnstile-script";
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptReady(true);
    document.head.appendChild(script);
    return () => {
      script.onload = null;
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

  const onPhoneChange = (e) => {
    const nextDigits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setDigits(nextDigits);
    setPhone(formatPhone(nextDigits));
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
  };

  const isEmail = useCallback((value) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value), []);

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

  const scrollToFirstError = useCallback((errs) => {
    const order = [
      "selectedSessions",
      "firstName",
      "lastName",
      "email",
      "phone",
      "city",
      "stateRegion",
      "country",
      "postalCode",
      "status",
      "branches",
      "eras",
    ];
    const key = order.find((item) => errs[item]);
    if (!key) return;
    const node = document.querySelector(`[data-field="${key}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageCode("");
    setSubmitting(true);

    const nextErrors = {};
    if (!selectedSessionIds.length) {
      nextErrors.selectedSessions = "Select at least one session.";
    }
    if (sessionLoadError || loadingSessions) {
      nextErrors.selectedSessions = "Sessions are unavailable right now.";
    }
    if (!firstName.trim()) nextErrors.firstName = "Required";
    if (!lastName.trim()) nextErrors.lastName = "Required";
    if (!email.trim() || !isEmail(email.trim())) {
      nextErrors.email = "Valid email required";
    }
    if (digits.length > 0 && digits.length !== 10) {
      nextErrors.phone = "Enter a 10-digit phone number or leave blank";
    }
    if (!city.trim()) nextErrors.city = "Required";
    if (!stateRegion.trim()) nextErrors.stateRegion = "Required";
    if (!country.trim()) nextErrors.country = "Required";
    if (postalCode.trim() && postalCode.trim().length < 3) {
      nextErrors.postalCode = "Enter a valid postal code";
    }
    if (!status) nextErrors.status = "Required";
    if (showServiceFields) {
      if (!branches.length) nextErrors.branches = "Select at least one branch.";
      if (!eras.length) nextErrors.eras = "Select at least one era.";
    }

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
      setMessage("Human verification failed. Please try again.");
      setSubmitting(false);
      return;
    }

    const selectedSessions = sessionOptions.filter((session) =>
      selectedSessionIds.includes(session.event_id)
    ).map((session) => ({
      event_id: session.event_id,
      slot_id: session.slot_id,
      label: session.label,
    }));

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: digits.length === 10 ? phone : "",
      status,
      branch_of_service: showServiceFields ? branches : [],
      era_list: showServiceFields ? eras : [],
      city: city.trim(),
      state: stateRegion.trim(),
      country: country.trim(),
      postal_code: postalCode.trim(),
      preferred_contact: "Email",
      add_to_mailing_list: addToMailingList,
      interests: ["MST webinar updates"],
      consent: true,
      source: "mst-webinar-series-2026",
      require_location: true,
      page_path: window.location.pathname,
      referrer: document.referrer || null,
      ...utm,
      cf_turnstile_token: token,
      session_selections: selectedSessions,
    };
    // Temporary debug log for RSVP payload verification.
    console.log("Submitting RSVP payload:", payload);

    try {
      const { data, error } = await supabase.functions.invoke("reserve-rsvp", {
        body: payload,
      });

      let responseData = data && typeof data === "object" ? data : null;
      if (!responseData && error) {
        responseData = await extractResponseFromError(error);
      }

      if (error && !responseData) {
        setMessage("Something went wrong. Please email events@roadhomeprogram.org.");
        refreshTurnstile();
        return;
      }

      if (responseData?.ok === true) {
        try {
          const selectedLabels = selectedSessions.map((session) => session.label);
          sessionStorage.setItem(
            "mst-webinar-series-2026:selectedSessions",
            JSON.stringify(selectedLabels)
          );
        } catch {
          // ignore storage issues
        }
        window.location.href = "/mst-webinar-series-2026/thankyou";
        return;
      }

      const code = responseData?.code || "";
      setMessageCode(code);
      if (code === "DUPLICATE_RSVP") {
        setMessage(
          "It looks like you already RSVP'd for one or more selected sessions. If you need help, email events@roadhomeprogram.org."
        );
      } else {
        setMessage(
          responseData?.error ||
            "Something went wrong. Please email events@roadhomeprogram.org."
        );
      }
      refreshTurnstile();
    } catch {
      setMessage("Something went wrong. Please email events@roadhomeprogram.org.");
      refreshTurnstile();
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSession = (eventId) => {
    if (loadingSessions || sessionLoadError) return;
    setSelectedSessionIds((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
    if (errors.selectedSessions) {
      setErrors((prev) => ({ ...prev, selectedSessions: undefined }));
    }
  };

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
            Free webinar series for clinical providers and community professionals
          </p>
          <h1 className="tdp-title" style={{ lineHeight: 1.05, marginTop: 4 }}>
            MST and Healing: Conversations on Health, Relationships, and Care
          </h1>

          <p className="tdp-sub" style={{ marginTop: 12 }}>
            Wednesdays in April 2026, 12:00 PM - 1:00 PM Central
          </p>

          <div className="tdp-block" style={{ marginTop: 20 }}>
            <h3 style={{ marginTop: 0 }}>Sessions</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Wednesday, April 8, 2026</li>
              <li>Wednesday, April 15, 2026</li>
              <li>Wednesday, April 22, 2026</li>
              <li>Wednesday, April 29, 2026</li>
            </ul>
            <p className="tdp-help" style={{ marginTop: 10, marginBottom: 0 }}>
              Each session is eligible for 1 CE credit.
            </p>
          </div>

          <p className="tdp-help" style={{ marginTop: 16 }}>
            Questions? Email <a href="mailto:events@roadhomeprogram.org">events@roadhomeprogram.org</a>{" "}
            or call <a href="tel:13129428387">(312) 942-8387 (VETS)</a>.
          </p>
        </section>

        <section className="tdp-right">
          <article className="tdp-card">
            <h2 className="tdp-card-title">Reserve your webinar sessions</h2>
            <p className="tdp-card-sub">
              Select one or more sessions. Registration is one person per form submission.
            </p>

            <form className="tdp-form" onSubmit={handleSubmit} noValidate>
              <fieldset disabled={submitting} style={{ border: 0, padding: 0, margin: 0 }}>
                <div
                  data-field="selectedSessions"
                  className={`tdp-section ${errors.selectedSessions ? "tdp-err-ring" : ""}`}
                  aria-disabled={loadingSessions}
                >
                  <div className="tdp-chips-head">Select sessions*</div>
                  {loadingSessions && (
                    <p className="tdp-help" style={{ marginTop: 6 }}>
                      Loading sessions...
                    </p>
                  )}
                  {sessionLoadError && (
                    <div className="tdp-err" style={{ marginTop: 6 }}>
                      {sessionLoadError}
                    </div>
                  )}
                  <div className="chip-grid" role="group" aria-label="Select sessions">
                    {sessionOptions.map((session) => {
                      const selected = selectedSessionIds.includes(session.event_id);
                      return (
                        <button
                          key={session.event_id}
                          type="button"
                          className="chip-btn"
                          aria-pressed={selected}
                          disabled={loadingSessions || !!sessionLoadError}
                          onClick={() => toggleSession(session.event_id)}
                        >
                          {session.label}
                        </button>
                      );
                    })}
                  </div>
                  {errors.selectedSessions && (
                    <div className="tdp-err">{errors.selectedSessions}</div>
                  )}
                </div>

                <div className="tdp-row">
                  <label data-field="firstName">
                    First name*
                    <input
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        if (errors.firstName) {
                          setErrors((prev) => ({ ...prev, firstName: undefined }));
                        }
                      }}
                      aria-invalid={!!errors.firstName}
                    />
                    {errors.firstName && <div className="tdp-err">{errors.firstName}</div>}
                  </label>

                  <label data-field="lastName">
                    Last name*
                    <input
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        if (errors.lastName) {
                          setErrors((prev) => ({ ...prev, lastName: undefined }));
                        }
                      }}
                      aria-invalid={!!errors.lastName}
                    />
                    {errors.lastName && <div className="tdp-err">{errors.lastName}</div>}
                  </label>
                </div>

                <div className="tdp-row">
                  <label data-field="email">
                    Email*
                    <input
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) {
                          setErrors((prev) => ({ ...prev, email: undefined }));
                        }
                      }}
                      aria-invalid={!!errors.email}
                    />
                    {errors.email && <div className="tdp-err">{errors.email}</div>}
                  </label>

                  <label data-field="phone">
                    Phone (optional)
                    <input
                      value={phone}
                      onChange={onPhoneChange}
                      placeholder="(###) ###-####"
                      aria-invalid={!!errors.phone}
                    />
                    {errors.phone && <div className="tdp-err">{errors.phone}</div>}
                  </label>
                </div>

                <div className="tdp-row">
                  <label data-field="city">
                    City*
                    <input
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        if (errors.city) setErrors((prev) => ({ ...prev, city: undefined }));
                      }}
                      aria-invalid={!!errors.city}
                    />
                    {errors.city && <div className="tdp-err">{errors.city}</div>}
                  </label>

                  <label data-field="stateRegion">
                    State/Region*
                    <input
                      value={stateRegion}
                      onChange={(e) => {
                        setStateRegion(e.target.value);
                        if (errors.stateRegion) {
                          setErrors((prev) => ({ ...prev, stateRegion: undefined }));
                        }
                      }}
                      aria-invalid={!!errors.stateRegion}
                    />
                    {errors.stateRegion && (
                      <div className="tdp-err">{errors.stateRegion}</div>
                    )}
                  </label>
                </div>

                <div className="tdp-row">
                  <label data-field="country">
                    Country*
                    <input
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value);
                        if (errors.country) {
                          setErrors((prev) => ({ ...prev, country: undefined }));
                        }
                      }}
                      aria-invalid={!!errors.country}
                    />
                    {errors.country && <div className="tdp-err">{errors.country}</div>}
                  </label>

                  <label data-field="postalCode">
                    Postal code (optional)
                    <input
                      value={postalCode}
                      onChange={(e) => {
                        setPostalCode(e.target.value);
                        if (errors.postalCode) {
                          setErrors((prev) => ({ ...prev, postalCode: undefined }));
                        }
                      }}
                      aria-invalid={!!errors.postalCode}
                    />
                    {errors.postalCode && (
                      <div className="tdp-err">{errors.postalCode}</div>
                    )}
                  </label>
                </div>

                <label data-field="status" className="tdp-status">
                  Status*
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      if (errors.status) setErrors((prev) => ({ ...prev, status: undefined }));
                    }}
                    aria-invalid={!!errors.status}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {errors.status && <div className="tdp-err">{errors.status}</div>}
                </label>

                {showServiceFields && (
                  <>
                    <div
                      data-field="branches"
                      className={`tdp-section ${errors.branches ? "tdp-err-ring" : ""}`}
                    >
                      <MultiChipGroup
                        label="Branch of service (select all that apply)*"
                        options={BRANCHES}
                        values={branches}
                        setValues={setBranches}
                        idPrefix="mst-branch"
                      />
                      {errors.branches && <div className="tdp-err">{errors.branches}</div>}
                    </div>

                    <div
                      data-field="eras"
                      className={`tdp-section ${errors.eras ? "tdp-err-ring" : ""}`}
                    >
                      <MultiChipGroup
                        label="Service era (select all that apply)*"
                        options={ERAS}
                        values={eras}
                        setValues={setEras}
                        idPrefix="mst-era"
                      />
                      {errors.eras && <div className="tdp-err">{errors.eras}</div>}
                    </div>
                  </>
                )}

                <label className="tdp-check" style={{ marginTop: 12 }}>
                  <input
                    type="checkbox"
                    checked={addToMailingList}
                    onChange={(e) => setAddToMailingList(e.target.checked)}
                  />
                  <span>
                    Send me future Road Home Program updates and webinar announcements.
                  </span>
                </label>

                <p className="tdp-help" style={{ marginTop: 8 }}>
                  Preferred contact method: Email
                </p>

                {message && (
                  <>
                    <div className="tdp-msg">{message}</div>
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
                  </>
                )}

                <div id="turnstile-container" style={{ height: 0, overflow: "hidden" }} />

                <button
                  className="tdp-submit"
                  type="submit"
                  disabled={submitting || loadingSessions || !!sessionLoadError}
                >
                  {submitting ? "Submitting..." : "Submit RSVP"}
                </button>
              </fieldset>
            </form>
          </article>
        </section>
      </main>

      <RHPSiteFooter />
    </>
  );
}

function RHPSiteFooter() {
  return (
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
              The National Center of Excellence for Veterans and Their Families at Rush
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
          <a href="https://roadhomeprogram.org/outpatient-program/">Outpatient Program</a>
          <a href="https://roadhomeprogram.org/outreach-and-events/">Outreach and Events</a>
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

        <div className="tdp-footer__legal">© {new Date().getFullYear()} Road Home Program at Rush.</div>
      </div>
    </footer>
  );
}
