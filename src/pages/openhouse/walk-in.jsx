import React, { useCallback, useEffect, useState } from "react";
import LocalParkingOutlinedIcon from "@mui/icons-material/LocalParkingOutlined";
import "../turkeydrop/turkeydrop2025/turkeydrop2025.css";
import ShieldIMG from "../../assets/rhp-shield.png";
import ShieldFooterIMG from "../../assets/shield.png";
import { supabase } from "../../utils/supabaseClient";

const EVENT_ID = "open-house-2026";
const SLOT_ID = "8b5cbb3f-8db6-4027-a40f-76ca69bf0335";
const CAPACITY = 150;
const WALK_IN_SOURCE = "walkin";
const WALK_IN_MODE = "admin_walkin";
const PARKING_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=1640+W.+Jackson+Blvd.,+Chicago,+IL+60612";
const RESET_COUNTDOWN_SECONDS = 13;

const STATUS_OPTIONS = [
  { value: "", label: "Select status" },
  { value: "Veteran", label: "Veteran" },
  { value: "Active Duty", label: "Active Duty" },
  { value: "Guard/Reserve", label: "Guard/Reserve" },
  { value: "Family Member/Caregiver", label: "Family Member/Caregiver" },
  { value: "Provider/Community Partner", label: "Provider/Community Partner" },
  { value: "Other", label: "Other" },
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
  address: "325 S. Paulina St., Ste 200, Chicago, IL 60612",
  note: "Parking validation provided and easy access to public transit.",
};

