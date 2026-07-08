/**
 * Home page (/) -- the entire app lives here as one client component.
 *
 * Next.js App Router: this file is a Server Component that renders FeedApp.
 * FeedApp is "use client" because it uses useState, fetch, and browser storage.
 */
import { FeedApp } from "@/components/FeedApp";

export default function HomePage() {
  return <FeedApp />;
}
