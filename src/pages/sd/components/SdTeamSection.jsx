import React, { useMemo, useState } from "react";
import { sdTeamMembers as defaultMembers } from "../sdTeamData";
import "./sd-team-section.css";

function truncateCopy(copy, maxChars) {
  if (!copy || copy.length <= maxChars) return copy;
  return `${copy.slice(0, maxChars).trimEnd()}...`;
}

function TeamCard({ member, expanded, onToggle, compact = false, previewChars = 280 }) {
  const previewBioBase = member.shortBio || member.fullBio || "";
  const previewBio = compact ? truncateCopy(previewBioBase, previewChars) : previewBioBase;
  const hasExpandableCopy = Boolean(member.fullBio && member.fullBio !== previewBio);
  const buttonLabel = expanded ? "Show less" : member.readMoreLabel || "Read more";

  return (
    <article className={`sd-team-card ${compact ? "sd-team-card--compact" : ""}`.trim()}>
      <img
        src={member.image}
        alt={member.name}
        className="sd-team-card__avatar"
        loading="lazy"
        decoding="async"
      />
      <div className="sd-team-card__body">
        <h3 className="sd-team-card__name">{member.name}</h3>
        <p className="sd-team-card__role">{member.role}</p>
        {member.subtitle && <p className="sd-team-card__subtitle">{member.subtitle}</p>}
        {!compact && member.quote && <blockquote className="sd-team-card__quote">“{member.quote}”</blockquote>}
        {previewBio && <p className="sd-team-card__bio">{previewBio}</p>}
        {expanded && hasExpandableCopy && (
          <p className="sd-team-card__bio sd-team-card__bio--expanded">{member.fullBio}</p>
        )}
        {hasExpandableCopy && (
          <button
            type="button"
            className="sd-team-card__toggle"
            onClick={() => onToggle(member.id)}
            aria-expanded={expanded}
          >
            {buttonLabel}
          </button>
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
  previewChars = 280,
  singleExpand = false,
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
        <p className="sd-team-section__eyebrow">San Diego Outreach Team</p>
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
