import React, { useCallback, useEffect, useMemo, useState } from "react";
import "../turkeydrop/turkeydrop2025/turkeydrop2025.css";
import ShieldIMG from "../../assets/rhp-shield.png";
import ShieldFooterIMG from "../../assets/shield.png";
import { supabase } from "../../utils/supabaseClient";
import { mstSeries2026Data } from "../../data/mstSeries2026Data";

const SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || "";

const SESSION_EVENT_IDS = mstSeries2026Data.sessions.map((session) => session.eventId);

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
  const [expandedSpeakerDetails, setExpandedSpeakerDetails] = useState({});
  const [recentSpeakerBySession, setRecentSpeakerBySession] = useState({});
  const [activeAvatarKey, setActiveAvatarKey] = useState("");
  const [pinnedAvatarKey, setPinnedAvatarKey] = useState("");
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

  const sessionOptionsByEventId = useMemo(
    () => new Map(sessionOptions.map((option) => [option.event_id, option])),
    [sessionOptions]
  );

  const mergedSessions = useMemo(
    () =>
      mstSeries2026Data.sessions.map((session) => {
        const liveOption = sessionOptionsByEventId.get(session.eventId);
        return {
          ...session,
          slotId: liveOption?.slot_id || null,
          slotLabel:
            liveOption?.label || `${session.dateLabel} • 12:00 PM - 1:00 PM CT`,
        };
      }),
    [sessionOptionsByEventId]
  );

  useEffect(() => {
    document.title = mstSeries2026Data.title;
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
    if (!pinnedAvatarKey) return;

    const onPointerDown = (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".mst-avatar-interactive")) {
        return;
      }
      setPinnedAvatarKey("");
      setActiveAvatarKey("");
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [pinnedAvatarKey]);

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

    const selectedSessions = sessionOptions
      .filter((session) => selectedSessionIds.includes(session.event_id))
      .map((session) => ({
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

  const makeAvatarKey = (eventId, speakerName) => `${eventId}::${speakerName}`;

  const handleAvatarPointerEnter = (avatarKey) => {
    if (pinnedAvatarKey) return;
    setActiveAvatarKey(avatarKey);
  };

  const handleAvatarPointerLeave = () => {
    if (pinnedAvatarKey) return;
    setActiveAvatarKey("");
  };

  const handleAvatarFocus = (avatarKey) => {
    if (pinnedAvatarKey) return;
    setActiveAvatarKey(avatarKey);
  };

  const handleAvatarBlur = () => {
    if (pinnedAvatarKey) return;
    setActiveAvatarKey("");
  };

  const handleAvatarTap = (event, sessionEventId, speakerName, avatarKey) => {
    event.preventDefault();
    event.stopPropagation();
    setExpandedSpeakerDetails((prev) => ({
      ...prev,
      [sessionEventId]: true,
    }));
    setRecentSpeakerBySession((prev) => ({
      ...prev,
      [sessionEventId]: speakerName,
    }));
    setPinnedAvatarKey((prevPinned) => {
      const nextPinned = prevPinned === avatarKey ? "" : avatarKey;
      setActiveAvatarKey(nextPinned ? avatarKey : "");
      return nextPinned;
    });
  };

  return (
    <>
      <style>{`
        .mst-page{
          --mst-teal:#008080;
          --mst-accent:#44c0c5;
          --mst-white:#ffffff;
          --mst-ink:#163536;
          --mst-muted:#456d6f;
          --brand:var(--mst-teal);
          --brand-ink:var(--mst-white);
          --paper:var(--mst-white);
          --ink:var(--mst-ink);
          --muted:var(--mst-muted);
          --line:#b8e3e5;
          position:relative;
          z-index:1;
          max-width:1240px;
          margin:24px auto;
          padding:12px 20px;
          color:var(--ink)
        }
        .mst-grid{display:grid;grid-template-columns:1fr;grid-template-areas:"rsvp" "content";gap:24px}
        .mst-col--content{grid-area:content;display:grid;gap:18px}
        .mst-col--rsvp{grid-area:rsvp}
        .mst-rsvp-sticky{position:static}
        .mst-hero{
          display:grid;
          gap:16px;
          background:var(--mst-teal);
          color:var(--mst-white);
          border-radius:18px;
          padding:22px;
          box-shadow:var(--shadow);
          position:relative;
          overflow:hidden;
          isolation:isolate
        }
        .mst-hero::before{
          content:"";
          position:absolute;
          inset:0;
          background:linear-gradient(145deg,#008080 0%, #0f7276 72%, #127d83 100%);
          z-index:0
        }
        .mst-hero > *{position:relative;z-index:1}
        .mst-hero-eyebrow{
          margin:0;
          font-weight:700;
          color:#ffffff;
          letter-spacing:.2px
        }
        .mst-hero-title{
          line-height:1.06;
          margin:0;
          color:#ffffff;
          text-shadow:0 1px 0 rgba(0,0,0,.12)
        }
        .mst-hero-subtitle{
          margin:0;
          color:#e9ffff;
          font-weight:600
        }
        .mst-hero-img-wrap{
          border-radius:14px;
          background:#ffffff;
          padding:6px;
          border:1px solid rgba(255,255,255,.45);
          box-shadow:0 10px 24px rgba(0,0,0,.18)
        }
        .mst-hero img{width:100%;height:auto;border-radius:10px;display:block;background:#ffffff}
        .mst-objectives ul{margin:0;padding-left:18px;display:grid;gap:8px}
        .mst-lineup{display:grid;gap:12px}
        .mst-lineup-card{
          width:100%;
          border:1px solid #cbeaec;
          border-left:6px solid var(--mst-accent);
          border-radius:14px;
          background:var(--mst-white);
          padding:14px;
          opacity:1;
          transition:border-color .2s ease,box-shadow .2s ease,transform .15s ease,background-color .2s ease
        }
        .mst-lineup-card:hover{transform:translateY(-1px)}
        .mst-lineup-card.is-selected{
          border-color:var(--mst-teal);
          border-left-color:var(--mst-teal);
          background:#ddf4f5;
          box-shadow:0 0 0 3px rgba(0,128,128,.24)
        }
        .mst-lineup-card.is-disabled{opacity:.88}
        .mst-lineup-select{
          width:100%;
          border:0;
          background:transparent;
          padding:0;
          text-align:left;
          cursor:pointer
        }
        .mst-lineup-select:focus-visible{
          outline:3px solid rgba(0,128,128,.45);
          outline-offset:4px;
          border-radius:10px
        }
        .mst-lineup-select:disabled{cursor:not-allowed}
        .mst-session-date{display:inline-block;padding:4px 10px;border-radius:999px;background:#e8f8f8;color:var(--mst-teal);font-size:12px;font-weight:700;margin-bottom:8px}
        .mst-session-title{font-weight:700;margin:0 0 10px;font-size:16px;line-height:1.35;color:var(--mst-teal)}
        .mst-speakers{
          display:flex;
          align-items:center;
          gap:12px;
          min-height:70px;
          margin-top:10px
        }
        .mst-avatar-group{
          display:flex;
          align-items:center;
          flex:0 0 auto
        }
        .mst-avatar-trigger{
          position:relative;
          width:70px;
          height:70px;
          border:0;
          background:transparent;
          padding:0;
          margin-left:-18px;
          border-radius:999px;
          cursor:pointer;
          z-index:1;
          transition:transform .16s ease
        }
        .mst-avatar-trigger:first-child{margin-left:0}
        .mst-avatar-trigger:hover{
          transform:translateY(-1px)
        }
        .mst-avatar-trigger:focus-visible{
          outline:3px solid rgba(0,128,128,.48);
          outline-offset:2px
        }
        .mst-avatar-trigger img{
          width:70px;
          height:70px;
          border-radius:999px;
          object-fit:cover;
          border:3px solid var(--mst-accent);
          background:#fff;
          transform:scale(1);
          transition:transform .18s ease, box-shadow .18s ease, filter .18s ease
        }
        .mst-avatar-trigger:hover img{filter:saturate(1.08)}
        .mst-avatar-trigger.is-active{
          z-index:8
        }
        .mst-avatar-trigger.is-active img,
        .mst-avatar-trigger:hover img,
        .mst-avatar-trigger:focus-visible img{
          transform:scale(1.54);
          box-shadow:0 10px 20px rgba(0,0,0,.22)
        }
        .mst-avatar-tooltip{
          position:absolute;
          left:50%;
          bottom:calc(100% + 8px);
          transform:translateX(-50%) translateY(4px);
          background:#0f5f60;
          color:#fff;
          border-radius:8px;
          padding:6px 8px;
          font-size:11px;
          line-height:1.2;
          white-space:nowrap;
          box-shadow:0 8px 18px rgba(0,0,0,.22);
          opacity:0;
          pointer-events:none;
          transition:opacity .18s ease, transform .18s ease
        }
        .mst-avatar-tooltip strong{display:block;font-weight:700}
        .mst-avatar-trigger.is-active .mst-avatar-tooltip,
        .mst-avatar-trigger:hover .mst-avatar-tooltip,
        .mst-avatar-trigger:focus-visible .mst-avatar-tooltip{
          opacity:1;
          transform:translateX(-50%) translateY(0)
        }
        .mst-speaker-names{
          font-weight:700;
          line-height:1.35;
          color:#15494b
        }
        .mst-speaker-role{font-size:12px;color:var(--muted)}
        .mst-card-action{
          margin-top:12px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          font-size:12px;
          font-weight:700;
          color:#0d5c5e
        }
        .mst-card-action-badge{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-width:96px;
          padding:5px 10px;
          border-radius:999px;
          border:1px solid #93dadd;
          background:#f3fcfc
        }
        .mst-lineup-card.is-selected .mst-card-action-badge{
          border-color:#0a6a6a;
          background:#008080;
          color:#ffffff
        }
        .mst-card-action-copy{font-size:12px;color:#1f5b5e}
        .mst-details-toggle{
          margin-top:10px;
          width:100%;
          border:1px solid #a7d9dc;
          background:#f7fefe;
          color:#0d5c5e;
          border-radius:10px;
          padding:8px 10px;
          font-size:13px;
          font-weight:700;
          cursor:pointer;
          text-align:center
        }
        .mst-details-toggle:focus-visible{
          outline:3px solid rgba(0,128,128,.32);
          outline-offset:2px
        }
        .mst-speaker-details{
          margin-top:10px;
          padding:10px;
          border-radius:10px;
          border:1px solid #b7e3e5;
          background:#f4fcfd;
          display:grid;
          gap:10px
        }
        .mst-speaker-detail-item{font-size:13px;color:#24585a;line-height:1.45}
        .mst-speaker-detail-item.is-highlighted{
          border:1px solid #8fd6d9;
          border-radius:8px;
          background:#e8f8f8;
          padding:8px
        }
        .mst-speaker-detail-head{font-weight:700;color:#0f4f52}
        .mst-speaker-detail-meta{font-size:12px;color:#357073}
        .mst-speaker-detail-empty{font-size:12px;color:#4d7779;font-style:italic}
        .mst-rsvp-card{max-width:560px}
        .mst-session-chip-wrap .chip-grid{grid-template-columns:1fr}
        .mst-chip-meta{font-size:12px;color:var(--muted)}
        .mst-col--content h2{color:var(--mst-teal);font-weight:700}
        .mst-col--content .tdp-block{background:var(--mst-white);border:1px solid #d7eef0;border-radius:14px;padding:16px}
        .mst-col--content .tdp-block.mst-hero{padding:20px}
        .mst-col--content [aria-label="CE Disclosures and Accreditation"]{
          background:#f6fbfb;
          border-left:4px solid var(--mst-accent)
        }
        .mst-rsvp-card{
          background:var(--mst-white);
          border:1px solid #cae8ea;
          box-shadow:0 8px 24px rgba(0, 94, 96, .14)
        }
        .mst-rsvp-card .tdp-card-title{
          margin:-20px -20px 12px;
          padding:14px 20px;
          background:var(--mst-teal);
          color:var(--mst-white);
          border-radius:18px 18px 0 0
        }
        .mst-rsvp-card .chip-btn{
          border-color:#b7e3e5;
          background:#fafdfe;
          color:#0f4b4e
        }
        .mst-rsvp-card .chip-btn[aria-pressed="true"]{
          border-color:var(--mst-teal);
          background:#e8f8f8;
          color:#0d5c5e
        }
        .mst-rsvp-card .tdp-submit{
          background:var(--mst-teal)
        }
        .mst-rsvp-card .tdp-submit:hover{
          background:#006f6f
        }
        .mst-rsvp-divider{
          margin-top:18px;
          padding-top:16px;
          border-top:1px solid #bfe3e5
        }
        @media (min-width: 1024px){
          .mst-grid{grid-template-columns:minmax(0,1.25fr) minmax(360px,.85fr);grid-template-areas:"content rsvp";align-items:start}
          .mst-rsvp-sticky{position:sticky;top:20px}
        }
      `}</style>

      <main className="mst-page">
        <div
          className="tdp-bg"
          style={{ "--bg-url": `url(${ShieldIMG})` }}
          aria-hidden="true"
        />

        <div className="mst-grid">
          <section className="mst-col--content">
            <section className="tdp-block mst-hero" aria-label="Hero">
              <p className="tdp-sub mst-hero-eyebrow">
                {mstSeries2026Data.eyebrow}
              </p>
              <h1 className="tdp-title mst-hero-title">
                {mstSeries2026Data.title}
              </h1>
              <p className="tdp-sub mst-hero-subtitle">
                {mstSeries2026Data.subtitle}
              </p>
              <div className="mst-hero-img-wrap">
                <img src={mstSeries2026Data.heroImage} alt="MST webinar series banner" />
              </div>
            </section>

            <section className="tdp-block mst-objectives" aria-label="Learning Objectives">
              <h2 style={{ margin: "0 0 8px" }}>Learning Objectives</h2>
              <ul>
                {mstSeries2026Data.learningObjectives.map((objective) => (
                  <li key={objective}>{objective}</li>
                ))}
              </ul>
            </section>

            <section className="tdp-block mst-lineup" aria-label="Session Lineup">
              <h2 style={{ margin: 0 }}>Session Lineup</h2>
              {mergedSessions.map((session) => {
                const selected = selectedSessionIds.includes(session.eventId);
                const disabled = loadingSessions || !!sessionLoadError || !session.slotId;
                const detailsOpen = !!expandedSpeakerDetails[session.eventId];
                const recentSpeakerName = recentSpeakerBySession[session.eventId];
                return (
                  <article
                    key={session.eventId}
                    className={`mst-lineup-card ${selected ? "is-selected" : ""} ${
                      disabled ? "is-disabled" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="mst-lineup-select"
                      onClick={() => toggleSession(session.eventId)}
                      disabled={disabled}
                      aria-pressed={selected}
                    >
                      <div className="mst-session-date">{session.dateLabel}</div>
                      <p className="mst-session-title">{session.title}</p>
                      <div className="mst-card-action" aria-hidden="true">
                        <span className="mst-card-action-copy">
                          {selected
                            ? "Included in your RSVP"
                            : "Select session below or click a speaker photo for details"}
                        </span>
                        <span className="mst-card-action-badge">
                          {selected ? "Selected" : "Select session"}
                        </span>
                      </div>
                    </button>
                    <div className="mst-speakers">
                      <div className="mst-avatar-group">
                        {session.speakers.slice(0, 3).map((speaker) => {
                          const avatarKey = makeAvatarKey(session.eventId, speaker.name);
                          const isActive =
                            activeAvatarKey === avatarKey || pinnedAvatarKey === avatarKey;
                          return (
                            <button
                              key={`${session.eventId}-${speaker.name}-avatar`}
                              type="button"
                              className={`mst-avatar-trigger mst-avatar-interactive ${
                                isActive ? "is-active" : ""
                              }`}
                              onMouseEnter={() => handleAvatarPointerEnter(avatarKey)}
                              onMouseLeave={handleAvatarPointerLeave}
                              onFocus={() => handleAvatarFocus(avatarKey)}
                              onBlur={handleAvatarBlur}
                              onClick={(event) =>
                                handleAvatarTap(
                                  event,
                                  session.eventId,
                                  speaker.name,
                                  avatarKey
                                )
                              }
                              aria-label={`${speaker.name}, ${speaker.role || "Presenter"}`}
                            >
                              <img src={speaker.image} alt={speaker.alt} loading="lazy" />
                              <span className="mst-avatar-tooltip" aria-hidden={!isActive}>
                                <strong>{speaker.name}</strong>
                                <span>{speaker.role || "Presenter"}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mst-speaker-names">
                        {session.speakers
                          .map((speaker) => `${speaker.name}, ${speaker.credentials}`)
                          .join(" • ")}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mst-details-toggle"
                      onClick={() =>
                        setExpandedSpeakerDetails((prev) => ({
                          ...prev,
                          [session.eventId]: !prev[session.eventId],
                        }))
                      }
                      aria-expanded={detailsOpen}
                      aria-controls={`speaker-details-${session.eventId}`}
                    >
                      {detailsOpen ? "Hide speaker details" : "View speaker details"}
                    </button>
                    {detailsOpen && (
                      <div
                        id={`speaker-details-${session.eventId}`}
                        className="mst-speaker-details"
                      >
                        {session.speakers.map((speaker) => {
                          const subtitle = speaker.subtitle || speaker.role;
                          const bio = speaker.bio;
                          const affiliation = speaker.affiliation;
                          const hasExtra = Boolean(subtitle || bio || affiliation);

                          return (
                            <div
                              className={`mst-speaker-detail-item ${
                                recentSpeakerName === speaker.name ? "is-highlighted" : ""
                              }`}
                              key={`${session.eventId}-${speaker.name}-details`}
                            >
                              <div className="mst-speaker-detail-head">
                                {speaker.name}, {speaker.credentials}
                              </div>
                              {hasExtra ? (
                                <>
                                  {subtitle && (
                                    <div className="mst-speaker-detail-meta">{subtitle}</div>
                                  )}
                                  {affiliation && (
                                    <div className="mst-speaker-detail-meta">{affiliation}</div>
                                  )}
                                  {bio && <div>{bio}</div>}
                                </>
                              ) : (
                                <div className="mst-speaker-detail-empty">
                                  Additional speaker details will be posted soon.
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {!session.slotId && !loadingSessions && !sessionLoadError && (
                      <p className="tdp-help" style={{ marginTop: 8, marginBottom: 0 }}>
                        Session registration is currently unavailable.
                      </p>
                    )}
                  </article>
                );
              })}
            </section>

            <section className="tdp-block" aria-label="CE Disclosures and Accreditation">
              <h2 style={{ marginTop: 0 }}>CE / Disclosures / Accreditation</h2>
              <p style={{ marginTop: 0 }}>{mstSeries2026Data.ceDisclosureAccreditation.ce}</p>
              <p>{mstSeries2026Data.ceDisclosureAccreditation.disclosures}</p>
              <p style={{ marginBottom: 0 }}>
                {mstSeries2026Data.ceDisclosureAccreditation.accreditation}
              </p>
            </section>

            <section className="tdp-block" aria-label="Contact Information">
              <h2 style={{ marginTop: 0 }}>Contact</h2>
              <p className="tdp-help" style={{ marginTop: 0, fontSize: 14 }}>
                Questions? Email{" "}
                <a href={`mailto:${mstSeries2026Data.contactInfo.email}`}>
                  {mstSeries2026Data.contactInfo.email}
                </a>{" "}
                or call <a href="tel:13129428387">{mstSeries2026Data.contactInfo.phone}</a>.
              </p>
            </section>
          </section>

          <aside className="mst-col--rsvp">
            <div className="mst-rsvp-sticky">
              <article className="tdp-card mst-rsvp-card">
                <h2 className="tdp-card-title">Reserve your webinar sessions</h2>
                <p className="tdp-card-sub">
                  Select one or more sessions. Registration is one person per form submission.
                </p>

                <form className="tdp-form" onSubmit={handleSubmit} noValidate>
                  <fieldset disabled={submitting} style={{ border: 0, padding: 0, margin: 0 }}>
                    <div
                      data-field="selectedSessions"
                      className={`tdp-section mst-session-chip-wrap ${
                        errors.selectedSessions ? "tdp-err-ring" : ""
                      }`}
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
                        {mergedSessions.map((session) => {
                          const selected = selectedSessionIds.includes(session.eventId);
                          const disabled =
                            loadingSessions || !!sessionLoadError || !session.slotId;
                          return (
                            <button
                              key={session.eventId}
                              type="button"
                              className="chip-btn"
                              aria-pressed={selected}
                              disabled={disabled}
                              onClick={() => toggleSession(session.eventId)}
                            >
                              <span>
                                <strong>{session.shortLabel}</strong> · {session.slotLabel}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {errors.selectedSessions && (
                        <div className="tdp-err">{errors.selectedSessions}</div>
                      )}
                    </div>

                    <div className="tdp-row mst-rsvp-divider">
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
                        {errors.stateRegion && <div className="tdp-err">{errors.stateRegion}</div>}
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
                        {errors.postalCode && <div className="tdp-err">{errors.postalCode}</div>}
                      </label>
                    </div>

                    <label data-field="status" className="tdp-status">
                      Status*
                      <select
                        value={status}
                        onChange={(e) => {
                          setStatus(e.target.value);
                          if (errors.status)
                            setErrors((prev) => ({ ...prev, status: undefined }));
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
            </div>
          </aside>
        </div>
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
