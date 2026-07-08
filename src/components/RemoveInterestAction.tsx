/**
 * Remove-interest control with three layout variants for comparison.
 */
"use client";

import { EventResponseStatus } from "@/components/EventResponseStatus";
import type { RemoveInterestLayout } from "@/lib/event-card-ui";

export function RemoveInterestAction({
  layout,
  onUnaccept,
}: {
  layout: RemoveInterestLayout;
  onUnaccept?: () => void;
}) {
  switch (layout) {
    case "stacked":
      return (
        <div className="space-y-2">
          <EventResponseStatus variant="accepted" />
          <button
            type="button"
            onClick={onUnaccept}
            className="btn-pass w-full py-3"
            data-testid="unaccept-button"
          >
            Remove interest
          </button>
        </div>
      );

    case "inline-badge":
      return (
        <div
          className="status-badge status-badge-accept items-center justify-between gap-2"
          data-testid="accepted-state"
          role="status"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="status-badge-icon" aria-hidden="true">
              ✓
            </span>
            <div className="min-w-0">
              <p className="status-badge-title">You&apos;re interested</p>
              <p className="status-badge-subtitle">
                Friends can see you&apos;re interested
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onUnaccept}
            className="remove-interest-inline shrink-0"
            data-testid="unaccept-button"
          >
            Remove
          </button>
        </div>
      );

    case "text-link":
      return (
        <div className="space-y-1.5">
          <EventResponseStatus variant="accepted" />
          <button
            type="button"
            onClick={onUnaccept}
            className="remove-interest-text-link"
            data-testid="unaccept-button"
          >
            Remove interest
          </button>
        </div>
      );

    default: {
      const _exhaustive: never = layout;
      return _exhaustive;
    }
  }
}
