// src/pages/turkeydrop/turkeydrop2025/index.jsx
import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../utils/supabaseClient";
import SlotPicker from "./slot-picker";
import "./turkeydrop2025.css";
import TDBanner from "../../../assets/TD Banner.png";
import ShieldIMG from "../../../assets/rhp-shield.png";
import Shield from "../../../assets/shield.png";

const EVENT_ID = "effingham-2025";
const pageUrl = "https://www.roadhome.io/turkeydrop2025";
const pageTitle = "Turkey Drop 2025 — Road Home Program at Rush";
const description =
  "Join us in Effingham, Illinois on November 15th for the Road Home Program’s annual Turkey Drop — a free turkey and sides for veterans, service members, and their families. RSVP required.";
const image = "https://www.roadhome.io/og/turkeydrop2025-banner.png"; // update when ready

// Flip this to true when you are ready to close online registrations
const REGISTRATION_CLOSED = false;

export default function TurkeyDrop2025() {
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
            className="tdp-banner"
            src={TDBanner}
            alt="Turkey Drop 2025 — Road Home Program"
          />

          <div className="tdp-info">
            FYI: this event is ~200 miles from Chicago.
          </div>

          <p className="tdp-sub">
            Sign up for a <strong>FREE Thanksgiving meal kit</strong> for your
            family — now including an <strong>Aldi gift card</strong> to cover
            the cost of a turkey. Thanksgiving sides (feeds up to 4) will be
            provided at pickup. One meal kit per household.
          </p>

          <div className="tdp-block">
            <h3>Pick-up Location</h3>
            <p>
              Family Care Associates
              <br />
              1106 N Merchant St, Effingham, IL 62401
            </p>
          </div>

          <div className="tdp-block">
            <h3>When</h3>
            <p>
              Saturday, <strong>November 15th</strong>
              <br />
              11:00 am — 2:00 pm (choose a pickup window)
            </p>
          </div>

          <div className="tdp-block">
            <h3>Eligibility</h3>
            <p>
              VALID Mil/Vet ID or DD214 (Veterans, Guard/Reserve, and Active
              Duty)
            </p>
          </div>
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
              <span>Remaining kits: {counts.remaining ?? 0}</span>
            </div>
          </div>
)}
          <Sponsors />
          <MapBlock />
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

