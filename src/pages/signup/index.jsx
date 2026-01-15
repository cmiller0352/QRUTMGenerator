import React, { useEffect, useMemo, useState } from "react";
import "../turkeydrop/turkeydrop2025/turkeydrop2025.css";
import ShieldIMG from "../../assets/rhp-shield.png";
import ShieldFooterIMG from "../../assets/shield.png";

// Turnstile
const SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || "";

// Options (must match Edge Function allowed values)
const VETERAN_AFFILIATIONS = [
  "Veteran",
  "Active Duty",
  "Guard/Reserve",
  "Family Member/Caregiver",
  "Provider/Community Partner",
  "Other",
];

const PREFERRED_CONTACT = ["Email", "Phone", "Text"];

const INTERESTS = [
  "Open House updates",
  "Events/outreach",
  "Care/treatment information",
  "Referral information",
  "Research/education",
];

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

export default function MailingListSignup() {
  // Page text
  const pageTitleText = "Road Home Program Open House";
  const pageHeading = (
    <>
      Road Home Program
      <br />
      Open House
    </>
  );
  const pageSub =
    "Save the date details are coming soon. Join our mailing list to get the first invite and future updates.";
  const source = "open-house-waitlist";

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [phone, setPhone] = useState("");
  const [digits, setDigits] = useState("");

  const [zip, setZip] = useState("");

  const [veteranAffiliation, setVeteranAffiliation] = useState("Veteran");
  const [preferredContact, setPreferredContact] = useState("Email");

  const [selectedInterests, setSelectedInterests] = useState(["Open House updates"]);
  const [consent, setConsent] = useState(false);

  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});

  // Turnstile state (mirrors slot-picker.jsx)
  const [scriptReady, setScriptReady] = useState(false);
  const [widgetId, setWidgetId] = useState(null);
  const [captchaToken, setCaptchaToken] = useState("");

  const utm = useMemo(() => parseUtm(), []);

  useEffect(() => {
    document.title = pageTitleText;
  }, [pageTitleText]);

  // Turnstile script init
  useEffect(() => {
    if (!SITE_KEY) return;
    if (document.getElementById("cf-turnstile-script")) {
      setScriptReady(!!window.turnstile);
      return;
    }
    const s = document.createElement("script");
    s.id = "cf-turnstile-script";
    s.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => setScriptReady(true);
    document.head.appendChild(s);
  }, []);

  // Render widget once
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

  // Token promise helper (same event-based pattern)
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
    const ev = new CustomEvent("cf-turnstile-token", {
      detail: { token: captchaToken },
    });
    document.dispatchEvent(ev);
  }, [captchaToken]);

  const refreshTurnstile = () => {
    setCaptchaToken("");
    if (window.turnstile && widgetId) window.turnstile.reset(widgetId);
  };

  // Utilities
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

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
  };

  const onZipChange = (e) => {
    const next = e.target.value.replace(/\D/g, "").slice(0, 5);
    setZip(next);
    if (errors.zip) setErrors((p) => ({ ...p, zip: undefined }));
  };

  const toggleInterest = (val) => {
    setSelectedInterests((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const scrollToFirstError = (errs) => {
    const order = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "zip",
      "veteranAffiliation",
      "preferredContact",
      "interests",
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

    // Client validation (Edge Function will enforce too)
    const errs = {};
    if (!firstName.trim()) errs.firstName = "Required";
    if (!lastName.trim()) errs.lastName = "Required";
    if (!email.trim() || !isEmail(email.trim())) errs.email = "Valid email required";

    // Phone optional; if present must be 10 digits
    if (digits.length > 0 && digits.length !== 10) errs.phone = "10 digits";

    // ZIP optional; if present must be 5 digits
    if (zip.length > 0 && zip.length !== 5) errs.zip = "5 digits";

    if (!veteranAffiliation) errs.veteranAffiliation = "Required";
    if (!preferredContact) errs.preferredContact = "Required";

    if (!selectedInterests.length) errs.interests = "Pick at least one";

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
      source,
      page_path: window.location.pathname,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: digits.length === 10 ? phone : "", // Edge Function normalizes digits
      postal_code: zip.trim(),
      veteran_affiliation: veteranAffiliation,
      preferred_contact: preferredContact,
      interests: selectedInterests,
      consent: true,
      notes: notes.trim() || null,
      ...utm,
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
        if (resp.status === 400 && /Human verification/i.test(body?.error || "")) {
          setMessage("❌ Please complete the verification and try again.");
          refreshTurnstile();
          return;
        }
        setMessage(`⚠️ ${body?.error || `HTTP ${resp.status}`}`);
        refreshTurnstile();
        return;
      }

      // success OR already subscribed both go to thank you
      window.location.href = "/signup/thankyou";
    } catch (err) {
      setMessage(`❌ ${err.message || "Network error"}`);
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
          <h1 className="tdp-title" style={{ lineHeight: 1.05 }}>
            {pageHeading}
          </h1>
          <p className="tdp-sub" style={{ marginTop: 8 }}>
            {pageSub}
          </p>

          <div className="tdp-block" style={{ marginTop: 16 }}>
            <h3>What you will receive</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Open House date, location, and schedule</li>
              <li>Future outreach events and community updates</li>
              <li>Ways to connect with Road Home Program services</li>
            </ul>
          </div>

          <p className="tdp-help" style={{ marginTop: 16 }}>
            Questions? Email{" "}
            <a href="mailto:events@roadhomeprogram.org">
              events@roadhomeprogram.org
            </a>{" "}
            or call <a href="tel:13129428387">(312) 942-8387 (VETS)</a>.
          </p>
        </section>

        <section className="tdp-right">
          <article className="tdp-card">
            <h2 className="tdp-card-title">Join the mailing list</h2>
            <p className="tdp-card-sub">
              This takes about a minute. You can unsubscribe at any time.
            </p>

            <form className="tdp-form" onSubmit={doSubmit} noValidate>
              <fieldset
                disabled={submitting}
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
                    Phone (optional)
                    <input
                      value={phone}
                      onChange={onPhoneChange}
                      placeholder="(###) ###-####"
                      aria-invalid={!!errors.phone}
                    />
                  </label>
                </div>

                <div className="tdp-row">
                  <label data-field="zip">
                    ZIP (optional)
                    <input
                      value={zip}
                      onChange={onZipChange}
                      placeholder="#####"
                      aria-invalid={!!errors.zip}
                    />
                  </label>

                  <label data-field="veteranAffiliation">
                    Veteran affiliation*
                    <select
                      value={veteranAffiliation}
                      onChange={(e) => setVeteranAffiliation(e.target.value)}
                      aria-invalid={!!errors.veteranAffiliation}
                    >
                      {VETERAN_AFFILIATIONS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label data-field="preferredContact">
                  Preferred contact method*
                  <select
                    value={preferredContact}
                    onChange={(e) => setPreferredContact(e.target.value)}
                    aria-invalid={!!errors.preferredContact}
                  >
                    {PREFERRED_CONTACT.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>

                <div
                  data-field="interests"
                  className={`tdp-section ${errors.interests ? "tdp-err-ring" : ""}`}
                >
                  <div className="tdp-chips-head">Interests*</div>
                  <div
                    className="chip-grid"
                    role="group"
                    aria-label="Interests"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 8,
                    }}
                  >
                    {INTERESTS.map((opt) => {
                      const pressed = selectedInterests.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          className="chip-btn"
                          aria-pressed={pressed}
                          onClick={() => toggleInterest(opt)}
                          style={{ width: "100%" }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {errors.interests && (
                    <div className="tdp-err">{errors.interests}</div>
                  )}
                </div>

                <label
                  data-field="consent"
                  className={`tdp-check ${errors.consent ? "tdp-err-ring" : ""}`}
                  style={{ marginTop: 20 }}
                >
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    I agree to receive updates from the Road Home Program. I can
                    unsubscribe at any time.*
                  </span>
                </label>
                {errors.consent && <div className="tdp-err">{errors.consent}</div>}

                <label className="tdp-muted">
                  Notes (optional)
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    style={{ resize: "vertical" }}
                  />
                </label>

                {message && <div className="tdp-msg">{message}</div>}

                {/* Turnstile mount */}
                <div id="turnstile-container" style={{ height: 0, overflow: "hidden" }} />

                <button
                  className="tdp-submit signup-cta"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Sign up"}
                </button>
              </fieldset>
            </form>

            <p className="tdp-help" style={{ marginTop: 12 }}>
              If you prefer not to use this form, email{" "}
              <a href="mailto:events@roadhomeprogram.org">
                events@roadhomeprogram.org
              </a>
              .
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
          <a href="https://roadhomeprogram.org/family-center/">
            Help for Families
          </a>
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
          <a href="https://roadhomeprogram.org/contact-us/">
            General Information
          </a>
          <a
            href="https://www.rush.edu/website-privacy-statement"
            target="_blank"
            rel="noreferrer"
          >
            Privacy Statement
          </a>
          <a
            href="https://www.rush.edu/disclaimer"
            target="_blank"
            rel="noreferrer"
          >
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
