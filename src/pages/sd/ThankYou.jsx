import React, { useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import "../turkeydrop/turkeydrop2025/turkeydrop2025.css";
import { SD_EVENTS } from "./sdEvents";

export default function SdThankYou() {
  const location = useLocation();

  const { eventTitle, orderId } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const eventKey = params.get("event");
    const currentOrderId = params.get("order_id");
    const event = Object.values(SD_EVENTS).find((item) => item.key === eventKey);
    return {
      eventTitle: event?.title || "San Diego Event",
      orderId: currentOrderId || null,
    };
  }, [location.search]);
  const isChowCall = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("event") === SD_EVENTS.chowCall.key;
  }, [location.search]);

  return (
    <main
      className="tdp-shell"
      style={{ display: "grid", placeItems: "center", padding: 24 }}
    >
      <article className="tdp-card" style={{ maxWidth: 720 }}>
        <h1 className="tdp-card-title" style={{ marginTop: 0 }}>
          {eventTitle}
        </h1>
        <p className="tdp-card-sub">We got your RSVP.</p>
        {isChowCall && (
          <p className="tdp-help" style={{ marginTop: 8 }}>
            If you have dietary restrictions or accessibility needs, email Chris.
          </p>
        )}
        {orderId && (
          <p className="tdp-help" style={{ marginTop: 8 }}>
            Confirmation ID: <code>{orderId}</code>
          </p>
        )}
        <p style={{ marginTop: 16 }}>
          <Link to="/sd/chow-call">Back to San Diego events</Link>
        </p>
      </article>
    </main>
  );
}
