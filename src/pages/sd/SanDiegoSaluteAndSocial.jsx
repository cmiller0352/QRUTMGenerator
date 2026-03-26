import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "../turkeydrop/turkeydrop2025/turkeydrop2025.css";
import "./san-diego-salute-and-social.css";
import ShieldIMG from "../../assets/rhp-shield.png";
import ShieldFooterIMG from "../../assets/shield.png";
import SdBanner from "../../assets/sd banner image.png";
import CalendarIcon from "../../assets/calendar-plus-alt-svgrepo-com.svg";
import TimeIcon from "../../assets/time-svgrepo-com.svg";
import LocationIcon from "../../assets/location-plus-svgrepo-com.svg";
import JimmysFlyer from "../../assets/Jimmys Flyer.png";
import McpsFlyer from "../../assets/McP's Flyer.png";
import CaliforniaWildAlesFlyer from "../../assets/Cali Wild Ales Flyer.png";
import { SD_EVENTS } from "./sdEvents";
import SdTeamSection from "./components/SdTeamSection";

const eventEntries = [
  {
    event: SD_EVENTS.saluteSocialJimmys,
    flyer: JimmysFlyer,
    eyebrow: "Night One",
    summary:
      "Kick off the week on the waterfront with an evening built for connection, conversation, and community.",
  },
  {
    event: SD_EVENTS.saluteSocialMcps,
    flyer: McpsFlyer,
    eyebrow: "Night Two",
    summary:
      "Join us in Coronado for a relaxed gathering where veterans, service members, and families can meet the Road Home Program team.",
  },
  {
    event: SD_EVENTS.saluteSocialCaliforniaWildAles,
    flyer: CaliforniaWildAlesFlyer,
    eyebrow: "Night Three",
    summary:
      "Close out the series in Ocean Beach with a casual Friday event designed to bring people together before the weekend.",
  },
];

