import React, { useEffect, useState } from "react";
import { supabase } from "../../../utils/supabaseClient";
import SlotPicker from "./slot-picker";
import "./turkeydrop2025.css";
import TDBanner from "../../../assets/TD Banner.png";


const EVENT_ID = "effingham-2025";

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
    <main className="tdp-shell">
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
      </section>

      <section className="tdp-right">
        <ReservationCard />
      </section>
    </main>
  );
}

function Sponsors() {
  const logos = [
    // top sponsors as images:
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
