/**
 * Outbound link to the original Luma event page.
 * Hidden when the stored URL is missing or invalid.
 */
"use client";

import { resolveLumaEventHref } from "@/lib/luma";

export function LumaEventLink({
  lumaUrl,
  className = "",
  fullWidth = false,
}: {
  lumaUrl: string | null | undefined;
  className?: string;
  fullWidth?: boolean;
}) {
  const href = resolveLumaEventHref(lumaUrl);
  if (!href) return null;

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
      View on Luma
      <span aria-hidden="true">↗</span>
    </a>
  );
}
