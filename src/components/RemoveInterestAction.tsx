/**
 * Accepted-state badge with the Remove interest control below it.
 */
"use client";

import { EventResponseStatus } from "@/components/EventResponseStatus";

export function RemoveInterestAction({
  onUnaccept,
}: {
  onUnaccept?: () => void;
}) {
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
}
