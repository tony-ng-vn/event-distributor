/**
 * /admin/waitlist — review pending sign-ups and let people in.
 *
 * Server-component shell; the interactive list is a client component that
 * self-guards against non-admin viewers via the API.
 */
import Link from "next/link";
import { WaitlistAdmin } from "@/components/WaitlistAdmin";

export const metadata = {
  title: "Waitlist — Event Radar",
};

export default function WaitlistPage() {
  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <header className="glass-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Waitlist
            </h1>
            <p className="text-sm text-muted">Approve who gets into the group</p>
          </div>
          <Link href="/" className="btn-secondary whitespace-nowrap">
            Back to events
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <WaitlistAdmin />
      </main>
    </div>
  );
}
