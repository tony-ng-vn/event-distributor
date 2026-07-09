/**
 * Main app shell — state, data fetching, layout, modals.
 *
 * Data flow:
 *   mount -> fetch /api/events -> setEvents (one list feeds every tab)
 *   Mutations (add/accept/pass/unpass/delete) -> API -> syncEventsFromServer()
 *   Anonymous pass -> sessionStorage only (no backend pass row)
 *
 * Responsive: 2-col feed on desktop, bottom tabs on mobile, calendar sidebar lg+.
 * Your events is a top-level tab on all breakpoints (desktop header + mobile nav).
 */
"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { partitionFeedEvents, type CardStatus } from "@/lib/feed-partition";
import { runInterested } from "@/lib/interested-action";
import { getPassedEventIds, passEvent } from "@/lib/pass-storage";
import {
  AuthButton,
  SignInPromptModal,
  WaitlistGate,
  WaitlistLanding,
} from "@/components/AuthControls";
import { MiniCalendar } from "@/components/MiniCalendar";
import { AdminEventCard } from "@/components/AdminEventCard";
import { ProgramUsersAdmin, type ProgramUserView } from "@/components/ProgramUsersAdmin";
import { EventDetailSheet } from "@/components/EventDetailSheet";
import { EventFeedCard } from "@/components/EventFeedCard";
import { FeedSkeleton } from "@/components/FeedSkeleton";
import { FeedSummary } from "@/components/FeedSummary";
import { IngestModal } from "@/components/IngestModal";
import { FeedbackModal } from "@/components/FeedbackModal";
import type { FeedEvent, FeedFilter, MobileTab } from "@/types/feed";

type CardState = Record<string, CardStatus>;

