import React from "react";

export default function ClosedEventMessage({
  eventName,
  nextEventLink = "/sandiego-salute-and-social",
  nextEventLabel = "View Upcoming Events",
}) {
  return (
    <section
      className="tdp-block"
      aria-label={`${eventName || "Event"} closed message`}
      style={{
        marginTop: 20,
        padding: "28px 24px",
        borderRadius: 18,
        background: "linear-gradient(180deg, #f8fbf9 0%, #eef7f1 100%)",
        border: "1px solid #d6e8dc",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 12,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "#2f6b49",
          fontWeight: 700,
        }}
      >
        Event Concluded
      </p>
      <h3 style={{ margin: "10px 0 0", fontSize: 28, lineHeight: 1.15 }}>
        Thank you for your interest in the {eventName}.
      </h3>
      <p style={{ margin: "16px 0 0", fontSize: 17, lineHeight: 1.65 }}>
        This event has concluded. We appreciate everyone who attended and supported
        the event.
      </p>
      <p style={{ margin: "14px 0 0", fontSize: 17, lineHeight: 1.65 }}>
        Please check back for future events or follow us for updates on upcoming
        opportunities.
      </p>
      <p style={{ margin: "14px 0 0", fontSize: 17, lineHeight: 1.65 }}>
        We look forward to seeing you next year.
      </p>
      {nextEventLink ? (
        <a
          className="tdp-submit"
          href={nextEventLink}
          style={{ display: "inline-flex", marginTop: 20 }}
        >
          {nextEventLabel}
        </a>
      ) : null}
    </section>
  );
}
