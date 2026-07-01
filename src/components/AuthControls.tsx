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
