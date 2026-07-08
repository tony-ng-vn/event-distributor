/**
 * /settings — account and notification settings.
 *
 * Minimal surface for Phase 1: a Notifications section to toggle new-event
 * emails. Server component shell; the interactive section is a client component.
 */
import Link from "next/link";
import { NotificationSettings } from "@/components/NotificationSettings";

export const metadata = {
  title: "Settings — Event Radar",
};

export default function SettingsPage() {
  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <header className="glass-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Settings
            </h1>
            <p className="text-sm text-muted">Manage how Event Radar reaches you</p>
          </div>
          <Link href="/" className="btn-secondary whitespace-nowrap">
            Back to events
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <NotificationSettings />
      </main>
    </div>
  );
}