const MOTION_MS = 220;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function FeedApp() {
  const { isLoaded, isSignedIn } = useAuth();
  // Server data
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waitlisted, setWaitlisted] = useState(false);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [activeTab, setActiveTab] = useState<MobileTab>("feed");
  const [passedIds, setPassedIds] = useState<string[]>([]);
  const [cardState, setCardState] = useState<CardState>({});
  const [ingestOpen, setIngestOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<FeedEvent | null>(null);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);
  const [adminSubTab, setAdminSubTab] = useState<"events" | "users">("events");
  const [programUsers, setProgramUsers] = useState<ProgramUserView[] | null>(null);
  const [programUsersLoading, setProgramUsersLoading] = useState(false);
  const [programUsersError, setProgramUsersError] = useState<string | null>(null);
  const [programUsersViewerId, setProgramUsersViewerId] = useState<string | null>(
    null,
  );
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);
  const [exitingEventIds, setExitingEventIds] = useState<Record<string, true>>({});
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Record<string, true>>({});

  /** Load shared feed from API; merge server viewerAccepted into cardState. */
  const loadFeed = useCallback(async (options?: { silent?: boolean }): Promise<
    FeedEvent[] | null
  > => {
    if (!options?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const response = await fetch("/api/events", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 403 && data.code === "WAITLIST_PENDING") {
        setWaitlisted(true);
        return null;
      }
      if (!response.ok) throw new Error(data.error ?? "Failed to load feed");
      setWaitlisted(false);
      setEvents(data.events);
      setViewerIsAdmin(data.viewerIsAdmin === true);
      setCardState((prev) => {
        const next = { ...prev };
        for (const event of data.events as FeedEvent[]) {
          if (event.viewerAccepted) next[event.id] = "accepted";
          else if (event.viewerPassed) next[event.id] = "passed";
          else if (!next[event.id]) next[event.id] = "pending";
        }
        return next;
      });
      return data.events as FeedEvent[];
    } catch (err) {
      if (!options?.silent) {
        setError(err instanceof Error ? err.message : "Failed to load feed");
      }
      return null;
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, []);

  /** Load the full user roster for the Admin tab's Users view (lazy, on first open). */
  const loadProgramUsers = useCallback(async () => {
    setProgramUsersLoading(true);
    setProgramUsersError(null);
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Failed to load users");
      setProgramUsers(data.users as ProgramUserView[]);
      setProgramUsersViewerId(data.viewerUserId as string);
      setProgramUsersError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load users";
      setProgramUsersError(message);
      setToast(message);
    } finally {
      setProgramUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (
      activeTab === "admin" &&
      adminSubTab === "users" &&
      programUsers === null &&
      !programUsersLoading &&
      !programUsersError
    ) {
      void loadProgramUsers();
    }
  }, [
    activeTab,
    adminSubTab,
    programUsers,
    programUsersLoading,
    programUsersError,
    loadProgramUsers,
  ]);

  useEffect(() => {
    if (activeTab === "admin" && !viewerIsAdmin) {
      setActiveTab("feed");
    }
  }, [activeTab, viewerIsAdmin]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      setEvents([]);
      setError(null);
      return;
    }
    loadFeed();
    setPassedIds(getPassedEventIds());
  }, [loadFeed, isLoaded, isSignedIn]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  /** Drop one event from all client state after backend confirms removal. */
  function removeEventFromState(eventId: string) {
    setEvents((prev) => prev.filter((event) => event.id !== eventId));
    setCardState((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
    setPassedIds((prev) => prev.filter((id) => id !== eventId));
    if (detailEvent?.id === eventId) setDetailEvent(null);
  }

  /** Reconcile UI with the server list after a mutation. */
  async function syncEventsFromServer(detailEventId?: string | null) {
    const feedEvents = await loadFeed({ silent: true });
    if (detailEventId && feedEvents) {
      const updated = feedEvents.find((event) => event.id === detailEventId);
      if (updated) setDetailEvent(updated);
    }
  }

  /** Partition feed into New vs Past; apply calendar date filter and filter pills. */
  const { newEvents, pastEvents } = useMemo(
    () =>
      partitionFeedEvents({
        events,
        cardState,
        passedIds,
        selectedDate,
        filter,
      }),
    [events, passedIds, cardState, selectedDate, filter],
  );

  const visibleEventCount = newEvents.length + pastEvents.length;

  const acceptedEvents = useMemo(
    () =>
      events.filter(
        (event) => event.viewerAccepted || cardState[event.id] === "accepted",
      ),
    [events, cardState],
  );

  const pendingCount = useMemo(
    () =>
      partitionFeedEvents({
        events,
        cardState,
        passedIds,
      }).newEvents.length,
    [events, passedIds, cardState],
  );

  /**
   * POST accept; returns true only when interest was recorded so the caller
   * (runInterested) can then open the event page. 401 opens the sign-in modal
   * and returns false. Server reconciliation runs in the background so the
   * new-tab open fires promptly -- browsers block popups once the click's
   * user activation has expired behind an extra round-trip.
   */
  async function performAccept(eventId: string): Promise<boolean> {
    setCardState((prev) => ({ ...prev, [eventId]: "accepting" }));
    try {
      const response = await fetch(
        `/api/events/${encodeURIComponent(eventId)}/accept`,
        { method: "POST", cache: "no-store" },
      );
      const data = await response.json();

      if (response.status === 401) {
        setCardState((prev) => ({ ...prev, [eventId]: "pending" }));
        setConnectOpen(true);
        return false;
      }

      if (!response.ok) throw new Error(data.error ?? "Accept failed");

      setCardState((prev) => ({ ...prev, [eventId]: "accepted" }));
      setToast("Marked as interested");
      void syncEventsFromServer(detailEvent?.id === eventId ? eventId : null);
      return true;
    } catch (err) {
      setCardState((prev) => ({ ...prev, [eventId]: "pending" }));
      setToast(err instanceof Error ? err.message : "Accept failed");
      return false;
    }
  }

  /** Mark event passed — server sync when signed in, sessionStorage otherwise. */
  async function handlePass(eventId: string) {
    try {
      const response = await fetch(
        `/api/events/${encodeURIComponent(eventId)}/pass`,
        { method: "POST", cache: "no-store" },
      );

      if (response.status === 401) {
        passEvent(eventId);
        setPassedIds(getPassedEventIds());
        setCardState((prev) => ({ ...prev, [eventId]: "passed" }));
        setToast("Passed · Moved to past events");
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Pass failed");
      }

      setToast("Passed · Moved to past events");
      await syncEventsFromServer(
        detailEvent?.id === eventId ? eventId : null,
      );
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Pass failed");
    }
  }

  /** Restore a passed event to the viewer feed. */
  async function handleUnpass(eventId: string) {
    try {
      const response = await fetch(
        `/api/events/${encodeURIComponent(eventId)}/pass`,
        { method: "DELETE", cache: "no-store" },
      );

      if (response.status === 401) {
        setConnectOpen(true);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Undo pass failed");
      }

      setToast("Pass undone · Back in your feed");
      await syncEventsFromServer(
        detailEvent?.id === eventId ? eventId : null,
      );
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Undo pass failed");
    }
  }

  /** Remove interest so the event returns to the viewer feed. */
  async function handleUnaccept(eventId: string) {
    try {
      const response = await fetch(
        `/api/events/${encodeURIComponent(eventId)}/accept`,
        { method: "DELETE", cache: "no-store" },
      );

      if (response.status === 401) {
        setConnectOpen(true);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Remove interest failed");
      }

      setCardState((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
      setToast("Interest removed · Back in your feed");
      await syncEventsFromServer(
        detailEvent?.id === eventId ? eventId : null,
      );
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Remove interest failed");
    }
  }

  /** DELETE event — admin only; removes from shared feed for everyone. */
  async function handleDelete(eventId: string) {
    if (pendingDeleteIds[eventId]) return;

    const localTitle =
      events.find((event) => event.id === eventId)?.title ??
      (detailEvent?.id === eventId ? detailEvent.title : null) ??
      "Event";

    if (
      !window.confirm("Delete this event from the shared feed for everyone?")
    ) {
      return;
    }

    setPendingDeleteIds((prev) => ({ ...prev, [eventId]: true }));

    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
        method: "DELETE",
        cache: "no-store",
      });
      const data = (await response.json()) as {
        error?: string;
        title?: string | null;
        deleted?: boolean;
      };

      if (response.status === 401) {
        setConnectOpen(true);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error ?? "Delete failed");
      }

      const deletedTitle = data.title ?? localTitle;
      setToast(`"${deletedTitle}" deleted`);
      if (detailEvent?.id === eventId) setDetailEvent(null);

      setExitingEventIds((prev) => ({ ...prev, [eventId]: true }));
      await wait(MOTION_MS);
      removeEventFromState(eventId);
      setExitingEventIds((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
      await syncEventsFromServer();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setPendingDeleteIds((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
    }
  }

  async function handleToggleAdmin(user: ProgramUserView) {
    const nextIsAdmin = !user.isAdmin;
    const label = user.name?.trim() || user.email;
    const confirmMessage = nextIsAdmin
      ? `Make ${label} an admin?`
      : `Remove admin access from ${label}?`;

    if (!window.confirm(confirmMessage)) return;

    setPendingToggleId(user.id);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, isAdmin: nextIsAdmin }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Update failed");

      setProgramUsers((prev) =>
        prev?.map((u) => (u.id === user.id ? { ...u, isAdmin: nextIsAdmin } : u)) ??
        prev,
      );
      setToast(
        nextIsAdmin ? `${label} is now an admin` : `${label} is no longer an admin`,
      );
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Update failed");
    } finally {
      setPendingToggleId(null);
    }
  }

  function renderFeedCards(
    sectionEvents: FeedEvent[],
    options?: { showPastActions?: boolean },
  ) {
    return (
      <div className="grid auto-rows-min gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {sectionEvents.map((event) => (
          <EventFeedCard
            key={event.id}
            event={event}
            status={cardState[event.id] ?? "pending"}
            isAdmin={viewerIsAdmin}
            isExiting={Boolean(exitingEventIds[event.id])}
            onAccept={() =>
              void runInterested(event, { accept: performAccept })
            }
            onPass={() => handlePass(event.id)}
            onUnpass={() => handleUnpass(event.id)}
            onUnaccept={() => handleUnaccept(event.id)}
            showPassedActions={options?.showPastActions}
            onDelete={() => handleDelete(event.id)}
            onOpen={() => setDetailEvent(event)}
          />
        ))}
      </div>
    );
  }

  /**
   * Your events / Calendar list. Reuses the same EventFeedCard as the feed so the
   * two stay identical; a single-column grid gives the card's subgrid rows a parent.
   */
  function renderAcceptedCards(sectionEvents: FeedEvent[]) {
    if (sectionEvents.length === 0) {
      return (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          No events you&apos;re interested in yet.
        </p>
      );
    }
    return (
      <div className="grid auto-rows-min gap-3">
        {sectionEvents.map((event) => (
          <EventFeedCard
            key={event.id}
            event={event}
            status="accepted"
            isAdmin={viewerIsAdmin}
            isExiting={Boolean(exitingEventIds[event.id])}
            onAccept={() =>
              void runInterested(event, { accept: performAccept })
            }
            onPass={() => handlePass(event.id)}
            onUnpass={() => handleUnpass(event.id)}
            onUnaccept={() => handleUnaccept(event.id)}
            onDelete={() => handleDelete(event.id)}
            onOpen={() => setDetailEvent(event)}
          />
        ))}
      </div>
    );
  }

  const feedContent = (
    <div className="space-y-4">
      {!loading && events.length > 0 && <FeedSummary events={events} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {loading
              ? "Loading events..."
              : `${visibleEventCount} event${visibleEventCount === 1 ? "" : "s"}`}
          </p>
          {!loading && pendingCount > 0 && (
            <p className="text-sm text-muted">
              {pendingCount} waiting for your response
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "accepted"] as FeedFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`filter-pill ${
                filter === value ? "filter-pill-active" : "filter-pill-inactive"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <FeedSkeleton />
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : events.length === 0 ? (
        <div
          className="glass-card rounded-2xl border border-dashed border-border p-10 text-center"
          data-testid="empty-feed"
        >
          <p className="font-medium text-foreground">No events yet</p>
          <p className="mt-2 text-sm text-muted">
            Paste a link to share with your group.
          </p>
          <button
            type="button"
            onClick={() => setIngestOpen(true)}
            className="btn-primary mt-5"
          >
            Add link
          </button>
        </div>
      ) : visibleEventCount === 0 ? (
        <div
          className="glass-card rounded-2xl p-10 text-center"
          data-testid="caught-up"
        >
          <p className="font-medium text-foreground">You&apos;re caught up</p>
          <p className="mt-2 text-sm text-muted">
            No events match your current filters.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {newEvents.length > 0 && (
            <section data-testid="feed-new-events">
              <h2 className="mb-3 text-[0.6875rem] font-medium uppercase tracking-wider text-muted">
                New events
              </h2>
              {renderFeedCards(newEvents)}
            </section>
          )}

          {pastEvents.length > 0 && (
            <section data-testid="feed-past-events">
              <h2 className="mb-3 text-[0.6875rem] font-medium uppercase tracking-wider text-muted">
                Past events
              </h2>
              {renderFeedCards(pastEvents, { showPastActions: true })}
            </section>
          )}
        </div>
      )}
    </div>
  );

  const adminContent = (
    <div className="space-y-4" data-testid="admin-tab">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {adminSubTab === "events"
              ? loading
                ? "Loading events..."
                : `${events.length} event${events.length === 1 ? "" : "s"}`
              : programUsersLoading
                ? "Loading users..."
                : `${programUsers?.length ?? 0} user${
                    programUsers?.length === 1 ? "" : "s"
                  }`}
          </p>
          <p className="text-sm text-muted">
            {adminSubTab === "events"
              ? "Who added each event and who's going"
              : "Everyone signed up, with admin and approval status"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2" data-testid="admin-sub-tabs">
          {(["events", "users"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setAdminSubTab(value)}
              className={`filter-pill ${
                adminSubTab === value ? "filter-pill-active" : "filter-pill-inactive"
              }`}
              data-testid={`admin-sub-tab-${value}`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {adminSubTab === "events" ? (
        loading ? (
          <FeedSkeleton />
        ) : events.length === 0 ? (
          <div className="glass-card rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="font-medium text-foreground">No events yet</p>
            <p className="mt-2 text-sm text-muted">
              Paste a link to share with your group.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {events.map((event) => (
              <AdminEventCard
                key={event.id}
                event={event}
                isExiting={Boolean(exitingEventIds[event.id])}
                onDelete={() => handleDelete(event.id)}
                onOpen={() => setDetailEvent(event)}
              />
            ))}
          </div>
        )
      ) : programUsersError ? (
        <div className="glass-card rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="font-medium text-foreground">Could not load users</p>
          <p className="mt-2 text-sm text-muted">{programUsersError}</p>
          <button
            type="button"
            onClick={() => void loadProgramUsers()}
            className="btn-secondary mt-4"
          >
            Try again
          </button>
        </div>
      ) : (
        <ProgramUsersAdmin
          users={programUsers}
          loading={programUsersLoading}
          viewerUserId={programUsersViewerId}
          pendingToggleId={pendingToggleId}
          onToggleAdmin={handleToggleAdmin}
        />
      )}
    </div>
  );

  const yourEventsContent = (
    <div className="space-y-4" data-testid="your-events-tab">
      <div>
        <p className="text-sm font-medium text-foreground">Your events</p>
        <p className="text-sm text-muted">Events you marked as interested</p>
      </div>
      {renderAcceptedCards(acceptedEvents)}
    </div>
  );

  const mainTabs = [
    ["feed", "Feed"],
    ["mine", "Your events"],
    ...(viewerIsAdmin ? ([["admin", "Admin"]] as const) : []),
  ] as const;

  const mobileTabs = [
    ["feed", "Feed"],
    ...(viewerIsAdmin ? ([["admin", "Admin"]] as const) : []),
    ["calendar", "Calendar"],
    ["mine", "Your events"],
  ] as const;

  if (!isLoaded) {
    return (
      <div className="app-shell mx-auto max-w-[100rem] px-4 py-6 sm:px-6 lg:px-8">
        <FeedSkeleton />
      </div>
    );
  }

  if (!isSignedIn) {
    return <WaitlistLanding />;
  }

  if (waitlisted) {
    return <WaitlistGate />;
  }

  return (
    <div className="app-shell">
      <header className="glass-header sticky top-0 z-30">
        <div className="mx-auto flex max-w-[100rem] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Events
            </h1>
            <p className="text-sm text-muted">Who in your group is interested</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIngestOpen(true)}
              className="btn-primary hidden sm:inline-flex"
              data-testid="add-luma-button"
            >
              Add link
            </button>
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="rounded-lg px-2 py-1 text-sm text-muted transition hover:text-foreground sm:hidden"
              data-testid="feedback-button-mobile"
            >
              Feedback
            </button>
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="btn-secondary hidden sm:inline-flex"
              data-testid="feedback-button"
            >
              Feedback
            </button>
            <AuthButton />
          </div>
        </div>
        <nav className="mx-auto hidden max-w-[100rem] gap-1 px-4 pb-0 sm:px-6 lg:flex lg:px-8">
          {mainTabs.map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              data-testid={`tab-${tab}`}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
                activeTab === tab
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto grid max-w-[100rem] gap-6 px-4 py-6 pb-32 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-8 lg:pb-6">
        {/* Mount only the active tab's cards. The feed and Your events now share
            EventFeedCard (same event-card-{id} testid), so keeping both mounted
            would collide; gating on activeTab keeps one set of cards in the DOM. */}
        <section className={activeTab === "feed" ? "block" : "hidden lg:hidden"}>
          {activeTab === "feed" && feedContent}
        </section>

        <section className={activeTab === "admin" ? "block" : "hidden lg:hidden"}>
          {activeTab === "admin" && adminContent}
        </section>

        <section className={activeTab === "mine" ? "block" : "hidden lg:hidden"}>
          {activeTab === "mine" && yourEventsContent}
        </section>

        <section
          className={activeTab === "calendar" ? "block lg:hidden" : "hidden"}
        >
          {activeTab === "calendar" && (
            <div className="space-y-4">
              <MiniCalendar
                events={events}
                currentDate={calendarDate}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onNavigate={setCalendarDate}
              />
              {renderAcceptedCards(acceptedEvents)}
            </div>
          )}
        </section>

        <aside className="hidden space-y-4 lg:block">
          <MiniCalendar
            events={events}
            currentDate={calendarDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onNavigate={setCalendarDate}
          />
        </aside>
      </main>

      <div className="fixed inset-x-0 bottom-14 z-20 px-4 sm:hidden">
        <button
          type="button"
          onClick={() => setIngestOpen(true)}
          className="glass-card flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3 text-left active:scale-[0.99]"
          data-testid="add-luma-button-mobile"
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-lg font-light text-white">
            +
          </span>
          <span className="text-sm text-muted">
            Paste a link to share with the group
          </span>
        </button>
      </div>

      <nav className="glass-header fixed inset-x-0 bottom-0 z-30 lg:hidden">
        <div
          className={`mx-auto grid max-w-lg ${
            viewerIsAdmin ? "grid-cols-4" : "grid-cols-3"
          }`}
        >
          {mobileTabs.map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              // Distinct from the desktop nav's tab-${tab} so testid lookups
              // (e.g. e2e "tab-mine") resolve to a single element.
              data-testid={`mobile-tab-${tab}`}
              className={`py-3 text-xs font-medium transition active:scale-[0.98] sm:text-sm ${
                activeTab === tab ? "text-foreground" : "text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <IngestModal
        open={ingestOpen}
        onClose={() => setIngestOpen(false)}
        onAdded={async () => {
          setToast("Event added to the shared feed");
          await syncEventsFromServer();
        }}
      />

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmitted={() => setToast("Thanks for your feedback")}
      />

      <EventDetailSheet
        event={detailEvent}
        onClose={() => setDetailEvent(null)}
        onAccept={() => {
          if (detailEvent) {
            void runInterested(detailEvent, { accept: performAccept });
          }
        }}
        onPass={() => detailEvent && handlePass(detailEvent.id)}
        onUnpass={() => detailEvent && handleUnpass(detailEvent.id)}
        onUnaccept={() => detailEvent && handleUnaccept(detailEvent.id)}
        onDelete={() => detailEvent && handleDelete(detailEvent.id)}
        isAdmin={viewerIsAdmin}
        showPassedActions={activeTab === "admin"}
        accepted={
          detailEvent
            ? detailEvent.viewerAccepted || cardState[detailEvent.id] === "accepted"
            : false
        }
        passed={
          detailEvent
            ? detailEvent.viewerPassed || cardState[detailEvent.id] === "passed"
            : false
        }
      />

      <SignInPromptModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
      />

      {toast && (
        <div className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-white shadow-md lg:bottom-6">
          {toast}
        </div>
      )}
    </div>
  );
}
