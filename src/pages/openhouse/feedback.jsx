import React, { useEffect, useMemo, useState } from "react";
import "../turkeydrop/turkeydrop2025/turkeydrop2025.css";
import ShieldIMG from "../../assets/rhp-shield.png";
import ShieldFooterIMG from "../../assets/shield.png";
import ShieldExcellenceBanner from "../../assets/RHP Shield Excellence banner.png";
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
  { key: "reason_inclement_weather", label: "Inclement weather" },
  { key: "reason_transport", label: "Parking, traffic, transit issues" },
];

const metStaffOptions = [
  { key: "met_outreach", label: "Outreach" },
  { key: "met_clinical", label: "Clinical Providers" },
  { key: "met_administrative", label: "Administrative" },
  { key: "met_research", label: "Research" },
  { key: "met_art_therapy", label: "Art Therapy" },
  { key: "met_philanthropy", label: "Philanthropy" },
  { key: "met_alum", label: "Alumni" },
];

const initialReasons = {
  reason_scheduling: false,
  reason_unexpected: false,
  reason_forgot: false,
  reason_access: false,
  reason_interest: false,
  reason_inclement_weather: false,
  reason_transport: false,
};

const initialMetStaff = {
  met_outreach: false,
  met_clinical: false,
  met_administrative: false,
  met_research: false,
  met_art_therapy: false,
  met_philanthropy: false,
  met_alum: false,
};

