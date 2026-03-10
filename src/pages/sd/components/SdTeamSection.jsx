import React, { useMemo, useState } from "react";
import { sdTeamMembers as defaultMembers } from "../sdTeamData";
import "./sd-team-section.css";

function truncateCopy(copy, maxChars) {
  if (!copy || copy.length <= maxChars) return copy;
  return `${copy.slice(0, maxChars).trimEnd()}...`;
}

function TeamCard({ member, expanded, onToggle, compact = false, previewChars = 280 }) {
  const bioParagraphs = [member.shortBio, member.fullBio].filter(Boolean);
  const fullBioText = bioParagraphs.join(" ");
  const previewBio = truncateCopy(fullBioText, previewChars);
  const hasExpandableCopy = Boolean(
    fullBioText || member.quote || member.subtitle || fullBioText !== previewBio
  );
  const buttonLabel = expanded ? "Show less" : member.readMoreLabel || "Learn more";
  const detailsId = `${member.id}-details`;

  return (
    <article
      className={`sd-team-card ${compact ? "sd-team-card--compact" : ""} ${
        expanded ? "sd-team-card--expanded" : ""
      }`.trim()}
    >
      <img
        src={member.image}
        alt={member.name}
        className="sd-team-card__avatar"
        loading="lazy"
        decoding="async"
      />
      <div className="sd-team-card__body">
        <div className="sd-team-card__head">
          <div className="sd-team-card__identity">
            <h3 className="sd-team-card__name">{member.name}</h3>
            <p className="sd-team-card__role">{member.role}</p>
            {member.subtitle && <p className="sd-team-card__subtitle">{member.subtitle}</p>}
          </div>
          {hasExpandableCopy && (
            <button
              type="button"
              className="sd-team-card__toggle"
              onClick={() => onToggle(member.id)}
              aria-expanded={expanded}
              aria-controls={detailsId}
            >
              {buttonLabel}
            </button>
          )}
        </div>
        {!expanded && previewBio && <p className="sd-team-card__bio">{previewBio}</p>}
        {expanded && hasExpandableCopy && (
          <div id={detailsId} className="sd-team-card__details">
            {bioParagraphs.map((paragraph, index) => (
              <p
                key={`${member.id}-bio-${index}`}
                className={`sd-team-card__bio ${index > 0 ? "sd-team-card__bio--expanded" : ""}`.trim()}
              >
                {paragraph}
              </p>
            ))}
            {member.quote && <blockquote className="sd-team-card__quote">“{member.quote}”</blockquote>}
          </div>
        )}
      </div>
    </article>
  );
}

export default function SdTeamSection({
  title = "Meet the San Diego Team",
  intro = "The Road Home Program outreach team will be on site to welcome attendees, answer questions, and help connect you to support.",
  members = defaultMembers,
  className = "",
  compact = false,
  previewChars = 180,
  singleExpand = true,
}) {
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [members]
  );

  const toggleExpanded = (memberId) => {
    setExpandedIds((prev) => {
      const next = singleExpand ? new Set() : new Set(prev);
      if (prev.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  return (
    <section
      className={`sd-team-section ${compact ? "sd-team-section--compact" : ""} ${className}`.trim()}
      aria-label={title}
    >
      <div className="sd-team-section__header">
        <p className="sd-team-section__eyebrow">Veteran and Family Outreach Team</p>
        <h2 className="sd-team-section__title">{title}</h2>
        {intro && <p className="sd-team-section__intro">{intro}</p>}
      </div>

      <div className="sd-team-grid">
        {sortedMembers.map((member) => (
          <TeamCard
            key={member.id}
            member={member}
            expanded={expandedIds.has(member.id)}
            onToggle={toggleExpanded}
            compact={compact}
            previewChars={previewChars}
          />
        ))}
      </div>
    </section>
  );
}
