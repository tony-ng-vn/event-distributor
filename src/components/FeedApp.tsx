/**
 * Main app shell — state, data fetching, layout, modals.
 *
 * Data flow:
 *   mount → fetch /api/events → setEvents
 *   Mutations (add/accept/pass/unpass/delete) → API → syncEventsFromServer()
 *   Anonymous pass → sessionStorage only (no backend pass row)
 *
 * Responsive: 2-col feed on desktop, bottom tabs on mobile, calendar sidebar lg+.
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { partitionFeedEvents } from "@/lib/feed-partition";
import { getPassedEventIds, passEvent } from "@/lib/pass-storage";
import { AuthButton, SignInPromptModal } from "@/components/AuthControls";
import { CalendarEventList, MiniCalendar } from "@/components/MiniCalendar";
import { AdminEventCard } from "@/components/AdminEventCard";
import { EventDetailSheet } from "@/components/EventDetailSheet";
import { EventFeedCard } from "@/components/EventFeedCard";
import { FeedSkeleton } from "@/components/FeedSkeleton";
import { FeedSummary } from "@/components/FeedSummary";
import { IngestModal } from "@/components/IngestModal";
import type { FeedEvent, FeedFilter, MobileTab } from "@/types/feed";

type CardState = Record<string, "pending" | "accepted" | "passed" | "accepting">;

const MOTION_MS = 220;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function FeedApp() {
  // Server data
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [activeTab, setActiveTab] = useState<MobileTab>("feed");
  const [adminEvents, setAdminEvents] = useState<FeedEvent[] | null>(null);
  const [adminEventsLoading, setAdminEventsLoading] = useState(false);
  const [passedIds, setPassedIds] = useState<string[]>([]);
  const [cardState, setCardState] = useState<CardState>({});
  const [ingestOpen, setIngestOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<FeedEvent | null>(null);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [pendingAcceptEventId, setPendingAcceptEventId] = useState<string | null>(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);
  const [exitingEventIds, setExitingEventIds] = useState<Record<string, true>>({});
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Record<string, true>>({});
  const adminEventsLoadedRef = useRef(false);

  useEffect(() => {
    adminEventsLoadedRef.current = adminEvents !== null;
  }, [adminEvents]);

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
      if (!response.ok) throw new Error(data.error ?? "Failed to load feed");
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

  /** Load all events including passed ones (Admin tab). */
  const loadAdminEvents = useCallback(async (options?: { silent?: boolean }): Promise<
    FeedEvent[] | null
  > => {
    if (!options?.silent) {
      setAdminEventsLoading(true);
    }
    try {
      const response = await fetch("/api/events?scope=all", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load events");
      setAdminEvents(data.events);
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
        setToast(err instanceof Error ? err.message : "Failed to load events");
      }
      return null;
    } finally {
      if (!options?.silent) {
        setAdminEventsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === "admin" && adminEvents === null && !adminEventsLoading) {
      void loadAdminEvents();
    }
  }, [activeTab, adminEvents, adminEventsLoading, loadAdminEvents]);

  useEffect(() => {
    if (activeTab === "admin" && !viewerIsAdmin) {
      setActiveTab("feed");
    }
  }, [activeTab, viewerIsAdmin]);

  useEffect(() => {
    loadFeed();
    setPassedIds(getPassedEventIds());
  }, [loadFeed]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  /** Drop one event from all client state after backend confirms removal. */
  function removeEventFromState(eventId: string) {
    setEvents((prev) => prev.filter((event) => event.id !== eventId));
    setAdminEvents((prev) =>
      prev?.filter((event) => event.id !== eventId) ?? prev,
    );
    setCardState((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
    setPassedIds((prev) => prev.filter((id) => id !== eventId));
    if (detailEvent?.id === eventId) setDetailEvent(null);
  }

  /** Reconcile UI with server lists after a mutation. */
  async function syncEventsFromServer(detailEventId?: string | null) {
    const feedEvents = await loadFeed({ silent: true });
    if (adminEventsLoadedRef.current) {
      await loadAdminEvents({ silent: true });
    }
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

  const summaryEvents = useMemo(() => events, [events]);

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

  /** POST accept; 401 opens sign-in modal. */
  async function performAccept(eventId: string) {
    setCardState((prev) => ({ ...prev, [eventId]: "accepting" }));
    try {
      const response = await fetch(
        `/api/events/${encodeURIComponent(eventId)}/accept`,
        { method: "POST", cache: "no-store" },
      );
      const data = await response.json();

      if (response.status === 401) {
        setCardState((prev) => ({ ...prev, [eventId]: "pending" }));
        setPendingAcceptEventId(eventId);
        setConnectOpen(true);
        return;
      }

      if (!response.ok) throw new Error(data.error ?? "Accept failed");

      setToast("You're going");
      await syncEventsFromServer(
        detailEvent?.id === eventId ? eventId : null,
      );
    } catch (err) {
      setCardState((prev) => ({ ...prev, [eventId]: "pending" }));
      setToast(err instanceof Error ? err.message : "Accept failed");
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

  /** DELETE event — admin only; removes from shared feed for everyone. */
  async function handleDelete(eventId: string) {
    if (pendingDeleteIds[eventId]) return;

    const localTitle =
      events.find((event) => event.id === eventId)?.title ??
      adminEvents?.find((event) => event.id === eventId)?.title ??
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

  function renderFeedCards(sectionEvents: FeedEvent[]) {
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        {sectionEvents.map((event) => (
          <EventFeedCard
            key={event.id}
            event={event}
            status={cardState[event.id] ?? "pending"}
            isAdmin={viewerIsAdmin}
            isExiting={Boolean(exitingEventIds[event.id])}
            onAccept={() => performAccept(event.id)}
            onPass={() => handlePass(event.id)}
            onDelete={() => handleDelete(event.id)}
            onOpen={() => setDetailEvent(event)}
          />
        ))}
      </div>
    );
  }

  const feedContent = (
    <div className="space-y-4">
      {!loading && summaryEvents.length > 0 && (
        <FeedSummary events={summaryEvents} />
      )}

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
            Paste a Luma link to share with your group.
          </p>
          <button
            type="button"
            onClick={() => setIngestOpen(true)}
            className="btn-primary mt-5"
          >
            Add Luma link
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
              {renderFeedCards(pastEvents)}
            </section>
          )}
        </div>
      )}
    </div>
  );

  const adminContent = (
    <div className="space-y-4" data-testid="admin-tab">
      <div>
        <p className="text-sm font-medium text-foreground">
          {adminEventsLoading
            ? "Loading events..."
            : `${adminEvents?.length ?? 0} event${adminEvents?.length === 1 ? "" : "s"}`}
        </p>
        <p className="text-sm text-muted">
          Who added each event and who&apos;s going
        </p>
      </div>

      {adminEventsLoading ? (
        <FeedSkeleton />
      ) : !adminEvents || adminEvents.length === 0 ? (
        <div className="glass-card rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="font-medium text-foreground">No events yet</p>
          <p className="mt-2 text-sm text-muted">
            Paste a Luma link to share with your group.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {adminEvents.map((event) => (
            <AdminEventCard
              key={event.id}
              event={event}
              isExiting={Boolean(exitingEventIds[event.id])}
              onDelete={() => handleDelete(event.id)}
              onOpen={() => setDetailEvent(event)}
            />
          ))}
        </div>
      )}
    </div>
  );

  const mainTabs = viewerIsAdmin
    ? ([
        ["feed", "Feed"],
        ["admin", "Admin"],
      ] as const)
    : ([["feed", "Feed"]] as const);

  const mobileTabs = [
    ["feed", "Feed"],
    ...(viewerIsAdmin ? ([["admin", "Admin"]] as const) : []),
    ["calendar", "Calendar"],
    ["mine", "My Events"],
  ] as const;

  return (
    <div className="app-shell">
      <header className="glass-header sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Events
            </h1>
            <p className="text-sm text-muted">Who in your group is going</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIngestOpen(true)}
              className="btn-primary hidden sm:inline-flex"
              data-testid="add-luma-button"
            >
              Add Luma link
            </button>
            <AuthButton />
          </div>
        </div>
        <nav className="mx-auto hidden max-w-6xl gap-1 px-4 pb-0 lg:flex">
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

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 pb-32 lg:grid-cols-[minmax(0,1fr)_300px] lg:pb-6">
        <section className={activeTab === "feed" ? "block" : "hidden lg:hidden"}>
          {feedContent}
        </section>

        <section className={activeTab === "admin" ? "block" : "hidden lg:hidden"}>
          {adminContent}
        </section>

        <section
          className={
            activeTab === "calendar" || activeTab === "mine"
              ? "block lg:hidden"
              : "hidden"
          }
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
              <CalendarEventList
                events={acceptedEvents}
                isAdmin={viewerIsAdmin}
                exitingEventIds={exitingEventIds}
                onDelete={handleDelete}
                onSelectEvent={setDetailEvent}
              />
            </div>
          )}
          {activeTab === "mine" && (
            <CalendarEventList
              events={acceptedEvents}
              isAdmin={viewerIsAdmin}
              exitingEventIds={exitingEventIds}
              onDelete={handleDelete}
              onSelectEvent={setDetailEvent}
            />
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
          <div className="glass-card rounded-2xl p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Your events
            </h3>
            <CalendarEventList
              events={acceptedEvents}
              isAdmin={viewerIsAdmin}
              exitingEventIds={exitingEventIds}
              onDelete={handleDelete}
              onSelectEvent={setDetailEvent}
            />
          </div>
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
            Paste a Luma link to share with the group
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
              data-testid={`tab-${tab}`}
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

      <EventDetailSheet
        event={detailEvent}
        onClose={() => setDetailEvent(null)}
        onAccept={() => detailEvent && performAccept(detailEvent.id)}
        onPass={() => detailEvent && handlePass(detailEvent.id)}
        onUnpass={() => detailEvent && handleUnpass(detailEvent.id)}
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
        onClose={() => {
          setConnectOpen(false);
          setPendingAcceptEventId(null);
        }}
      />

      {toast && (
        <div className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-white shadow-md lg:bottom-6">
          {toast}
        </div>
      )}
    </div>
  );
}
