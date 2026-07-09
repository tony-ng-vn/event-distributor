/**
 * Admin roster: everyone in the program, with status badges, an approve action
 * for pending sign-ups, and an admin promote/demote toggle. The same approve
 * endpoint also backs the standalone /admin/waitlist page.
 */
"use client";

import { getAttendeeInitials } from "@/lib/attendees";

export type ProgramUserView = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
  approved: boolean;
  createdAt: string;
  eventsCreatedCount: number;
  rsvpCount: number;
};

function formatJoinedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProgramUsersAdmin({
  users,
  loading,
  viewerUserId,
  pendingToggleId,
  pendingApproveId,
  onToggleAdmin,
  onApprove,
}: {
  users: ProgramUserView[] | null;
  loading: boolean;
  viewerUserId: string | null;
  pendingToggleId: string | null;
  pendingApproveId: string | null;
  onToggleAdmin: (user: ProgramUserView) => void;
  onApprove: (user: ProgramUserView) => void;
}) {
  if (loading) {
    return <p className="text-sm text-muted">Loading users...</p>;
  }

  if (!users || users.length === 0) {
    return (
      <div className="glass-card rounded-2xl border border-dashed border-border p-10 text-center">
        <p className="font-medium text-foreground">No users yet</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {users.map((user) => {
        const label = user.name?.trim() || user.email;
        const isSelf = user.id === viewerUserId;
        return (
          <li
            key={user.id}
            className="glass-card flex items-center justify-between gap-4 rounded-2xl p-4"
            data-testid={`program-user-row-${user.id}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-surface bg-neutral-200 text-[11px] font-semibold text-neutral-700">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={label}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  getAttendeeInitials(user.name)
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {label}
                  {user.isAdmin && (
                    <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-semibold text-neutral-700">
                      Admin
                    </span>
                  )}
                  {!user.approved && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      Pending
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-muted">
                  {user.email} -- Joined {formatJoinedDate(user.createdAt)}
                </p>
                <p className="truncate text-sm text-muted">
                  {user.eventsCreatedCount} event
                  {user.eventsCreatedCount === 1 ? "" : "s"}, {user.rsvpCount} RSVP
                  {user.rsvpCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!user.approved && (
                <button
                  type="button"
                  onClick={() => onApprove(user)}
                  className="btn-primary whitespace-nowrap disabled:opacity-60"
                  disabled={pendingApproveId === user.id}
                  data-testid={`approve-user-${user.id}`}
                >
                  {pendingApproveId === user.id ? "Approving..." : "Approve"}
                </button>
              )}
              <button
                type="button"
                onClick={() => onToggleAdmin(user)}
                className="btn-secondary whitespace-nowrap disabled:opacity-60"
                title={isSelf ? "You can't change your own admin status" : undefined}
                disabled={isSelf || pendingToggleId === user.id}
                data-testid={`toggle-admin-${user.id}`}
              >
                {pendingToggleId === user.id
                  ? "Saving..."
                  : user.isAdmin
                    ? "Remove admin"
                    : "Make admin"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
