import React, { useEffect, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import "../turkeydrop/turkeydrop2025/turkeydrop2025.css";
import { SD_EVENTS } from "./sdEvents";

export default function SdThankYou() {
  const location = useLocation();

  const { eventTitle, venueName, dateLabel, timeLabel, orderId, backPath } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const eventKey = params.get("event");
    const currentOrderId = params.get("order_id");
    const event = Object.values(SD_EVENTS).find((item) => item.key === eventKey);
    return {
      eventTitle: event?.title || "San Diego Event",
      venueName: event?.venueName || "",
      dateLabel: event?.dateLabel || "",
      timeLabel: event?.timeLabel || "",
      orderId: currentOrderId || null,
      backPath: event?.path || "/sd",
    };
  }, [location.search]);

  const isChowCall = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("event") === SD_EVENTS.chowCall.key;
  }, [location.search]);

  useEffect(() => {
    document.title = "Thanks for your RSVP";
  }, []);

  return (
    <main
      className="tdp-shell"
      style={{ display: "grid", placeItems: "center", padding: 24 }}
    >
      <article className="tdp-card" style={{ maxWidth: 720 }}>
        <Link
          to={backPath}
          style={{ textDecoration: "none", fontSize: 28, display: "inline-block" }}
          aria-label="Back to San Diego event page"
        >
          ✅
        </Link>
        <h1 className="tdp-card-title" style={{ marginTop: 8 }}>
          {eventTitle}
        </h1>
        <p className="tdp-card-sub">
          Thanks for your RSVP. Your confirmation has been received.
        </p>
        {(venueName || dateLabel || timeLabel) && (
          <div className="tdp-block">
            <h3>Event details</h3>
            <p style={{ margin: 0 }}>
              {venueName ? (
                <>
                  Venue: {venueName}
                  <br />
                </>
              ) : null}
              {dateLabel ? (
                <>
                  Date: {dateLabel}
                  <br />
                </>
              ) : null}
              {timeLabel ? <>Time: {timeLabel}</> : null}
            </p>
          </div>
        )}
        {isChowCall && (
          <p className="tdp-help" style={{ marginTop: 8 }}>
            If you have dietary restrictions or accessibility needs, email Chris.
          </p>
        )}
        {orderId && (
          <div className="tdp-block">
            <h3>Confirmation ID</h3>
            <p style={{ margin: 0 }}>
              <code>{orderId}</code>
            </p>
          </div>
        )}
        <div className="tdp-block">
          <h3>Need assistance?</h3>
          <p style={{ margin: 0 }}>
            For event support, email{" "}
            <a href="mailto:events@roadhomeprogram.org">events@roadhomeprogram.org</a> or
            call <a href="tel:13129428387">(312) 942-8387 (VETS)</a>.
          </p>
        </div>
        <p style={{ marginTop: 8 }}>
          <Link to={backPath}>Back to event page</Link>
        </p>
        <p className="tdp-help" style={{ marginTop: 8 }}>
          You can close this page now.
        </p>
      </article>
    </main>
  );
}