function FlyerLightbox({ item, onClose }) {
  useEffect(() => {
    if (!item) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      className="sdss-lightbox"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sdss-lightbox-title"
      onClick={onClose}
    >
      <div className="sdss-lightbox__dialog" onClick={(event) => event.stopPropagation()}>
        <div className="sdss-lightbox__head">
          <div>
            <p className="sdss-lightbox__eyebrow">Event Flyer</p>
            <h2 id="sdss-lightbox-title">{item.event.venueName}</h2>
          </div>
          <button
            type="button"
            className="sdss-lightbox__close"
            onClick={onClose}
            aria-label="Close flyer"
          >
            Close
          </button>
        </div>
        <img
          src={item.flyer}
          alt={`${item.event.venueName} flyer`}
          className="sdss-lightbox__image"
        />
      </div>
    </div>
  );
}

export default function SanDiegoSaluteAndSocial() {
  const location = useLocation();
  const [activeFlyer, setActiveFlyer] = useState(null);
  const seriesTimeLabel = "Wed-Thu 6-8 PM PT, Fri 5-7 PM PT";

  useEffect(() => {
    document.title = "San Diego Salute & Social";
  }, []);

  useEffect(() => {
    if (!location.search) return undefined;
    if (location.hash && location.hash !== "#sdss-events") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const params = new URLSearchParams(location.search);
    const trackedKeys = ["utm_source", "utm_medium", "utm_campaign", "qr", "source"];
    const hasTrackedParam = trackedKeys.some((key) => {
      const value = params.get(key);
      return typeof value === "string" && value.trim().length > 0;
    });

    if (!hasTrackedParam) return undefined;

    let cancelled = false;
    let userInteracted = false;

    const markUserInteracted = () => {
      userInteracted = true;
    };

    window.addEventListener("wheel", markUserInteracted, { passive: true });
    window.addEventListener("touchstart", markUserInteracted, { passive: true });
    window.addEventListener("keydown", markUserInteracted);

    const timeoutId = window.setTimeout(() => {
      if (cancelled || userInteracted || window.scrollY > 24) return;

      const target = document.getElementById("sdss-events");
      if (!target) return;

      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      window.removeEventListener("wheel", markUserInteracted);
      window.removeEventListener("touchstart", markUserInteracted);
      window.removeEventListener("keydown", markUserInteracted);
    };
  }, [location.search, location.hash]);

  const dateRange = useMemo(() => {
    const first = eventEntries[0]?.event?.dateLabel;
    const last = eventEntries[eventEntries.length - 1]?.event?.dateLabel;
    if (!first || !last) return "";
    return `${first} to ${last}`;
  }, []);

  const preservedSearch = location.search || "";

  return (
    <>
      <main className="sdss-page">
        <div
          className="tdp-bg"
          style={{ "--bg-url": `url(${ShieldIMG})` }}
          aria-hidden="true"
        />

        <div className="sdss-shell">
          <section className="sdss-hero" aria-label="San Diego Salute and Social series">
            <div className="sdss-hero__top">
              <div className="sdss-hero__content">
                <p className="sdss-hero__eyebrow">Road Home Program • San Diego</p>
                <h1 className="tdp-title sdss-title">San Diego Salute &amp; Social</h1>
                <p className="tdp-sub sdss-intro">
                  Three evenings across San Diego County for veterans, service members, and military
                  families to gather, connect, and meet the Road Home Program team.
                </p>
                <div className="sdss-hero__actions">
                  <a className="tdp-submit sdss-hero__cta" href="#sdss-events">
                    View Event Lineup
                  </a>
                </div>
              </div>

              <div className="sdss-hero__media">
                <img
                  src={SdBanner}
                  alt="San Diego Salute and Social event series"
                  className="sdss-hero__image"
                />
              </div>
            </div>

            <div className="sdss-hero__meta">
              <div className="sdss-stat">
                <img src={CalendarIcon} alt="" aria-hidden="true" className="sdss-stat__icon" />
                <div className="sdss-stat__copy">
                  <span className="sdss-stat__label">Series Dates</span>
                  <strong>{dateRange}</strong>
                </div>
              </div>
              <div className="sdss-stat">
                <img src={TimeIcon} alt="" aria-hidden="true" className="sdss-stat__icon" />
                <div className="sdss-stat__copy">
                  <span className="sdss-stat__label">Time</span>
                  <strong>{seriesTimeLabel}</strong>
                </div>
              </div>
              <div className="sdss-stat">
                <img src={LocationIcon} alt="" aria-hidden="true" className="sdss-stat__icon" />
                <div className="sdss-stat__copy">
                  <span className="sdss-stat__label">Locations</span>
                  <strong>San Diego, Coronado, and Ocean Beach</strong>
                </div>
              </div>
            </div>

            <div className="sdss-hero__noteRow">
              <div className="sdss-note sdss-note--hero">
                <h3>About the Series</h3>
                <p>
                  These gatherings are an opportunity to meet the Road Home Program team,
                  connect with fellow veterans, and learn more about the services we provide.
                </p>
              </div>

              <div className="sdss-note sdss-note--muted">
                <h3>What to Expect</h3>
                <p>
                  Choose the venue that works best for you and complete your RSVP on that event&apos;s
                  page.
                </p>
              </div>
            </div>
          </section>

          <section className="sdss-events" id="sdss-events" aria-label="San Diego event lineup">
            <div className="sdss-events__header">
              <p className="sdss-events__eyebrow">Event Lineup</p>
              <h2 className="sdss-events__title">Pick the night that works for you</h2>
              <p className="sdss-events__intro">
                Explore the lineup, preview each flyer, and RSVP for the location that fits your
                schedule best.
              </p>
            </div>

            <div className="sdss-list">
              {eventEntries.map((item) => (
                <article key={item.event.key} className="tdp-card sdss-card">
                  <div className="sdss-card__media">
                    <button
                      type="button"
                      className="sdss-flyer"
                      onClick={() => setActiveFlyer(item)}
                      aria-label={`Open flyer for ${item.event.venueName}`}
                    >
                      <img src={item.flyer} alt={`${item.event.venueName} flyer preview`} />
                      <span className="sdss-flyer__hint">Preview Flyer</span>
                    </button>
                  </div>

                  <div className="sdss-card__body">
                    <p className="sdss-card__eyebrow">{item.eyebrow}</p>
                    <h2 className="tdp-card-title sdss-card__title">{item.event.venueName}</h2>
                    <p className="tdp-card-sub sdss-card__summary">{item.summary}</p>

                    <div className="sdss-detailChips" aria-label={`${item.event.venueName} details`}>
                      <span className="sdss-detailChip">{item.event.dateLabel}</span>
                      <span className="sdss-detailChip">{item.event.timeLabel}</span>
                      <span className="sdss-detailChip">
                        {item.event.addressLines?.[1] || item.event.venueName}
                      </span>
                    </div>

                    <p className="sdss-location">
                      {item.event.addressLines?.join(", ")}
                    </p>

                    <div className="sdss-actions">
                      <Link
                        className="tdp-submit sdss-cta"
                        to={`${item.event.path}${preservedSearch}`}
                      >
                        RSVP for This Event
                      </Link>
                    </div>
                  </div>
                </article>
              ))}

              {/* TODO: Add live availability/progress here if reliable clean capacity data is added for these three events. */}
            </div>
          </section>

          <section className="sdss-teamWrap">
            <SdTeamSection
              compact
              previewChars={180}
              singleExpand
              title="Meet the Team You’ll See at This Event"
              intro="Our Veteran and Family Outreach Team will be on site to help with questions, welcome guests, and connect attendees to Road Home Program resources."
            />
          </section>
        </div>
      </main>

      <footer className="tdp-footer" role="contentinfo">
        <div className="tdp-footer__inner">
          <div className="tdp-footer__brand">
            <img
              src={ShieldFooterIMG}
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

          <nav className="tdp-footer__nav" aria-label="Footer">
            <a href="https://roadhomeprogram.org/family-center/">Help for Families</a>
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
            <a href="https://roadhomeprogram.org/contact-us/">General Information</a>
            <a
              href="https://www.rush.edu/website-privacy-statement"
              target="_blank"
              rel="noreferrer"
            >
              Privacy Statement
            </a>
            <a href="https://www.rush.edu/disclaimer" target="_blank" rel="noreferrer">
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

      <FlyerLightbox item={activeFlyer} onClose={() => setActiveFlyer(null)} />
    </>
  );
}