const SUCCESS_PROMPTS = [
  "Ask Katia Woods about the virtual program",
  "Find Joseph Zolper and ask about accelerated treatment",
  "Ask Modie Lavin about family support services",
  "Ask Brian Klassen what makes Road Home different",
  "Ask Mathius Carter about the ALUM Program",
];

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
              style={{ minHeight: 56, fontSize: 16 }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
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

function getRandomPrompt() {
  return SUCCESS_PROMPTS[Math.floor(Math.random() * SUCCESS_PROMPTS.length)];
}

export default function OpenHouseWalkInPage() {
  const params = new URLSearchParams(window.location.search);
  const utm_source = params.get("utm_source");
  const utm_medium = params.get("utm_medium");
  const utm_campaign = params.get("utm_campaign");
  const utm_term = params.get("utm_term");
  const utm_content = params.get("utm_content");
  const previewSuccess = params.get("preview") === "success";

  const [countError, setCountError] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [digits, setDigits] = useState("");
  const [status, setStatus] = useState("");
  const [familySize, setFamilySize] = useState(1);
  const [eras, setEras] = useState([]);
  const [branches, setBranches] = useState([]);
  const [peerContact, setPeerContact] = useState(false);
  const [addToMailingList, setAddToMailingList] = useState(true);
  const consent = true;

  const [submitting, setSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState("idle");
  const [message, setMessage] = useState("");
  const [messageCode, setMessageCode] = useState("");
  const [errors, setErrors] = useState({});
  const [successPrompt, setSuccessPrompt] = useState(() =>
    previewSuccess ? getRandomPrompt() : ""
  );
  const [resetCountdown, setResetCountdown] = useState(() =>
    previewSuccess ? RESET_COUNTDOWN_SECONDS : null
  );
  const [slotCapacity, setSlotCapacity] = useState(CAPACITY);
  const [seatsTaken, setSeatsTaken] = useState(null);
  const [seatsRemaining, setSeatsRemaining] = useState(null);
  const showServiceFields = SERVICE_STATUSES.has(status);

  const pageTitle = "Open House Walk-In Registration";

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  const loadCapacity = useCallback(async () => {
    if (previewSuccess) return;
    const { data, error } = await supabase
      .from("v_slot_capacity")
      .select("capacity, seats_taken, seats_remaining, is_full")
      .eq("slot_id", SLOT_ID)
      .maybeSingle();

    if (!error && data) {
      setSlotCapacity(
        typeof data.capacity === "number" ? data.capacity : CAPACITY
      );
      setSeatsTaken(
        typeof data.seats_taken === "number" ? data.seats_taken : 0
      );
      setSeatsRemaining(
        typeof data.seats_remaining === "number" ? data.seats_remaining : CAPACITY
      );
      setCountError(false);
    } else {
      setCountError(true);
    }
  }, [previewSuccess]);

  useEffect(() => {
    if (previewSuccess) return;
    loadCapacity();
  }, [loadCapacity, previewSuccess]);

  useEffect(() => {
    if (!showServiceFields) {
      setEras([]);
      setBranches([]);
    }
  }, [showServiceFields]);

  const resetForm = useCallback(() => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setDigits("");
    setStatus("");
    setFamilySize(1);
    setEras([]);
    setBranches([]);
    setPeerContact(false);
    setAddToMailingList(true);
    setSubmitting(false);
    setSubmitStage("idle");
    setMessage("");
    setMessageCode("");
    setErrors({});
    setSuccessPrompt("");
    setResetCountdown(null);
  }, []);

  useEffect(() => {
    if (!successPrompt || resetCountdown === null) return undefined;
    if (resetCountdown <= 0) {
      resetForm();
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setResetCountdown((prev) => (prev === null ? null : prev - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resetCountdown, resetForm, successPrompt]);

  const formatPhone = (value) => {
    const a = value.slice(0, 3);
    const b = value.slice(3, 6);
    const c = value.slice(6, 10);
    if (value.length <= 3) return `(${a}`;
    if (value.length <= 6) return `(${a}) ${b}`;
    return `(${a}) ${b}-${c}`;
  };

  const onPhoneChange = (e) => {
    const nextDigits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setDigits(nextDigits);
    setPhone(formatPhone(nextDigits));
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
  };

  const isEmail = useCallback((val) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(val), []);

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
      "firstName",
      "lastName",
      "email",
      "phone",
      "status",
      "familySize",
      "eras",
      "branches",
      "peerContact",
    ];
    const key = order.find((k) => errs[k]);
    if (!key) return;
    const node = document.querySelector(`[data-field="${key}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const clampFamilySize = useCallback((val) => {
    const next = Number(val);
    if (!Number.isFinite(next)) return 1;
    return Math.min(10, Math.max(1, Math.round(next)));
  }, []);

  const filled = typeof seatsTaken === "number" ? seatsTaken : null;
  const remaining = typeof seatsRemaining === "number" ? seatsRemaining : null;
  const effectiveCapacity =
    typeof slotCapacity === "number" ? slotCapacity : CAPACITY;
  const pct =
    typeof filled === "number"
      ? Math.min(100, Math.round((filled / effectiveCapacity) * 100))
      : 0;
  const maxGuestCount =
    typeof remaining === "number" ? Math.max(1, Math.min(10, remaining)) : 10;
  const submitStatusText =
    submitStage === "verifying"
      ? "Verifying..."
      : submitStage === "registering"
        ? "Registering..."
        : submitStage === "checking-in"
          ? "Checking in..."
          : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageCode("");
    setSubmitStage("idle");
    setSubmitting(true);

    const nextErrors = {};
    if (!firstName.trim()) nextErrors.firstName = "Required";
    if (!lastName.trim()) nextErrors.lastName = "Required";
    if (!email.trim() || !isEmail(email.trim())) nextErrors.email = "Required";
    if (digits.length !== 10) nextErrors.phone = "Required";
    if (!status) nextErrors.status = "Required";
    if (
      !Number.isFinite(familySize) ||
      familySize < 1 ||
      familySize > maxGuestCount
    ) {
      nextErrors.familySize =
        typeof seatsRemaining === "number"
          ? `Guest count must be between 1 and ${maxGuestCount}.`
          : "Guest count must be between 1 and 10.";
    }
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

    const payload = {
      event_id: EVENT_ID,
      slot_id: SLOT_ID,
      family_size: familySize,
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
      referrer: document.referrer || null,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      source: WALK_IN_SOURCE,
      mode: WALK_IN_MODE,
    };

    try {
      setSubmitStage("registering");
      const { data, error } = await supabase.functions.invoke("reserve-rsvp", {
        body: payload,
      });
      let responseData = data && typeof data === "object" ? data : null;
      if (!responseData && error) {
        responseData = await extractResponseFromError(error);
      }

      if (error || responseData?.ok === false) {
        setMessageCode(responseData?.code || "");
        setMessage(
          `❌ ${
            responseData?.error ||
            error?.message ||
            "Something went wrong. Please email events@roadhomeprogram.org."
          }`
        );
        setSubmitStage("idle");
        return;
      }

      const rsvpId = responseData?.id;
      if (!rsvpId) {
        setMessage(
          "❌ Registration succeeded, but the RSVP ID was missing. Please ask staff to verify your check-in."
        );
        setMessageCode("CHECKIN_PENDING");
        setSubmitStage("idle");
        return;
      }

      setSubmitStage("checking-in");
      const { data: checkinData, error: checkinError } = await supabase.functions.invoke(
        "admin-checkin",
        { body: { rsvp_id: rsvpId } }
      );

      if (checkinError || checkinData?.ok !== true) {
        setMessageCode(checkinData?.code || checkinError?.code || "CHECKIN_FAILED");
        setMessage(
          `⚠️ Registration succeeded, but check-in failed. ${
            checkinData?.error ||
            checkinError?.message ||
            "Please ask staff to complete check-in manually."
          }`
        );
        setSubmitStage("idle");
        return;
      }

      await loadCapacity();
      setErrors({});
      setMessage("");
      setMessageCode("");
      setSubmitStage("idle");
      setSuccessPrompt(getRandomPrompt());
      setResetCountdown(RESET_COUNTDOWN_SECONDS);
    } catch {
      setMessage("❌ Something went wrong. Please email events@roadhomeprogram.org.");
      setMessageCode("");
      setSubmitStage("idle");
    } finally {
      setSubmitting(false);
    }
  };

  if (successPrompt) {
    return (
      <>
        <main
          className="tdp-shell"
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: 24,
          }}
        >
          <article
            className="tdp-card"
            style={{
              maxWidth: 900,
              width: "100%",
              textAlign: "center",
              padding: "48px 40px",
              background: "linear-gradient(180deg, #ffffff 0%, #eef7f1 100%)",
            }}
          >
            <div className="crumb" style={{ fontSize: 14, padding: "8px 14px" }}>
              Open House Walk-In
            </div>
            <h1
              className="tdp-card-title"
              style={{ fontSize: "clamp(2.8rem, 6vw, 4.6rem)", marginTop: 18 }}
            >
              You're checked in
            </h1>
            <p
              className="tdp-card-sub"
              style={{ fontSize: 22, lineHeight: 1.45, maxWidth: 680, margin: "16px auto 0" }}
            >
              You&apos;re all set for the event. A team member can help you get
              oriented from here.
            </p>
            <div
              style={{
                margin: "28px auto 0",
                maxWidth: 640,
                padding: "22px 24px",
                borderRadius: 18,
                background: "#0d6b3b",
                color: "#fff",
                boxShadow: "0 16px 34px rgba(13,107,59,.22)",
              }}
            >
              <div style={{ fontSize: 14, letterSpacing: ".08em", textTransform: "uppercase", opacity: 0.82 }}>
                Conversation starter
              </div>
              <div style={{ fontSize: 30, lineHeight: 1.25, marginTop: 10 }}>
                {successPrompt}
              </div>
            </div>
            <p className="tdp-help" style={{ marginTop: 24, fontSize: 16 }}>
              This page will reset for the next guest in {resetCountdown ?? RESET_COUNTDOWN_SECONDS} second{(resetCountdown ?? RESET_COUNTDOWN_SECONDS) === 1 ? "" : "s"}.
            </p>
          </article>
        </main>
        <RHPSiteFooter />
      </>
    );
  }

  return (
    <>
      <main className="tdp-shell tdp-shell--mobile-form-first">
        <div
          className="tdp-bg"
          style={{ "--bg-url": `url(${ShieldIMG})` }}
          aria-hidden="true"
        />

        <section className="tdp-left">
          <p className="tdp-sub" style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>
            {EVENT_DETAILS.title}
          </p>
          <h1 className="tdp-title" style={{ lineHeight: 1.02, marginTop: 6 }}>
            Walk-in registration and check-in
          </h1>
          <p className="tdp-sub" style={{ marginTop: 14, fontSize: 18, lineHeight: 1.5 }}>
            Use this iPad to register on site. Once you submit, you will be checked
            in automatically.
          </p>
          <p className="tdp-sub" style={{ marginTop: 14, fontSize: 17, lineHeight: 1.6 }}>
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
            <div className="tdp-progress-meta" style={{ fontSize: 15 }}>
              <span>
                Seats reserved {typeof filled === "number" ? filled : "—"} / {effectiveCapacity}
              </span>
              <span>
                Seats remaining: {typeof remaining === "number" ? remaining : "—"}
              </span>
            </div>
            {countError && (
              <p className="tdp-help" style={{ marginTop: 8 }}>
                Live capacity is temporarily unavailable. Please continue to
                submit registration.
              </p>
            )}
          </div>

          <p className="tdp-help" style={{ marginTop: 24, fontSize: 14 }}>
            {EVENT_DETAILS.note}
          </p>
        </section>

        <section className="tdp-right">
          <article className="tdp-card" style={{ maxWidth: 640 }}>
            <h2 className="tdp-card-title" style={{ fontSize: 34 }}>Register now</h2>
            <p className="tdp-card-sub" style={{ fontSize: 17, lineHeight: 1.55 }}>
              Complete the form below to register on site and check in immediately.
            </p>
            <section className="tdp-parking" aria-label="Parking Information">
              <h3 className="tdp-parking-title" style={{ fontSize: 16 }}>
                <LocalParkingOutlinedIcon fontSize="small" aria-hidden="true" />
                <span>Parking Information</span>
              </h3>
              <p className="tdp-parking-copy" style={{ fontSize: 15 }}>
                <a href={PARKING_MAPS_URL} target="_blank" rel="noreferrer">
                  Garage Address: 1640 W. Jackson Blvd., Chicago, IL 60612.
                </a>{" "}
                Located on the corner of Paulina and Jackson. The entrance is
                located on the north side of Jackson Blvd. All parking at this
                lot will be validated.
              </p>
              <a
                className="tdp-parking-link"
                href={PARKING_MAPS_URL}
                target="_blank"
                rel="noreferrer"
              >
                View on Google Maps
              </a>
            </section>

            <form className="tdp-form" onSubmit={handleSubmit} noValidate>
              <fieldset disabled={submitting} style={{ border: 0, padding: 0 }}>
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
                      style={{ minHeight: 52, fontSize: 17 }}
                    />
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
                      style={{ minHeight: 52, fontSize: 17 }}
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
                        if (errors.email) {
                          setErrors((prev) => ({ ...prev, email: undefined }));
                        }
                      }}
                      aria-invalid={!!errors.email}
                      style={{ minHeight: 52, fontSize: 17 }}
                    />
                    {errors.email && <div className="tdp-err">{errors.email}</div>}
                  </label>
                  <label data-field="phone">
                    Phone*
                    <input
                      value={phone}
                      onChange={onPhoneChange}
                      placeholder="(###) ###-####"
                      aria-invalid={!!errors.phone}
                      style={{ minHeight: 52, fontSize: 17 }}
                    />
                    {errors.phone && <div className="tdp-err">{errors.phone}</div>}
                  </label>
                </div>

                <label data-field="status" className="tdp-status">
                  Status*
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      if (errors.status) {
                        setErrors((prev) => ({ ...prev, status: undefined }));
                      }
                    }}
                    aria-invalid={!!errors.status}
                    style={{ minHeight: 54, fontSize: 17 }}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value || "blank"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {errors.status && <div className="tdp-err">{errors.status}</div>}
                </label>

                <label data-field="familySize" className="tdp-status">
                  <span style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                    Guest Count (including you)*
                    <span aria-live="polite">Party Size: {familySize}</span>
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
                    <button
                      type="button"
                      className="tdp-ghost-btn"
                      onClick={() => setFamilySize((prev) => clampFamilySize(prev - 1))}
                      aria-label="Decrease guest count"
                      disabled={familySize <= 1}
                      style={{
                        border: "1px solid #cfe5d8",
                        background: "#e6f2eb",
                        color: "#006633",
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        fontSize: 28,
                      }}
                    >
                      −
                    </button>
                    <input
                      type="range"
                      min={1}
                      max={maxGuestCount}
                      value={familySize}
                      onChange={(e) =>
                        setFamilySize(
                          clampFamilySize(Math.min(maxGuestCount, Number(e.target.value)))
                        )
                      }
                      aria-valuemin={1}
                      aria-valuemax={maxGuestCount}
                      aria-valuenow={familySize}
                      aria-label="Guest count slider"
                      style={{ flex: 1, accentColor: "#006633", minHeight: 28 }}
                    />
                    <button
                      type="button"
                      className="tdp-ghost-btn"
                      onClick={() =>
                        setFamilySize((prev) =>
                          Math.min(maxGuestCount, clampFamilySize(prev + 1))
                        )
                      }
                      aria-label="Increase guest count"
                      disabled={familySize >= maxGuestCount}
                      style={{
                        border: "1px solid #cfe5d8",
                        background: "#e6f2eb",
                        color: "#006633",
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        fontSize: 28,
                      }}
                    >
                      +
                    </button>
                  </div>
                  <span className="tdp-muted" style={{ display: "block", marginTop: 4 }}>
                    Minimum 1 guest, maximum 10 total attendees.
                  </span>
                  {errors.familySize && (
                    <div className="tdp-err">{errors.familySize}</div>
                  )}
                </label>

                {showServiceFields && (
                  <>
                    <div
                      data-field="eras"
                      className={`tdp-section ${errors.eras ? "tdp-err-ring" : ""}`}
                    >
                      <MultiChipGroup
                        label="Service era(s)*"
                        options={ERAS}
                        values={eras}
                        setValues={setEras}
                        id="walkin-era"
                      />
                      {errors.eras && <div className="tdp-err">{errors.eras}</div>}
                    </div>

                    <div
                      data-field="branches"
                      className={`tdp-section ${errors.branches ? "tdp-err-ring" : ""}`}
                    >
                      <MultiChipGroup
                        label="Branch(es) of service*"
                        options={BRANCHES}
                        values={branches}
                        setValues={setBranches}
                        id="walkin-branch"
                      />
                      {errors.branches && <div className="tdp-err">{errors.branches}</div>}
                    </div>
                  </>
                )}

                <label
                  data-field="peerContact"
                  className="tdp-check"
                  style={{ marginTop: 20, fontSize: 16 }}
                >
                  <input
                    type="checkbox"
                    checked={peerContact}
                    onChange={(e) => setPeerContact(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>
                    Would you like to connect with a member of our Veteran
                    Outreach Team to learn more about our program?
                  </span>
                </label>

                <label className="tdp-check" style={{ marginTop: 12, fontSize: 16 }}>
                  <input
                    type="checkbox"
                    checked={addToMailingList}
                    onChange={(e) => setAddToMailingList(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>Add me to the Road Home Program mailing list.</span>
                </label>

                {message && (
                  <>
                    <div className="tdp-msg">{message}</div>
                    {messageCode === "DUPLICATE_RSVP" && (
                      <button
                        type="button"
                        className="tdp-ghost-btn"
                        onClick={resetForm}
                        style={{ marginTop: 8, minHeight: 48, fontSize: 16 }}
                      >
                        Reset form
                      </button>
                    )}
                  </>
                )}

                {submitStatusText ? (
                  <div className="tdp-msg ok" aria-live="polite">
                    {submitStatusText}
                  </div>
                ) : null}
                <button
                  className="tdp-submit"
                  type="submit"
                  disabled={submitting}
                  style={{ minHeight: 58, fontSize: 20 }}
                >
                  {submitStatusText || "Register and Check In"}
                </button>
              </fieldset>
            </form>

            <p className="tdp-help" style={{ marginTop: 14, fontSize: 14 }}>
              Prefer help from staff? Call <a href="tel:13129428387">(312) 942-8387</a>.
            </p>
          </article>
        </section>
      </main>

      <RHPSiteFooter />
    </>
  );
}
