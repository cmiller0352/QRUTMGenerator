import React, { useEffect, useState } from "react";
import "../turkeydrop/turkeydrop2025/turkeydrop2025.css";

export default function MstWebinarSeries2026ThankYou() {
  const [selectedSessions, setSelectedSessions] = useState([]);

  useEffect(() => {
    document.title = "Thanks for your RSVP";
    try {
      const stored = sessionStorage.getItem("mst-webinar-series-2026:selectedSessions");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSelectedSessions(parsed.filter((item) => typeof item === "string"));
        }
      }
      sessionStorage.removeItem("mst-webinar-series-2026:selectedSessions");
    } catch {
      // ignore storage issues
    }
  }, []);

  return (
    <main className="tdp-shell" style={{ display: "grid", placeItems: "center", padding: 24 }}>
      <article className="tdp-card" style={{ maxWidth: 760 }}>
        <a
          href="/mst-webinar-series-2026"
          style={{ textDecoration: "none", fontSize: 28, display: "inline-block" }}
          aria-label="Back to webinar series page"
        >
          ✅
        </a>
        <h1 className="tdp-card-title" style={{ marginTop: 8 }}>
          Thanks for registering.
        </h1>
        <p className="tdp-card-sub">
          Your RSVP for the MST and Healing webinar series has been received.
        </p>
        <p className="tdp-help" style={{ marginTop: 8 }}>
          Webinar access details and reminders will be sent to your email.
        </p>

        {selectedSessions.length > 0 && (
          <div className="tdp-block" style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Selected sessions</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {selectedSessions.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="tdp-help" style={{ marginTop: 12 }}>
          You can return to the registration page here:{" "}
          <a href="/mst-webinar-series-2026">MST webinar series RSVP</a>.
        </p>

        <div className="tdp-block">
          <h3>Road Home Program contact</h3>
          <p style={{ margin: 0 }}>
            If you need help connecting with Road Home Program services, call{" "}
            <a href="tel:13129428387">(312) 942-8387 (VETS)</a> or email{" "}
            <a href="mailto:events@roadhomeprogram.org">
              events@roadhomeprogram.org
            </a>
            .
          </p>
        </div>
      </article>
    </main>
  );
}
