// src/pages/whitechristmas/index.jsx
import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import WhiteChristmasSlotPicker from "./slot-picker.jsx";
import "../turkeydrop/turkeydrop2025/turkeydrop2025.css";
import ShieldIMG from "../../assets/rhp-shield.png";
import Shield from "../../assets/shield.png";
import FamilyNightBanner from "../../assets/FamilyNight.png";

// Registration cutoff: Dec 11, 2025 at 11:59 PM America/Chicago
const registrationClosed = new Date() > new Date("2025-12-12T00:00:00-06:00");
const EVENT_ID = "white-christmas-2025";
const pageUrl = "https://www.roadhome.io/whitechristmas";
const pageTitle = "Road Home Program Family Holiday Night";
const EVENT_DATE = "Thursday, December 18, 2025";
const description =
  "Join the Road Home Program for a family-focused holiday evening in Aurora, the City of Lights. We invite veterans and their families to share a warm seasonal gathering with dinner at Giardino's Trattoria and Pizzeria at 4:30 PM, followed by a short walk to the Paramount Aurora Theatre for a performance of White Christmas.";
const image = "https://www.roadhome.io/og/whitechristmas-banner.png"; // update when ready

// Flip this to true when you are ready to close online registrations
const REGISTRATION_CLOSED = false;

