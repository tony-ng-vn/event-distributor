/**
 * Thin wrapper — FeedApp is the real app; this exists for page.tsx import style.
 */
"use client";

import { FeedApp } from "@/components/FeedApp";

export function Providers({ children }: { children: React.ReactNode }) {
  return children;
}

export { FeedApp };
