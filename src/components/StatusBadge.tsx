"use client";

import type { EventStatus } from "@/types/event";
import { statusDotColor, statusLabel, statusStyles } from "@/lib/event-styles";

interface StatusBadgeProps {
  status: EventStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles(status)}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor(status)}`} />
      {statusLabel(status)}
    </span>
  );
}