export default function WhiteChristmasEvent() {
  const [counts, setCounts] = useState({
    reserved: 0,
    remaining: 0,
    total_capacity: 0,
  });

  useEffect(() => {
    document.title = pageTitle;
  }, []);

  const computeCountsFromSlots = useCallback(async () => {
    const { data, error } = await supabase
      .from("v_slot_capacity")
      .select("capacity,seats_taken,seats_remaining")
      .eq("event_id", EVENT_ID);

    if (error || !data) {
      return { reserved: 0, remaining: 0, total_capacity: 0 };
    }
    const total_capacity = data.reduce(
      (a, r) => a + (Number(r.capacity) || 0),
      0
    );
    const reserved = data.reduce(
      (a, r) => a + (Number(r.seats_taken) || 0),
      0
    );
    const remaining = data.reduce(
      (a, r) => a + (Number(r.seats_remaining) || 0),
      0
    );
    return { reserved, remaining, total_capacity };
  }, []);

  const loadCounts = useCallback(async () => {
    // Try materialized/SQL view first for speed (if present)
    const { data, error } = await supabase
      .from("event_counts")
      .select("reserved, remaining, total_capacity")
      .eq("event_id", EVENT_ID)
      .maybeSingle();

    if (!error && data) {
      setCounts({
        reserved: Number(data.reserved) || 0,
        remaining: Number(data.remaining) || 0,
        total_capacity: Number(data.total_capacity) || 0,
      });
      return;
    }

    // Fallback: compute live from v_slot_capacity
    const fallback = await computeCountsFromSlots();
    setCounts(fallback);
  }, [computeCountsFromSlots]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const filled = counts.reserved || 0;
  const total = counts.total_capacity || 0;
  const pct = total ? Math.min(100, Math.round((filled / total) * 100)) : 0;

  return (
    <>
      {/* --- Metadata --- */}
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={pageUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      <main className="tdp-shell">
        <div
          className="tdp-bg"
          style={{ "--bg-url": `url(${ShieldIMG})` }}
          aria-hidden="true"
        />
        <section className="tdp-left">
          <img
            src={FamilyNightBanner}
            alt="Road Home Program Family Holiday Night"
            className="tdp-banner"
            style={{ marginTop: 0 }}
          />
          <h1 className="tdp-title">{pageTitle}</h1>
          <p
            className="tdp-sub"
            style={{ margin: "8px 0", fontWeight: 700, color: "#082d18" }}
          >
            {EVENT_DATE}
          </p>
          <p className="tdp-sub">{description}</p>

          {!REGISTRATION_CLOSED && (
            <div className="tdp-block">
              <h3>Reservations</h3>
              <div className="tdp-progress">
                <div
                  className="tdp-progress-bar"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="tdp-progress-meta">
                <span>
                  {filled} / {total} filled
                </span>
                <span>Remaining reservations: {counts.remaining ?? 0}</span>
              </div>
            </div>
          )}
        </section>

        <section className="tdp-right">
          {REGISTRATION_CLOSED ? (
            <RegistrationClosedCard />
          ) : (
            <ReservationCard />
          )}
        </section>
      </main>

      {/* Footer appears below the main layout */}
      <RHPSiteFooter />
    </>
  );
}

/* ---------- Reservation (open state) ---------- */
function ReservationCard() {
  return (
    <article className="tdp-card">
      <h2 className="tdp-card-title">RSVP for Family Holiday Night</h2>
      <p className="tdp-card-sub">
        Seats are limited for this shared dinner and theater experience.
        Reserve for your household in just a couple of minutes.
      </p>
      <p className="tdp-sub" style={{ marginTop: 0 }}>
        If you need to change plans, please let us know at least a week in
        advance so another military family can enjoy this evening.
      </p>
      <div className="tdp-block" style={{ marginTop: 16 }}>
        <h3>Event date</h3>
        <p style={{ margin: 0, fontWeight: 600 }}>{EVENT_DATE}</p>
      </div>
      {registrationClosed ? (
        <div className="tdp-closed-box">
          <h2>Registration is Closed</h2>
          <p>
            Registration for the Road Home Program Family Holiday Night has now
            closed. If you have questions, please contact Modwene “Modie” Lavin
            at <a href="mailto:Modwene_Lavin@rush.edu">Modwene_Lavin@rush.edu</a>{" "}
            or call her office at{" "}
            <a href="tel:13129428354">(312) 942-8354</a>.
          </p>
        </div>
      ) : (
        <WhiteChristmasSlotPicker eventId={EVENT_ID} />
      )}
      <p className="tdp-help">
        Need assistance? Contact Modie Lavin at{" "}
        <a href="mailto:Modwene_Lavin@rush.edu">Modwene_Lavin@rush.edu</a> or call{" "}
        <a href="tel:13129428354">(312) 942-8354</a>. You can also call{" "}
        <a href="tel:13129428387">(312) 942-8387 (VETS)</a> and the Road Home
        Program team can help you RSVP.
      </p>
    </article>
  );
}

/* ---------- Closed state card ---------- */
function RegistrationClosedCard() {
  return (
    <article className="tdp-card">
      <h2 className="tdp-card-title">Registration is now closed</h2>
      <p className="tdp-card-sub">
        Online RSVPs for the Road Home Program Family Holiday Night are now
        closed while we finalize the guest list.
      </p>
      <p className="tdp-sub" style={{ marginTop: 0, fontWeight: 600 }}>
        Event date: {EVENT_DATE}
      </p>

      <div className="tdp-block">
        <h3>Event details</h3>
        <p>
          Our celebration is on {EVENT_DATE}. Dinner at Giardino&apos;s Trattoria
          and Pizzeria begins at 4:30 PM,
          followed by a short walk to the Paramount Aurora Theatre for White
          Christmas. Please refer to your confirmation email for arrival
          instructions.
        </p>
      </div>

      <p className="tdp-help">
        Questions about an existing RSVP? Call{" "}
        <a href="tel:13129428387">(312) 942-8387 (VETS)</a>.
      </p>
    </article>
  );
}

/* ---------- Footer ---------- */
function RHPSiteFooter() {
  return (
    <footer className="tdp-footer" role="contentinfo">
      <div className="tdp-footer__inner">
        {/* Brand / shield */}
        <div className="tdp-footer__brand">
          <img
            src={Shield}
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

        {/* Nav – update hrefs to the exact roadhomeprogram.org URLs if needed */}
        <nav className="tdp-footer__nav" aria-label="Footer">
          <a href="https://roadhomeprogram.org/family-center/">
            Help for Families
          </a>
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
          <a href="https://roadhomeprogram.org/contact-us/">
            General Information
          </a>
          <a
            href="https://www.rush.edu/website-privacy-statement"
            target="_blank"
            rel="noreferrer"
          >
            Privacy Statement
          </a>
          <a
            href="https://www.rush.edu/disclaimer"
            target="_blank"
            rel="noreferrer"
          >
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
