/**
 * Outbound link to the original event page.
 * Hidden when the stored URL is missing or invalid.
 */
"use client";

import { isLumaUrl, resolveEventHref } from "@/lib/luma";

export function LumaEventLink({
  lumaUrl,
  className = "",
  fullWidth = false,
}: {
  lumaUrl: string | null | undefined;
  className?: string;
  fullWidth?: boolean;
}) {
  const href = resolveEventHref(lumaUrl);
  if (!href) return null;

  const label = isLumaUrl(href) ? "View on Luma" : "Open event page";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`btn-secondary inline-flex items-center justify-center gap-1 py-3 ${
        fullWidth ? "w-full" : ""
      } ${className}`.trim()}
      data-testid="luma-event-link"
    >
      {label}
      <span aria-hidden="true">↗</span>
    </a>
  );
}
