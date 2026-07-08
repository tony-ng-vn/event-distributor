/**
 * Event title — links to the original Luma/event page when a safe URL exists.
 */
"use client";

import { getEventTitleHref } from "@/lib/event-card-ui";

export function EventTitleLink({
  title,
  lumaUrl,
  className = "",
  size = "card",
}: {
  title: string;
  lumaUrl: string | null | undefined;
  className?: string;
  size?: "card" | "detail";
}) {
  const href = getEventTitleHref(lumaUrl);
  const titleClass =
    size === "detail"
      ? "text-2xl font-semibold leading-snug tracking-tight text-foreground"
      : "text-base font-semibold leading-snug tracking-tight text-foreground";
  const wrapperClass =
    size === "detail" ? "mt-0" : "mt-0.5 min-h-[2.75rem]";

  if (!href) {
    return (
      <h3
        className={`${wrapperClass} line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground ${size === "detail" ? "text-2xl" : ""} ${className}`.trim()}
      >
        {title}
      </h3>
    );
  }

  return (
    <h3 className={`${wrapperClass} ${className}`.trim()}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`event-title-link group inline line-clamp-2 ${titleClass}`}
        data-testid="event-title-link"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="event-title-link-text">{title}</span>
        <span className="event-title-link-icon" aria-hidden="true">
          ↗
        </span>
      </a>
    </h3>
  );
}