const boxFieldStyle = {
  border: "1px solid var(--line)",
  borderRadius: 10,
  padding: "10px 12px",
  font: "inherit",
  resize: "vertical",
  width: "100%",
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

function SectionIntro({ title, copy }) {
  return (
    <div className="tdp-block" style={{ marginTop: 20 }}>
      <h3 style={{ marginBottom: 6 }}>{title}</h3>
      <p className="tdp-sub" style={{ margin: 0 }}>
        {copy}
      </p>
    </div>
  );
}

function ToggleButtons({ value, onSelect, options, ariaLabel }) {
  return (
    <div className="tdp-toggles" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`tdp-toggle ${value === option.value ? "on" : ""}`}
          aria-pressed={value === option.value}
          onClick={() => onSelect(option.value)}
        >
          <i aria-hidden="true" />
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

function CheckboxButtons({ values, onToggle, options, ariaLabel }) {
  return (
    <div className="tdp-toggles" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className={`tdp-toggle ${values[option.key] ? "on" : ""}`}
          aria-pressed={values[option.key]}
          onClick={() => onToggle(option.key)}
        >
          <i aria-hidden="true" />
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function OpenHouseFeedbackPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const rsvpId = params.get("rsvp_id")?.trim() || null;

  const [attended, setAttended] = useState(null);
  const [reasons, setReasons] = useState(initialReasons);
  const [reasonOther, setReasonOther] = useState("");
  const [reminderResponse, setReminderResponse] = useState("");
  const [preferredFormatNeeded, setPreferredFormatNeeded] = useState(null);
  const [preferredFormat, setPreferredFormat] = useState("");
  const [futureEventInterest, setFutureEventInterest] = useState("");
  const [attendanceImprovement, setAttendanceImprovement] = useState("");
  const [wantsStaffFollowup, setWantsStaffFollowup] = useState(null);
  const [wantsClinicTour, setWantsClinicTour] = useState(null);
  const [discussionValue, setDiscussionValue] = useState(null);
  const [madeStaffConnections, setMadeStaffConnections] = useState("");
  const [staffShoutouts, setStaffShoutouts] = useState("");
  const [understandsMission, setUnderstandsMission] = useState("");
  const [furtherEngagement, setFurtherEngagement] = useState("");
  const [givingInterest, setGivingInterest] = useState("");
  const [metStaff, setMetStaff] = useState(initialMetStaff);
  const [additionalFeedback, setAdditionalFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorField, setErrorField] = useState("");

  useEffect(() => {
    document.title = "Road Home Program Open House Feedback";
  }, []);

  const scrollToField = (field) => {
    if (!field) return;
    const node = document.querySelector(`[data-field="${field}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const failValidation = (field, message) => {
    setErrorField(field);
    setErrorMessage(message);
    scrollToField(field);
  };

  const resetForAttendance = (nextAttended) => {
    setAttended(nextAttended);
    setErrorMessage("");
    setErrorField("");

    setReasons(initialReasons);
    setReasonOther("");
    setReminderResponse("");
    setPreferredFormatNeeded(null);
    setPreferredFormat("");
    setFutureEventInterest("");
    setAttendanceImprovement("");
    setWantsStaffFollowup(null);
    setWantsClinicTour(null);
    setDiscussionValue(null);
    setMadeStaffConnections("");
    setStaffShoutouts("");
    setUnderstandsMission("");
    setFurtherEngagement("");
    setGivingInterest("");
    setMetStaff(initialMetStaff);
    setAdditionalFeedback("");
  };

  const toggleReason = (key) => {
    setReasons((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleMetStaff = (key) => {
    setMetStaff((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (attended === null) {
      failValidation("attendance", "Please tell us whether you attended the event.");
      return;
    }

    if (attended) {
      if (!discussionValue) {
        failValidation("discussion_value", "Please answer the discussion value question.");
        return;
      }
      if (!madeStaffConnections) {
        failValidation("made_staff_connections", "Please answer the staff connections question.");
        return;
      }
      if (!understandsMission) {
        failValidation("understands_mission", "Please answer the mission understanding question.");
        return;
      }
      if (!furtherEngagement) {
        failValidation("further_engagement", "Please answer the further engagement question.");
        return;
      }
      if (!givingInterest) {
        failValidation("giving_interest", "Please answer the giving interest question.");
        return;
      }
      if (!Object.values(metStaff).some(Boolean)) {
        failValidation("met_staff", "Please select at least one staff group you met.");
        return;
      }
    } else {
      if (!Object.values(reasons).some(Boolean) && !reasonOther.trim()) {
        failValidation("reasons", "Please select at least one attendance barrier.");
        return;
      }
      if (!reminderResponse) {
        failValidation("reminder_response", "Please answer the reminders question.");
        return;
      }
      if (preferredFormatNeeded === null) {
        failValidation("preferred_format_needed", "Please answer the event format question.");
        return;
      }
      if (preferredFormatNeeded && !preferredFormat.trim()) {
        failValidation("preferred_format", "Please tell us what format you would prefer.");
        return;
      }
      if (!futureEventInterest) {
        failValidation("future_event_interest", "Please answer the future event interest question.");
        return;
      }
      if (!attendanceImprovement.trim()) {
        failValidation("attendance_improvement", "Please tell us how we could improve attendance.");
        return;
      }
      if (wantsStaffFollowup === null) {
        failValidation("wants_staff_followup", "Please answer the staff follow-up question.");
        return;
      }
      if (wantsClinicTour === null) {
        failValidation("wants_clinic_tour", "Please answer the clinic tour question.");
        return;
      }
    }

    setSubmitting(true);
    setErrorMessage("");
    setErrorField("");

    const payload = {
      event_id: EVENT_ID,
      rsvp_id: rsvpId,
      attended,
      ...reasons,
      reason_other: attended ? null : reasonOther.trim() || null,
      rating: null,
      comments: null,
      reminder_response: attended ? null : reminderResponse,
      preferred_format_needed: attended ? null : preferredFormatNeeded,
      preferred_format:
        attended || !preferredFormatNeeded ? null : preferredFormat.trim(),
      future_event_interest: attended ? null : futureEventInterest,
      attendance_improvement:
        attended ? null : attendanceImprovement.trim() || null,
      wants_staff_followup: attended ? null : wantsStaffFollowup,
      wants_clinic_tour: attended ? null : wantsClinicTour,
      discussion_value: attended ? discussionValue : null,
      made_staff_connections: attended ? madeStaffConnections : null,
      staff_shoutouts: attended ? staffShoutouts.trim() || null : null,
      understands_mission: attended ? understandsMission : null,
      further_engagement: attended ? furtherEngagement : null,
      giving_interest: attended ? givingInterest : null,
      met_outreach: attended ? metStaff.met_outreach : false,
      met_clinical: attended ? metStaff.met_clinical : false,
      met_administrative: attended ? metStaff.met_administrative : false,
      met_research: attended ? metStaff.met_research : false,
      met_art_therapy: attended ? metStaff.met_art_therapy : false,
      met_philanthropy: attended ? metStaff.met_philanthropy : false,
      met_alum: attended ? metStaff.met_alum : false,
      additional_feedback: additionalFeedback.trim() || null,
    };

    const { data, error } = await supabase.functions.invoke("open-house-feedback", {
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
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <main
            className="tdp-shell"
            style={{ display: "grid", placeItems: "center", padding: 24, flex: 1 }}
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
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <main className="tdp-shell tdp-shell--mobile-form-first" style={{ flex: 1 }}>
          <div
            className="tdp-bg"
            style={{ "--bg-url": `url(${ShieldIMG})` }}
            aria-hidden="true"
          />

          <section className="tdp-left">
            <div className="tdp-block" style={{ marginTop: 0, marginBottom: 20 }}>
              <img
                src={ShieldExcellenceBanner}
                alt="Road Home Program banner"
                className="tdp-banner"
                style={{
                  maxWidth: 560,
                  width: "100%",
                }}
              />
            </div>

            <h1 className="tdp-title" style={{ maxWidth: 640 }}>
              Open House <span className="tdp-year">Feedback</span>
            </h1>
            <p className="tdp-sub" style={{ maxWidth: 620 }}>
              Help us understand how the March 26, 2026 open house experience went
              and what could make future engagement even better.
            </p>

            <SectionIntro
              title="What to expect"
              copy="You will only see the questions that apply to your answer. Most people can complete this in two to three minutes."
            />
          </section>

          <section className="tdp-right">
            <article className="tdp-card">
              <h2 className="tdp-card-title">Road Home Program Open House Feedback</h2>
              <p className="tdp-card-sub">Did you attend this event?</p>

            <form className="tdp-form" onSubmit={handleSubmit}>
              <div
                data-field="attendance"
                className={errorField === "attendance" ? "tdp-section tdp-err-ring" : undefined}
              >
                <ToggleButtons
                  ariaLabel="Attendance"
                  value={attended}
                  onSelect={resetForAttendance}
                  options={[
                    { value: true, label: "Yes" },
                    { value: false, label: "No" },
                  ]}
                />
              </div>

              {attended === true && (
                <>
                  <SectionIntro
                    title="Attendee questions"
                    copy="Tell us what stood out and how you would like to stay connected."
                  />

                  <div
                    data-field="discussion_value"
                    className={errorField === "discussion_value" ? "tdp-section tdp-err-ring" : undefined}
                  >
                    <div className="tdp-chips-head" style={{ marginBottom: 8, fontWeight: 700 }}>
                      Did you find the discussions and meeting staff valuable?*
                    </div>
                    <div
                      className="chip-grid"
                      role="group"
                      aria-label="Discussion value"
                      style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className="chip-btn"
                          aria-pressed={discussionValue === value}
                          onClick={() => setDiscussionValue(value)}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                    <div className="field-hint">
                      1 = Strongly disagree, 2 = Disagree, 3 = Neutral, 4 = Agree, 5 = Strongly agree
                    </div>
                  </div>

                  <div
                    data-field="made_staff_connections"
                    className={errorField === "made_staff_connections" ? "tdp-section tdp-err-ring" : undefined}
                  >
                    <div className="tdp-chips-head" style={{ fontWeight: 700 }}>Did you make any valuable connections with our staff during the event?*</div>
                    <ToggleButtons
                      ariaLabel="Made staff connections"
                      value={madeStaffConnections}
                      onSelect={setMadeStaffConnections}
                      options={[
                        { value: "yes", label: "Yes" },
                        { value: "no", label: "No" },
                        { value: "not_sure", label: "Not sure" },
                      ]}
                    />
                  </div>

                  <label style={{ fontWeight: 700 }}>
                    Any special shout outs for our staff?
                    <textarea
                      rows={4}
                      value={staffShoutouts}
                      onChange={(e) => setStaffShoutouts(e.target.value)}
                      placeholder="Optional"
                      style={boxFieldStyle}
                    />
                  </label>

                  <div
                    data-field="understands_mission"
                    className={errorField === "understands_mission" ? "tdp-section tdp-err-ring" : undefined}
                  >
                    <div className="tdp-chips-head" style={{ fontWeight: 700 }}>Do you fully understand RHP&apos;s mission and the services they provide?*</div>
                    <ToggleButtons
                      ariaLabel="Understands mission"
                      value={understandsMission}
                      onSelect={setUnderstandsMission}
                      options={[
                        { value: "yes", label: "Yes" },
                        { value: "somewhat", label: "Somewhat" },
                        { value: "no", label: "No" },
                      ]}
                    />
                  </div>

                  <div
                    data-field="further_engagement"
                    className={errorField === "further_engagement" ? "tdp-section tdp-err-ring" : undefined}
                  >
                    <div className="tdp-chips-head" style={{ fontWeight: 700 }}>Would you like further outreach or engagement from us?*</div>
                    <ToggleButtons
                      ariaLabel="Further engagement"
                      value={furtherEngagement}
                      onSelect={setFurtherEngagement}
                      options={[
                        {
                          value: "learn_more_services",
                          label: "Learn more about programs/services",
                        },
                        {
                          value: "future_events",
                          label: "Stay informed about future events",
                        },
                        { value: "no", label: "No, not at this time" },
                      ]}
                    />
                  </div>

                  <div
                    data-field="giving_interest"
                    className={errorField === "giving_interest" ? "tdp-section tdp-err-ring" : undefined}
                  >
                    <div className="tdp-chips-head" style={{ fontWeight: 700 }}>Are you interested in supporting our work through philanthropic giving?*</div>
                    <p className="field-hint" style={{ marginTop: 4 }}>
                      If yes, contact Michelle Boardman at <a href="tel:13129426884">(312) 942-6884</a> or <a href="mailto:michelle_a_boardman@rush.edu">michelle_a_boardman@rush.edu</a>.
                    </p>
                    <ToggleButtons
                      ariaLabel="Giving interest"
                      value={givingInterest}
                      onSelect={setGivingInterest}
                      options={[
                        {
                          value: "yes_more_info",
                          label: "Yes, I'd like more information on ways to give",
                        },
                        { value: "maybe_future", label: "Maybe in the future" },
                        { value: "no", label: "No, not at this time" },
                      ]}
                    />
                  </div>

                  <div
                    data-field="met_staff"
                    className={errorField === "met_staff" ? "tdp-section tdp-err-ring" : undefined}
                  >
                    <div className="tdp-chips-head" style={{ fontWeight: 700 }}>What staff members did you have a chance to engage with at the event?*</div>
                    <CheckboxButtons
                      ariaLabel="Met staff groups"
                      values={metStaff}
                      onToggle={toggleMetStaff}
                      options={metStaffOptions}
                    />
                    <div className="field-hint">Select all that apply. At least one selection is required.</div>
                  </div>

                  <label style={{ fontWeight: 700 }}>
                    Any additional feedback or suggestions?
                    <textarea
                      rows={5}
                      value={additionalFeedback}
                      onChange={(e) => setAdditionalFeedback(e.target.value)}
                      placeholder="Optional"
                      style={boxFieldStyle}
                    />
                  </label>
                </>
              )}

              {attended === false && (
                <>
                  <SectionIntro
                    title="Non-attendee questions"
                    copy="Tell us what prevented attendance and how we can make future events easier to join."
                  />

                  <div
                    data-field="reasons"
                    className={errorField === "reasons" ? "tdp-section tdp-err-ring" : undefined}
                  >
                    <div className="tdp-chips-head" style={{ fontWeight: 700 }}>What was the main reason you couldn't attend the event?*</div>
                    <CheckboxButtons
                      ariaLabel="No-show reasons"
                      values={reasons}
                      onToggle={toggleReason}
                      options={noShowOptions}
                    />
                    <label style={{ marginTop: 10 }}>
                      Other
                      <input
                        value={reasonOther}
                        onChange={(e) => setReasonOther(e.target.value)}
                        placeholder="Tell us more"
                        style={boxFieldStyle}
                      />
                    </label>
                  </div>

                  <div
                    data-field="reminder_response"
                    className={errorField === "reminder_response" ? "tdp-section tdp-err-ring" : undefined}
                  >
                    <div className="tdp-chips-head" style={{ fontWeight: 700 }}>Did you receive event reminders?*</div>
                    <ToggleButtons
                      ariaLabel="Reminder response"
                      value={reminderResponse}
                      onSelect={setReminderResponse}
                      options={[
                        { value: "helpful", label: "Yes, and they were helpful" },
                        {
                          value: "received_not_enough",
                          label: "Yes, but I still couldn't attend",
                        },
                        {
                          value: "dont_remember",
                          label: "No, I don't remember receiving reminders",
                        },
                      ]}
                    />
                  </div>

                  <div
                    data-field="preferred_format_needed"
                    className={errorField === "preferred_format_needed" ? "tdp-section tdp-err-ring" : undefined}
                  >
                    <div className="tdp-chips-head" style={{ fontWeight: 700 }}>Would a different event format have made it easier for you to attend?*</div>
                    <ToggleButtons
                      ariaLabel="Preferred format needed"
                      value={preferredFormatNeeded}
                      onSelect={setPreferredFormatNeeded}
                      options={[
                        { value: true, label: "Yes" },
                        { value: false, label: "No" },
                      ]}
                    />
                  </div>

                  {preferredFormatNeeded === true && (
                    <label
                      data-field="preferred_format"
                      className={errorField === "preferred_format" ? "tdp-section tdp-err-ring" : undefined}
                      style={{ fontWeight: 700 }}
                    >
                      What format would you prefer?*
                      <input
                        value={preferredFormat}
                        onChange={(e) => setPreferredFormat(e.target.value)}
                        placeholder="Virtual, hybrid, weekday evening, etc."
                        style={boxFieldStyle}
                      />
                    </label>
                  )}

                  <div
                    data-field="future_event_interest"
                    className={errorField === "future_event_interest" ? "tdp-section tdp-err-ring" : undefined}
                  >
                    <div className="tdp-chips-head" style={{ fontWeight: 700 }}>Would you be interested in attending a similar event in the future?*</div>
                    <ToggleButtons
                      ariaLabel="Future event interest"
                      value={futureEventInterest}
                      onSelect={setFutureEventInterest}
                      options={[
                        { value: "yes", label: "Yes" },
                        { value: "no", label: "No" },
                        { value: "maybe", label: "Maybe" },
                      ]}
                    />
                  </div>

                  <label style={{ fontWeight: 700 }}>
                    Any additional feedback or suggestions?
                    <textarea
                      rows={4}
                      value={additionalFeedback}
                      onChange={(e) => setAdditionalFeedback(e.target.value)}
                      placeholder="Optional"
                      style={boxFieldStyle}
                    />
                  </label>

                  <label
                    data-field="attendance_improvement"
                    className={errorField === "attendance_improvement" ? "tdp-section tdp-err-ring" : undefined}
                    style={{ fontWeight: 700 }}
                  >
                    What could we do to improve attendance at our future events?*
                    <textarea
                      rows={4}
                      value={attendanceImprovement}
                      onChange={(e) => setAttendanceImprovement(e.target.value)}
                      placeholder="Share ideas for timing, reminders, format, transportation, or anything else."
                      style={boxFieldStyle}
                    />
                  </label>

                  <div
                    data-field="wants_staff_followup"
                    className={errorField === "wants_staff_followup" ? "tdp-section tdp-err-ring" : undefined}
                  >
                    <div className="tdp-chips-head" style={{ fontWeight: 700 }}>Would you like a follow up presentation with a member of our staff to brief on our program and services?*</div>
                    <ToggleButtons
                      ariaLabel="Wants staff followup"
                      value={wantsStaffFollowup}
                      onSelect={setWantsStaffFollowup}
                      options={[
                        { value: true, label: "Yes" },
                        { value: false, label: "No" },
                      ]}
                    />
                  </div>

                  <div
                    data-field="wants_clinic_tour"
                    className={errorField === "wants_clinic_tour" ? "tdp-section tdp-err-ring" : undefined}
                  >
                    <div className="tdp-chips-head" style={{ fontWeight: 700 }}>Would you still like to set up tour of our clinic?*</div>
                    <ToggleButtons
                      ariaLabel="Wants clinic tour"
                      value={wantsClinicTour}
                      onSelect={setWantsClinicTour}
                      options={[
                        { value: true, label: "Yes" },
                        { value: false, label: "No" },
                      ]}
                    />
                  </div>
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
      </div>
    </>
  );
}