/* ---------- Sponsors ---------- */
function Sponsors() {
  return (
    <div className="tdp-sponsors">
      <h3>Event Sponsors</h3>
      <p className="tdp-sponsor-intro">
        The 5th Annual Road Home Program Effingham Turkey Drop 2025 is made
        possible by the generous support of the following sponsor organizations:
      </p>

      <div className="tdp-tier tdp-tier--platinum">
        <h4>PLATINUM LEVEL ($1000 or more)</h4>
        <ul className="tdp-sponsor-list">
          <li>AMEREN ILLINOIS ENERGY EFFICIENCY PROGRAM</li>
          <li>ILLINOIS JOINING FORCES</li>
          <li>J X GIVES BACK FAMILY FOUNDATION</li>
          <li>PROBST REFRIGERATION &amp; HEATING, INC.</li>
          <li>VISITING ANGELS HOMECARE AGENCY</li>
        </ul>
        <br />
      </div>

      <div className="tdp-tier tdp-tier--gold">
        <h4>GOLD LEVEL ($500 - $999)</h4>
        <ul className="tdp-sponsor-list">
          <li>BROOKSTONE ESTATES</li>
          <li>CROSSFIT EFFINGHAM</li>
          <li>EFFINGHAM ELKS LODGE #1016</li>
          <li>FULL CIRCLE REALTY</li>
          <li>FOX HOLLER COFFEE</li>
          <li>GOSPEL ASSEMBLY CHURCH</li>
          <li>AFSCME LOCAL 3494 - HEARTLAND HUMAN SERVICES</li>
          <li>KNIGHTS OF COLUMBUS FOURTH DEGREE, EFFINGHAM ASSEMBLY 214</li>
          <li>LAND OF LINCOLN CREDIT UNION (Effingham South Branch)</li>
          <li>SHERWIN-WILLIAMS</li>
          <li>SS CHAD EXPRESS</li>
          <li>T-MOBILE</li>
          <li>THE KRUSTEAZ COMPANY</li>
          <li>WHITNEY ROOFING, INC</li>
        </ul>
        <br />
      </div>

      <div className="tdp-tier tdp-tier--silver">
        <h4>SILVER LEVEL ($499 or less)</h4>
        <ul className="tdp-sponsor-list">
          <li>ACCURACY FIREARMS</li>
          <li>AGRACEL, INC</li>
          <li>AMERICAN LEGION POST 120 (EFFINGHAM)</li>
          <li>BALDA DENTAL</li>
          <li>DANNY’S BAR &amp; GRILL</li>
          <li>DENT COULSON ELDER LAW</li>
          <li>DUST &amp; SON AUTO SUPPLY</li>
          <li>EFFINGHAM PELVIC HEALTH</li>
          <li>EFFINGHAM DENTAL GROUP</li>
          <li>FARLEY INSURANCE AGENCY</li>
          <li>FIELDCREST HOMES</li>
          <li>HANGAR 18</li>
          <li>INTEGRITY ELECTRIC &amp; PLUMBING</li>
          <li>JB ESKER &amp; SONS</li>
          <li>JEFF SPEER AND ALEXIS SPEER, RE/MAX KEY ADVANTAGE</li>
          <li>MCMAHON MEATS</li>
          <li>STATE FARM, TOM HENDERSON, AGENT</li>
          <li>VFW POST 1769 (EFFINGHAM)</li>
          <li>WALMART DC 6059</li>
          <li>WRIGHT CHOICE COUNSELING</li>
        </ul>
        <br />
        <br />
      </div>
    </div>
  );
}

/* ---------- Map ---------- */
function MapBlock() {
  const addr = "Family Care Associates, 1106 N Merchant St, Effingham, IL 62401";
  const q = encodeURIComponent(addr);
  return (
    <div className="tdp-map">
      <h3>Map & Directions</h3>
      <p className="tdp-map-addr">{addr}</p>

      <div className="tdp-map-wrap">
        <iframe
          title="Map - Family Care Associates"
          className="tdp-map-frame"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps?q=${q}&output=embed`}
        />
      </div>

      <p className="tdp-map-actions">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${q}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Google Maps
        </a>
      </p>
    </div>
  );
}

/* ---------- Reservation (open state) ---------- */
function ReservationCard() {
  return (
    <article className="tdp-card">
      <h2 className="tdp-card-title">Reserve Your Meal Kit</h2>
      <p className="tdp-card-sub">
        No login required. Your information is used only for pickup coordination
        and reporting.
      </p>
      <SlotPicker eventId={EVENT_ID} />
      <p className="tdp-help">
        Having trouble? Call{" "}
        <a href="tel:217-347-2597">217-347-2597</a> and our team will register
        you by phone.
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
        Online reservations for the 2025 Effingham Turkey Drop are now closed
        so our team can finalize packing and logistics.
      </p>

      <div className="tdp-block">
        <h3>Event details</h3>
        <p>
          Saturday, <strong>November 15th</strong>
          <br />
          11:00 am — 2:00 pm
          <br />
          Family Care Associates
          <br />
          1106 N Merchant St, Effingham, IL 62401
        </p>
      </div>

      <div className="tdp-block">
        <h3>Already registered?</h3>
        <p>
          Please bring your confirmation email and a valid Military/Veteran ID
          or DD214 to check in during your selected pickup window.
        </p>
      </div>

      <p className="tdp-help">
        Questions about your reservation? Call{" "}
        <a href="tel:217-347-2597">217-347-2597</a>.
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
