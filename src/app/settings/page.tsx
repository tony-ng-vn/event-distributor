/**
 * /settings — account, notification, and appearance settings.
 *
 * Server component shell; each interactive section is its own client component.
 */
import Link from "next/link";
import { AdminWaitlistLink } from "@/components/AdminWaitlistLink";
import { CalendarSyncSettings } from "@/components/CalendarSyncSettings";
import { NotificationSettings } from "@/components/NotificationSettings";
import { ThemeToggle } from "@/components/ThemeToggle";

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

      <main className="mx-auto w-full max-w-lg flex-1 space-y-6 px-4 py-8">
        <ThemeToggle />
        <NotificationSettings />
        <CalendarSyncSettings />
        <AdminWaitlistLink />
      </main>
    </div>
  );
}
