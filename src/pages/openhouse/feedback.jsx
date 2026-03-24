import React, { useEffect, useMemo, useState } from "react";
import "../turkeydrop/turkeydrop2025/turkeydrop2025.css";
import ShieldIMG from "../../assets/rhp-shield.png";
import ShieldFooterIMG from "../../assets/shield.png";
import { supabase } from "../../utils/supabaseClient";

const EVENT_ID = "open-house-2026";

const noShowOptions = [
  { key: "reason_scheduling", label: "Scheduling conflict" },
  {
    key: "reason_unexpected",
    label: "Unexpected personal or work commitment",
  },
  { key: "reason_forgot", label: "Forgot about the event" },
  {
    key: "reason_access",
    label: "Had trouble accessing the event (location, virtual link, etc.)",
  },
  {
    key: "reason_interest",
    label: "Lost interest or decided not to attend",
  },
  { key: "reason_transport", label: "Parking, traffic, transit issues" },
];

const initialReasons = {
  reason_scheduling: false,
  reason_unexpected: false,
  reason_forgot: false,
  reason_access: false,
  reason_interest: false,
  reason_transport: false,
};

function Footer() {
  return (
    <footer className="tdp-footer">
      <div className="tdp-footer__inner">
        <div className="tdp-footer__brand">
          <img
            src={ShieldFooterIMG}
            alt="Road Home Program shield"
            className="tdp-footer__shield"
          />
          <div>
            <div className="tdp-footer__title">Road Home Program</div>
            <div className="tdp-footer__org">
              The Road Home Program at Rush provides mental health care and
              wellness services to Veterans, Service Members and their families.
            </div>
            <div className="tdp-footer__contact">
              <a href="tel:13129428387">(312) 942-8387</a>
              <span className="tdp-dot">•</span>
              <a href="mailto:events@roadhomeprogram.org">
                events@roadhomeprogram.org
              </a>
            </div>
          </div>
        </div>
        <div className="tdp-footer__nav">
          <a href="https://roadhomeprogram.org/" target="_blank" rel="noreferrer">
            Visit Road Home Program
          </a>
          <a
            href="https://roadhomeprogram.org/get-care/"
            target="_blank"
            rel="noreferrer"
          >
            Get Care
          </a>
          <a href="/open-house">Open House RSVP</a>
        </div>
        <div className="tdp-footer__legal">
          © Road Home Program at Rush. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default function OpenHouseFeedbackPage() {
  const params = useMemo(
    () => new URLSearchParams(window.location.search),
    [],
  );
  const rsvpId = params.get("rsvp_id")?.trim() || null;

  const [attended, setAttended] = useState(null);
  const [rating, setRating] = useState(null);
  const [comments, setComments] = useState("");
  const [reasons, setReasons] = useState(initialReasons);
  const [otherSelected, setOtherSelected] = useState(false);
  const [reasonOther, setReasonOther] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    document.title = "Road Home Program Open House Feedback";
  }, []);

  const resetForAttendance = (nextAttended) => {
    setAttended(nextAttended);
    setErrorMessage("");

    if (nextAttended === true) {
      setReasons(initialReasons);
      setOtherSelected(false);
      setReasonOther("");
    }

    if (nextAttended === false) {
      setRating(null);
      setComments("");
    }
  };

  const toggleReason = (key) => {
    setReasons((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (attended === null) {
      setErrorMessage("Please tell us whether you attended the event.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    const payload = {
      event_id: EVENT_ID,
      rsvp_id: rsvpId,
      attended,
      ...reasons,
      reason_other: attended || !otherSelected ? null : reasonOther.trim() || null,
      rating: attended ? rating : null,
      comments: attended ? comments.trim() || null : null,
    };

    const { data, error } = await supabase.functions.invoke("quick-handler", {
      body: payload,
    });

    setSubmitting(false);

    if (error) {
      setErrorMessage(error.message || "Unable to submit feedback right now.");
      return;
    }

    if (!data?.ok) {
      setErrorMessage(data?.error || "Unable to submit feedback right now.");
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <>
        <main
          className="tdp-shell"
          style={{ display: "grid", placeItems: "center", padding: 24 }}
        >
          <article className="tdp-card" style={{ maxWidth: 720 }}>
            <div className="crumb">Open House Feedback</div>
            <h1 className="tdp-card-title" style={{ marginTop: 8 }}>
              Thank you for sharing your feedback.
            </h1>
            <p className="tdp-card-sub">
              Your response has been recorded for the Road Home Program Open
              House.
            </p>
            <p className="tdp-help" style={{ marginTop: 12, fontSize: 14 }}>
              You can close this page now.
            </p>
          </article>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <main className="tdp-shell tdp-shell--mobile-form-first">
        <section className="tdp-left">
          <div className="crumb">Road Home Program</div>
          <h1 className="tdp-title" style={{ maxWidth: 640 }}>
            Open House <span className="tdp-year">Feedback</span>
          </h1>
          <p className="tdp-sub" style={{ maxWidth: 620 }}>
            Help us understand how the March 26, 2026 open house experience went
            and what kept you from attending if you missed it.
          </p>

          <div className="tdp-block">
            <img
              src={ShieldIMG}
              alt="Road Home Program"
              style={{ width: 88, height: 88, objectFit: "contain" }}
            />
          </div>

          <div className="tdp-block">
            <h3>What we ask</h3>
            <p className="tdp-sub" style={{ marginTop: 4, maxWidth: 560 }}>
              This form takes less than a minute. If you attended, you can leave
              a rating and optional comments. If you did not attend, you can tell
              us why.
            </p>
          </div>
        </section>

        <section className="tdp-right">
          <article className="tdp-card">
            <h2 className="tdp-card-title">Road Home Program Open House Feedback</h2>
            <p className="tdp-card-sub">
              Did you attend this event?
            </p>

            <form className="tdp-form" onSubmit={handleSubmit}>
              <div className="tdp-toggles" role="radiogroup" aria-label="Attendance">
                <button
                  type="button"
                  className={`tdp-toggle ${attended === true ? "on" : ""}`}
                  aria-pressed={attended === true}
                  onClick={() => resetForAttendance(true)}
                >
                  <i aria-hidden="true" />
                  <span>Yes</span>
                </button>
                <button
                  type="button"
                  className={`tdp-toggle ${attended === false ? "on" : ""}`}
                  aria-pressed={attended === false}
                  onClick={() => resetForAttendance(false)}
                >
                  <i aria-hidden="true" />
                  <span>No</span>
                </button>
              </div>

              {attended === true && (
                <>
                  <div className="tdp-field">
                    <div className="tdp-chips-head" style={{ marginBottom: 8 }}>
                      Rating
                    </div>
                    <div
                      className="chip-grid"
                      role="group"
                      aria-label="Rate the event from 1 to 5"
                      style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className="chip-btn"
                          aria-pressed={rating === value}
                          onClick={() => setRating(value)}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                    <div className="field-hint">Optional rating from 1 to 5.</div>
                  </div>

                  <label>
                    Comments
                    <textarea
                      rows={5}
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Share any feedback about the event."
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: 10,
                        padding: "10px 12px",
                        font: "inherit",
                        resize: "vertical",
                      }}
                    />
                  </label>
                </>
              )}

              {attended === false && (
                <>
                  <div className="tdp-field">
                    <div className="tdp-chips-head" style={{ marginBottom: 8 }}>
                      What kept you from attending?
                    </div>
                    <div className="tdp-toggles">
                      {noShowOptions.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          className={`tdp-toggle ${reasons[option.key] ? "on" : ""}`}
                          aria-pressed={reasons[option.key]}
                          onClick={() => toggleReason(option.key)}
                        >
                          <i aria-hidden="true" />
                          <span>{option.label}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        className={`tdp-toggle ${otherSelected ? "on" : ""}`}
                        aria-pressed={otherSelected}
                        onClick={() => setOtherSelected((prev) => !prev)}
                      >
                        <i aria-hidden="true" />
                        <span>Other</span>
                      </button>
                    </div>
                  </div>

                  {otherSelected && (
                    <label>
                      Other reason
                      <textarea
                        rows={4}
                        value={reasonOther}
                        onChange={(e) => setReasonOther(e.target.value)}
                        placeholder="Tell us what kept you from attending."
                        style={{
                          border: "1px solid var(--line)",
                          borderRadius: 10,
                          padding: "10px 12px",
                          font: "inherit",
                          resize: "vertical",
                        }}
                      />
                    </label>
                  )}
                </>
              )}

              {errorMessage ? <div className="tdp-msg">{errorMessage}</div> : null}

              <button type="submit" className="tdp-submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Feedback"}
              </button>
            </form>
          </article>
        </section>
      </main>
      <Footer />
    </>
  );
}
