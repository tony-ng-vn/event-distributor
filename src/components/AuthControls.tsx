/**
 * Clerk auth UI — header sign-in/out and modal when Accept needs login.
 *
 * SignInPromptModal: shown when user clicks Accept while logged out (401).
 * AuthButton: top-right Sign in / UserButton + Sign out.
 */
"use client";

import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

/** Full-page card shown when the feed is for signed-in friends only. */
export function SignInGate() {
  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <header className="glass-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Events
            </h1>
            <p className="text-sm text-muted">Shared plans with your group</p>
          </div>
          <AuthButton />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10">
        <div
          className="glass-card rounded-2xl p-8 text-center"
          data-testid="sign-in-gate"
        >
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Sign in to see your group&apos;s events
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            This feed is private to people in your group. Sign in to browse shared
            Luma links, mark events you&apos;re interested in, and see who else
            is planning to go. RSVP on Luma separately when you&apos;re ready.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <SignInButton mode="modal">
              <button
                type="button"
                className="btn-primary w-full py-3 sm:w-auto sm:px-8"
                data-testid="sign-in-gate-button"
              >
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                type="button"
                className="btn-secondary w-full py-3 sm:w-auto sm:px-8"
                data-testid="sign-up-gate-button"
              >
                Create account
              </button>
            </SignUpButton>
          </div>
        </div>
      </main>
    </div>
  );
}

/** Modal when user tries Accept without being signed in. */
export function SignInPromptModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div
        className="glass-card w-full max-w-md rounded-2xl p-6"
        data-testid="sign-in-modal"
      >
        <h2 className="text-lg font-semibold text-foreground">
          Sign in to show you&apos;re going
        </h2>
        <p className="mt-2 text-sm text-muted">
          Your name and avatar appear on the guest list so friends know who&apos;s
          joining. RSVP on Luma separately when you&apos;re ready.
        </p>
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3">
            Not now
          </button>
          <SignInButton mode="modal">
            <button
              type="button"
              className="btn-primary flex-1 py-3"
              data-testid="sign-in-button"
            >
              Sign in
            </button>
          </SignInButton>
        </div>
      </div>
    </div>
  );
}

/** Header auth control — sign-in/sign-up when logged out, profile when signed in. */
export function AuthButton() {
  return (
    <div className="flex items-center gap-2">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button type="button" className="btn-secondary whitespace-nowrap">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button type="button" className="btn-primary whitespace-nowrap">
            Sign up
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </div>
  );
}

/** @deprecated Use SignInPromptModal */
export const CalendarConnectModal = SignInPromptModal;
