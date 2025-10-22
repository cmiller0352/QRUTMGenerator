// src/pages/turkeydrop/turkeydrop2025/index.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../../utils/supabaseClient";
import SlotPicker from "./slot-picker";
import "./turkeydrop2025.css";
import TDBanner from "../../../assets/TD Banner.png";
import ShieldIMG from "../../../assets/rhp-shield.png";

const EVENT_ID = "effingham-2025";
const pageUrl = "https://www.roadhome.io/turkeydrop2025";
const pageTitle = "Turkey Drop 2025 — Road Home Program at Rush";
const description =
  "Join us in Effingham, Illinois on November 15th for the Road Home Program’s annual Turkey Drop — a free turkey and sides for veterans, service members, and their families. RSVP required.";
const image = "https://www.roadhome.io/og/turkeydrop2025-banner.png"; // update when ready


export default function TurkeyDrop2025() {
  const [counts, setCounts] = useState({ reserved: 0, remaining: 0, total_capacity: 0 });

  useEffect(() => {
    document.title = "Turkey Drop 2025 — Road Home Program";
  }, []);

  useEffect(() => {
    const loadCounts = async () => {
      const { data, error } = await supabase
        .from("event_counts")
        .select("reserved, remaining, total_capacity")
        .eq("event_id", EVENT_ID)
        .maybeSingle();
      if (!error && data) setCounts(data);
    };
    loadCounts();
  }, []);

  const filled = counts.reserved || 0;
  const total = counts.total_capacity || 0;
  const pct = total ? Math.min(100, Math.round((filled / total) * 100)) : 0;

  return (
    <>
      {/* --- Head metadata (React 19 hoists automatically) --- */}
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

      {/* --- Page content --- */}
      <main className="tdp-shell">
         <div
        className="tdp-bg"
        /* pass the url via a CSS custom property (works in all bundlers) */
        style={{ '--bg-url': `url(${ShieldIMG})` }}
        aria-hidden="true"
      />
        <section className="tdp-left">
          {/* Banner image */}
          <img
            className="tdp-banner"
            src={TDBanner}
            alt="Turkey Drop 2025 — Road Home Program"
          />

          {/* FYI bubble */}
          <div className="tdp-info">FYI: this event is ~200 miles from Chicago.</div>

          <p className="tdp-sub">
            Sign up for a <strong>FREE frozen turkey with a bag of sides</strong> for your family (feeds up to 4).
            One meal kit per household.
          </p>

          <div className="tdp-block">
            <h3>Pick-up Location</h3>
            <p>Family Care Associates<br/>1106 N Merchant St, Effingham, IL 62401</p>
          </div>

          <div className="tdp-block">
            <h3>When</h3>
            <p>Saturday, <strong>November 15th</strong><br/>11:00 am — 2:00 pm (choose a pickup window)</p>
          </div>

          <div className="tdp-block">
            <h3>Eligibility</h3>
            <p>VALID Mil/Vet ID or DD214 (Veterans, Guard/Reserve, and Active Duty)</p>
          </div>

          <div className="tdp-block">
            <h3>Reservations</h3>
            <div className="tdp-progress">
              <div className="tdp-progress-bar" style={{ width: `${pct}%` }} />
            </div>
            <div className="tdp-progress-meta">
              <span>{filled} / {total} filled</span>
              <span>Remaining kits: {counts.remaining ?? 0}</span>
            </div>
          </div>

          <Sponsors />
          <MapBlock />
        </section>

        <section className="tdp-right">
          <ReservationCard />
        </section>
      </main>
    </>
  );
}

function Sponsors() {
  const logos = [
    // top sponsors as images (replace srcs with real files when ready)
    { alt: "Sponsor One", src: "/img/sponsors/s1.png" },
    { alt: "Sponsor Two", src: "/img/sponsors/s2.png" },
    { alt: "Sponsor Three", src: "/img/sponsors/s3.png" },
    { alt: "Sponsor Four", src: "/img/sponsors/s4.png" },
    { alt: "Sponsor Five", src: "/img/sponsors/s5.png" },
    { alt: "Sponsor Six", src: "/img/sponsors/s6.png" },
    { alt: "Sponsor Seven", src: "/img/sponsors/s7.png" },
    { alt: "Sponsor Eight", src: "/img/sponsors/s8.png" },
  ];
  const gold = ["Gold Sponsor Name A", "Gold Sponsor Name B"];
  const silver = ["Silver Sponsor Name A", "Silver Sponsor Name B", "Silver Sponsor Name C"];

  return (
    <div className="tdp-sponsors">
      <h3>Co-sponsored by</h3>
      <div className="tdp-sponsor-grid">
        {logos.map((l, i) => (
          <div key={i} className="tdp-sponsor-card">
            <img src={l.src} alt={l.alt} loading="lazy" />
          </div>
        ))}
      </div>

      {/* Text tiers under logos */}
      <div className="tdp-tier">
        <h4>Gold</h4>
        <ul>{gold.map((n,i)=><li key={i}>{n}</li>)}</ul>
      </div>
      <div className="tdp-tier tdp-tier--silver">
        <h4>Silver</h4>
        <ul>{silver.map((n,i)=><li key={i}>{n}</li>)}</ul>
      </div>
    </div>
  );
}

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

function ReservationCard() {
  return (
    <article className="tdp-card">
      <h2 className="tdp-card-title">Reserve Your Meal Kit</h2>
      <p className="tdp-card-sub">No login required. Your information is used only for pickup coordination and reporting.</p>
      <SlotPicker eventId={EVENT_ID} />
      <p className="tdp-help">
        Having trouble? Call <a href="tel:217-347-2597">217-347-2597</a> and our team will register you by phone.
      </p>
    </article>
  );
}
