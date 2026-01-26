import React, { useEffect, useState } from "react";
import "../turkeydrop/turkeydrop2025/turkeydrop2025.css";

export default function OpenHouseThankYou() {
  const [partySize, setPartySize] = useState(null);

  useEffect(() => {
    document.title = "Thanks for your RSVP";
    try {
      const stored = sessionStorage.getItem("openhouse:familySize");
      if (stored) {
        const parsed = Number(stored);
        if (Number.isFinite(parsed) && parsed >= 1) {
          setPartySize(parsed);
        }
      }
      sessionStorage.removeItem("openhouse:familySize");
    } catch {
      // ignore storage read errors
    }
  }, []);

  return (
    <main
      className="tdp-shell"
      style={{ display: "grid", placeItems: "center", padding: 24 }}
    >
      <article className="tdp-card" style={{ maxWidth: 720 }}>
        <a
          href="/open-house"
          style={{ textDecoration: "none", fontSize: 28, display: "inline-block" }}
          aria-label="Back to Open House"
        >
          ✅
        </a>
        <h1 className="tdp-card-title" style={{ marginTop: 8 }}>
          Thanks for your RSVP.
        </h1>
        <p className="tdp-card-sub">
          You are on the list. We will email you when Open House details are ready.
        </p>

        {partySize && (
          <div className="tdp-block">
            <h3>Party details</h3>
            <p style={{ margin: 0 }}>Party Size: {partySize}</p>
          </div>
        )}

        <div className="tdp-block">
          <h3>In the meantime</h3>
          <p style={{ margin: 0 }}>
            If you need help connecting with Road Home Program services, call {" "}
            <a href="tel:13129428387">(312) 942-8387 (VETS)</a> or email {" "}
            <a href="mailto:events@roadhomeprogram.org">
              events@roadhomeprogram.org
            </a>
            .
          </p>
        </div>

        <p className="tdp-help" style={{ marginTop: 16 }}>
          You can close this page now.
        </p>
      </article>
    </main>
  );
}
