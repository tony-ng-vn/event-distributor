/**
 * Post-action status badge for Accept / Pass on event cards and detail sheet.
 */
"use client";

type EventResponseStatusVariant = "accepted" | "passed";

const COPY: Record<
  EventResponseStatusVariant,
  { title: string; subtitle: string; testId: string; icon: string }
> = {
  accepted: {
    title: "You're interested",
    subtitle: "Friends can see you're interested",
    testId: "accepted-state",
    icon: "✓",
  },
  passed: {
    title: "You passed",
    subtitle: "Not in your upcoming feed",
    testId: "passed-state",
    icon: "×",
  },
};

export function EventResponseStatus({
  variant,
}: {
  variant: EventResponseStatusVariant;
}) {
  const { title, subtitle, testId, icon } = COPY[variant];
  const badgeClass =
    variant === "accepted" ? "status-badge-accept" : "status-badge-pass";

  return (
    <div
      className={`status-badge ${badgeClass}`}
      data-testid={testId}
      role="status"
    >
      <span className="status-badge-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="status-badge-title">{title}</p>
        <p className="status-badge-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}
