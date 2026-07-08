import { resolveEventHref } from "@/lib/luma";

/** Placement options for the Remove interest control on accepted event cards. */
export type RemoveInterestLayout = "stacked" | "inline-badge" | "text-link";

export const REMOVE_INTEREST_LAYOUTS: RemoveInterestLayout[] = [
  "stacked",
  "inline-badge",
  "text-link",
];

export const REMOVE_INTEREST_LAYOUT_LABELS: Record<RemoveInterestLayout, string> =
  {
    stacked: "A — Full button below badge",
    "inline-badge": "B — Inline action in badge",
    "text-link": "C — Subtle text link",
  };

export function getEventTitleHref(
  lumaUrl: string | null | undefined,
): string | null {
  return resolveEventHref(lumaUrl);
}
