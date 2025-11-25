// src/pages/whitechristmas/thankyou.jsx
import React from "react";
import "../turkeydrop/turkeydrop2025/turkeydrop2025.css";

const EVENT_DATE = "Thursday, December 18, 2025";

export default function WhiteChristmasThankYou() {
  return (
    <main
      className="tdp-shell"
      style={{ gridTemplateColumns: "1fr", maxWidth: 720, marginTop: 32 }}
    >
      <section className="tdp-left">
        <article className="tdp-card">
          <h1 className="tdp-title" style={{ marginBottom: 12 }}>
            Thank you for registering!
          </h1>
          <p className="tdp-sub">
            Thank you for registering for the Road Home Program Family Holiday
            Night. Please arrive at Giardino&apos;s Trattoria and Pizzeria by
            4:30 PM for dinner before we walk to the Paramount Aurora Theatre
            for White Christmas.
          </p>
          <div className="tdp-block" style={{ marginTop: 20 }}>
            <h3>Event date</h3>
            <p style={{ margin: 0, fontWeight: 600 }}>{EVENT_DATE}</p>
          </div>
          <p>
            <strong>Don&apos;t be a grinch and no-show.</strong>
          </p>
        </article>
      </section>
    </main>
  );
}
