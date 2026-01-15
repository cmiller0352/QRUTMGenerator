import React, { useCallback, useEffect, useState } from "react";
import "../turkeydrop/turkeydrop2025/turkeydrop2025.css";
import ShieldIMG from "../../assets/rhp-shield.png";
import ShieldFooterIMG from "../../assets/shield.png";
import { supabase } from "../../utils/supabaseClient";

const SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || "";
const EVENT_ID = "open-house-2026";
const SLOT_ID = "8b5cbb3f-8db6-4027-a40f-76ca69bf0335";
const CAPACITY = 100;

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

const EVENT_DETAILS = {
  title: "Road Home Program Open House",
  date: "March 26, 2026",
  time: "3:30–6:30 PM",
  address: "323 S. Paulina St., Suite 200, Chicago, IL 60612",
  note: "Parking validation provided and easy access to public transit.",
};

function MultiChipGroup({ label, ariaLabel, options, values, setValues, id }) {
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
        aria-label={ariaLabel || (typeof label === "string" ? label : undefined)}
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
              id={`${id}-${opt.replace(/\W+/g, "-").toLowerCase()}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function OpenHouseRsvpPage() {
  const [rsvpCount, setRsvpCount] = useState(null);
  const [countError, setCountError] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [digits, setDigits] = useState("");
  const [status, setStatus] = useState(STATUS_OPTIONS[0]);
  const [eras, setEras] = useState([]);
  const [branches, setBranches] = useState([]);
  const [peerContact, setPeerContact] = useState(false);
  const [addToMailingList, setAddToMailingList] = useState(true);
  const consent = true;

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});

  const [scriptReady, setScriptReady] = useState(false);
  const [widgetId, setWidgetId] = useState(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const showServiceFields = SERVICE_STATUSES.has(status);

  const markReady = useCallback((reason) => {
    setScriptReady((prev) => {
      if (!prev) {
        // eslint-disable-next-line no-console
        console.log(`[Turnstile] ready (${reason})`);
      }
      return true;
    });
  }, []);

  const pageTitle = "Road Home Program Open House";

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  const loadCount = useCallback(async () => {
    const { count, error } = await supabase
      .from("rsvps")
      .select("*", { count: "exact", head: true })
      .eq("event_id", EVENT_ID);
    if (!error && typeof count === "number") {
      setRsvpCount(count);
      setCountError(false);
    } else {
      setCountError(true);
    }
  }, []);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  // Turnstile script loader
  useEffect(() => {
    if (!SITE_KEY) return;
    if (window.turnstile) {
      markReady("window");
      return;
    }
    const existing = document.getElementById("cf-turnstile-script");
    if (existing) {
      let tries = 0;
      const interval = setInterval(() => {
        tries += 1;
        if (window.turnstile) {
          markReady("poll");
          clearInterval(interval);
          return;
        }
        if (tries >= 20) {
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
    const script = document.createElement("script");
    script.id = "cf-turnstile-script";
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => markReady("script");
    document.head.appendChild(script);
    return () => {
      script.onload = null;
    };
  }, [markReady]);

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

  const isEmail = useCallback((val) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(val), []);

  const scrollToFirstError = useCallback((errs) => {
    const order = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "status",
      "eras",
      "branches",
      "peerContact",
    ];
    const key = order.find((k) => errs[k]);
    if (!key) return;
    const node = document.querySelector(`[data-field="${key}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const filled = typeof rsvpCount === "number" ? rsvpCount : null;
  const pct =
    typeof filled === "number"
      ? Math.min(100, Math.round((filled / CAPACITY) * 100))
      : 0;
  const remaining =
    typeof filled === "number" ? Math.max(0, CAPACITY - filled) : null;

  useEffect(() => {
    if (!showServiceFields) {
      setEras([]);
      setBranches([]);
    }
  }, [showServiceFields]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setSubmitting(true);

    const nextErrors = {};
    if (!firstName.trim()) nextErrors.firstName = "Required";
    if (!lastName.trim()) nextErrors.lastName = "Required";
    if (!email.trim() || !isEmail(email.trim())) nextErrors.email = "Required";
    if (digits.length !== 10) nextErrors.phone = "Required";
    if (!status) nextErrors.status = "Required";
    if (showServiceFields) {
      if (!eras.length) nextErrors.eras = "Select at least one era.";
      if (!branches.length) nextErrors.branches = "Select at least one branch.";
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
      setMessage("❌ Human verification failed. Please try again.");
      setSubmitting(false);
      return;
    }

    const payload = {
      event_id: EVENT_ID,
      slot_id: SLOT_ID,
      family_size: 1,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone,
      status,
      branch_of_service: showServiceFields ? branches : [],
      era_list: showServiceFields ? eras : [],
      peer_contact_opt_in: peerContact,
      add_to_mailing_list: addToMailingList,
      interests: ["Open House updates"],
      consent,
      page_path: window.location.pathname,
      source: "open-house-rsvp",
      cf_turnstile_token: token,
    };

    // eslint-disable-next-line no-console
    console.log("[OpenHouse RSVP] payload", payload);

    try {
      const { data, error } = await supabase.functions.invoke("reserve-rsvp", {
        body: payload,
      });
      if (error) {
        setMessage(
          `❌ ${
            error.message ||
            "Something went wrong. Please email events@roadhomeprogram.org."
          }`
        );
        refreshTurnstile();
        return;
      }
      if (data?.ok || data?.success) {
        // eslint-disable-next-line no-console
        console.log("[OpenHouse RSVP] mailing_list result", data?.mailing_list);
        window.location.href = "/open-house/thankyou";
        return;
      }
      setMessage(
        `⚠️ ${
          data?.error ||
          "Something went wrong. Please email events@roadhomeprogram.org."
        }`
      );
      refreshTurnstile();
    } catch (err) {
      setMessage(
        `❌ ${
          err.message ||
          "Something went wrong. Please email events@roadhomeprogram.org."
        }`
      );
      refreshTurnstile();
    } finally {
      setSubmitting(false);
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
            {EVENT_DETAILS.title}
          </p>
          <h1 className="tdp-title" style={{ lineHeight: 1.05, marginTop: 4 }}>
            Experience our care in person
          </h1>
          <p className="tdp-sub" style={{ marginTop: 12 }}>
            Date: {EVENT_DETAILS.date}
            <br />
            Time: {EVENT_DETAILS.time}
            <br />
            Address: {EVENT_DETAILS.address}
          </p>

          <div className="tdp-block" style={{ marginTop: 24 }}>
            <h3>Capacity</h3>
            <div className="tdp-progress">
              <div
                className="tdp-progress-bar"
                style={{ width: `${pct}%` }}
                aria-hidden="true"
              />
            </div>
            <div className="tdp-progress-meta">
              <span>
                RSVPs {typeof filled === "number" ? filled : "—"} / {CAPACITY}
              </span>
              <span>
                Remaining spots:{" "}
                {typeof remaining === "number" ? remaining : "—"}
              </span>
            </div>
            {countError && (
              <p className="tdp-help" style={{ marginTop: 8 }}>
                Live capacity is temporarily unavailable. Please continue to
                submit your RSVP.
              </p>
            )}
          </div>

          <p className="tdp-help" style={{ marginTop: 24 }}>
            {EVENT_DETAILS.note}
          </p>
        </section>

        <section className="tdp-right">
          <article className="tdp-card">
            <h2 className="tdp-card-title">RSVP now</h2>
            <p className="tdp-card-sub">
              Meet our Veteran Outreach Team, tour the space, and learn how Road
              Home Program supports service members and military families.
            </p>
            <form className="tdp-form" onSubmit={handleSubmit} noValidate>
              <fieldset disabled={submitting} style={{ border: 0, padding: 0 }}>
                <div className="tdp-row">
                  <label data-field="firstName">
                    First name*
                    <input
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        if (errors.firstName)
                          setErrors((prev) => ({ ...prev, firstName: undefined }));
                      }}
                      aria-invalid={!!errors.firstName}
                    />
                  </label>
                  <label data-field="lastName">
                    Last name*
                    <input
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        if (errors.lastName)
                          setErrors((prev) => ({ ...prev, lastName: undefined }));
                      }}
                      aria-invalid={!!errors.lastName}
                    />
                  </label>
                </div>

                <div className="tdp-row">
                  <label data-field="email">
                    Email*
                    <input
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email)
                          setErrors((prev) => ({ ...prev, email: undefined }));
                      }}
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

                <label data-field="status" className="tdp-status">
                  Status*
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    aria-invalid={!!errors.status}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>

                {showServiceFields && (
                  <>
                    <div
                      data-field="eras"
                      className={`tdp-section ${
                        errors.eras ? "tdp-err-ring" : ""
                      }`}
                    >
                      <MultiChipGroup
                        label="Service era(s)*"
                        options={ERAS}
                        values={eras}
                        setValues={setEras}
                        id="era"
                      />
                      {errors.eras && (
                        <div className="tdp-err">{errors.eras}</div>
                      )}
                    </div>

                    <div
                      data-field="branches"
                      className={`tdp-section ${
                        errors.branches ? "tdp-err-ring" : ""
                      }`}
                    >
                      <MultiChipGroup
                        label="Branch(es) of service*"
                        options={BRANCHES}
                        values={branches}
                        setValues={setBranches}
                        id="branch"
                      />
                      {errors.branches && (
                        <div className="tdp-err">{errors.branches}</div>
                      )}
                    </div>
                  </>
                )}

                <label
                  data-field="peerContact"
                  className="tdp-check"
                  style={{ marginTop: 20 }}
                >
                  <input
                    type="checkbox"
                    checked={peerContact}
                    onChange={(e) => setPeerContact(e.target.checked)}
                  />
                  <span>
                    Would you like to connect with a member of our Veteran
                    Outreach Team to learn more about our program?
                  </span>
                </label>

                <label className="tdp-check" style={{ marginTop: 12 }}>
                  <input
                    type="checkbox"
                    checked={addToMailingList}
                    onChange={(e) => setAddToMailingList(e.target.checked)}
                  />
                  <span>Add me to the Road Home Program mailing list.</span>
                </label>

                {message && <div className="tdp-msg">{message}</div>}

                <div
                  id="turnstile-container"
                  style={{ height: 0, overflow: "hidden" }}
                />

                <button className="tdp-submit" type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit RSVP"}
                </button>
              </fieldset>
            </form>

            <p className="tdp-help" style={{ marginTop: 12 }}>
              Prefer to RSVP by phone? Call <a href="tel:13129428387">(312) 942-8387</a>.
            </p>
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
  );
}
