/**
 * Main app shell — state, data fetching, layout, modals.
 *
 * Data flow:
 *   mount → fetch /api/events → setEvents
 *   Accept → POST /api/events/[id]/accept → update card + guest list
 *   Pass   → POST /api/events/[id]/pass (signed-in) or sessionStorage (anonymous)
 *   Ingest → IngestModal → POST /api/events/ingest
 *
 * Responsive: 2-col feed on desktop, bottom tabs on mobile, calendar sidebar lg+.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isSameDay } from "@/lib/dates";
import { partitionFeedEvents } from "@/lib/feed-partition";
import { getPassedEventIds, passEvent } from "@/lib/pass-storage";
import { AuthButton, SignInPromptModal } from "@/components/AuthControls";
import { CalendarEventList, MiniCalendar } from "@/components/MiniCalendar";
import { EventDetailSheet } from "@/components/EventDetailSheet";
import { EventFeedCard } from "@/components/EventFeedCard";
import { FeedSkeleton } from "@/components/FeedSkeleton";
import { FeedSummary } from "@/components/FeedSummary";
import { IngestModal } from "@/components/IngestModal";
import type { FeedEvent, FeedFilter, MobileTab } from "@/types/feed";

type CardState = Record<string, "pending" | "accepted" | "passed" | "accepting">;

export function FeedApp() {
  // Server data
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [activeTab, setActiveTab] = useState<MobileTab>("feed");
  const [allEvents, setAllEvents] = useState<FeedEvent[] | null>(null);
  const [allEventsLoading, setAllEventsLoading] = useState(false);
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

  /** Load shared feed from API; merge server viewerAccepted into cardState. */
  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/events");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feed");
    } finally {
      setLoading(false);
    }
  }, []);

  /** Load all events including passed ones (All Events tab). */
  const loadAllEvents = useCallback(async () => {
    setAllEventsLoading(true);
    try {
      const response = await fetch("/api/events?scope=all");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load events");
      setAllEvents(data.events);
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
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setAllEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "all-events" && allEvents === null && !allEventsLoading) {
      void loadAllEvents();
    }
  }, [activeTab, allEvents, allEventsLoading, loadAllEvents]);

  useEffect(() => {
    loadFeed();
    setPassedIds(getPassedEventIds());
  }, [loadFeed]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  /** Update one event across feed and all-events state. */
  function patchEvent(eventId: string, updated: FeedEvent) {
    setEvents((prev) =>
      prev.map((event) => (event.id === eventId ? updated : event)),
    );
    setAllEvents((prev) =>
      prev?.map((event) => (event.id === eventId ? updated : event)) ?? prev,
    );
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
      const response = await fetch(`/api/events/${eventId}/accept`, {
        method: "POST",
      });
      const data = await response.json();

      if (response.status === 401) {
        setCardState((prev) => ({ ...prev, [eventId]: "pending" }));
        setPendingAcceptEventId(eventId);
        setConnectOpen(true);
        return;
      }

      if (!response.ok) throw new Error(data.error ?? "Accept failed");

      patchEvent(eventId, data.event);
      setCardState((prev) => ({ ...prev, [eventId]: "accepted" }));
      setEvents((prev) => {
        const exists = prev.some((event) => event.id === eventId);
        if (exists) {
          return prev.map((event) => (event.id === eventId ? data.event : event));
        }
        return [...prev, data.event].sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        );
      });
      setToast("You're going");
      if (detailEvent?.id === eventId) setDetailEvent(data.event);
    } catch (err) {
      setCardState((prev) => ({ ...prev, [eventId]: "pending" }));
      setToast(err instanceof Error ? err.message : "Accept failed");
    }
  }

  /** Hide event from viewer feed — server sync when signed in, sessionStorage otherwise. */
  async function handlePass(eventId: string) {
    try {
      const response = await fetch(`/api/events/${eventId}/pass`, {
        method: "POST",
      });

      if (response.status === 401) {
        passEvent(eventId);
        setPassedIds(getPassedEventIds());
      } else if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Pass failed");
      } else {
        setEvents((prev) =>
          prev.map((event) =>
            event.id === eventId ? { ...event, viewerPassed: true } : event,
          ),
        );
        setAllEvents((prev) =>
          prev?.map((event) =>
            event.id === eventId
              ? { ...event, viewerPassed: true }
              : event,
          ) ?? prev,
        );
      }

      setCardState((prev) => ({ ...prev, [eventId]: "passed" }));
      setToast("Passed · Moved to past events");
      if (detailEvent?.id === eventId) {
        setDetailEvent((prev) =>
          prev ? { ...prev, viewerPassed: true } : prev,
        );
      }
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Pass failed");
    }
  }

  /** Restore a passed event to the viewer feed. */
  async function handleUnpass(eventId: string) {
    try {
      const response = await fetch(`/api/events/${eventId}/pass`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        setConnectOpen(true);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Undo pass failed");
      }

      setAllEvents((prev) => {
        if (!prev) return prev;
        return prev.map((event) =>
          event.id === eventId ? { ...event, viewerPassed: false } : event,
        );
      });
      setEvents((prev) =>
        prev.map((event) =>
          event.id === eventId ? { ...event, viewerPassed: false } : event,
        ),
      );
      setCardState((prev) => ({ ...prev, [eventId]: "pending" }));
      setToast("Pass undone · Back in your feed");
      if (detailEvent?.id === eventId) {
        setDetailEvent((prev) =>
          prev ? { ...prev, viewerPassed: false } : prev,
        );
      }
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Undo pass failed");
    }
  }

  /** DELETE event — admin only; removes from shared feed for everyone. */
  async function handleDelete(eventId: string) {
    if (!window.confirm("Delete this event from the shared feed for everyone?")) {
      return;
    }

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (response.status === 401) {
        setConnectOpen(true);
        return;
      }

      if (!response.ok) throw new Error(data.error ?? "Delete failed");

      setEvents((prev) => prev.filter((event) => event.id !== eventId));
      setAllEvents((prev) => prev?.filter((event) => event.id !== eventId) ?? prev);
      setToast("Event deleted");
      if (detailEvent?.id === eventId) setDetailEvent(null);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Delete failed");
    }
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
              : `${visibleEvents.length} event${visibleEvents.length === 1 ? "" : "s"}`}
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
      ) : visibleEvents.length === 0 ? (
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
        <div className="grid gap-3 lg:grid-cols-2">
          {visibleEvents.map((event) => (
            <EventFeedCard
              key={event.id}
              event={event}
              status={cardState[event.id] ?? "pending"}
              isAdmin={viewerIsAdmin}
              onAccept={() => performAccept(event.id)}
              onPass={() => handlePass(event.id)}
              onDelete={() => handleDelete(event.id)}
              onOpen={() => setDetailEvent(event)}
            />
          ))}
        </div>
      )}
    </div>
  );

  const allEventsContent = (
    <div className="space-y-4" data-testid="all-events-tab">
      <div>
        <p className="text-sm font-medium text-foreground">
          {allEventsLoading
            ? "Loading events..."
            : `${allEvents?.length ?? 0} event${allEvents?.length === 1 ? "" : "s"}`}
        </p>
        <p className="text-sm text-muted">
          Every shared event, including ones you passed on
        </p>
      </div>

      {allEventsLoading ? (
        <FeedSkeleton />
      ) : !allEvents || allEvents.length === 0 ? (
        <div className="glass-card rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="font-medium text-foreground">No events yet</p>
          <p className="mt-2 text-sm text-muted">
            Paste a Luma link to share with your group.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {allEvents.map((event) => (
            <EventFeedCard
              key={event.id}
              event={event}
              status={cardState[event.id] ?? "pending"}
              showPassedActions
              isAdmin={viewerIsAdmin}
              onAccept={() => performAccept(event.id)}
              onPass={() => handlePass(event.id)}
              onUnpass={() => handleUnpass(event.id)}
              onDelete={() => handleDelete(event.id)}
              onOpen={() => setDetailEvent(event)}
            />
          ))}
        </div>
      )}
    </div>
  );

  const mainTabs = [
    ["feed", "Feed"],
    ["all-events", "All Events"],
  ] as const;

  const mobileTabs = [
    ["feed", "Feed"],
    ["all-events", "All Events"],
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

        <section
          className={activeTab === "all-events" ? "block" : "hidden lg:hidden"}
        >
          {allEventsContent}
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
                onDelete={handleDelete}
                onSelectEvent={setDetailEvent}
              />
            </div>
          )}
          {activeTab === "mine" && (
            <CalendarEventList
              events={acceptedEvents}
              isAdmin={viewerIsAdmin}
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
        <div className="mx-auto grid max-w-lg grid-cols-4">
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
        onAdded={(event) => {
          const withFlags = { ...event, viewerPassed: false };
          setEvents((prev) =>
            [...prev, withFlags].sort(
              (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
            ),
          );
          setAllEvents((prev) =>
            prev
              ? [...prev, withFlags].sort(
                  (a, b) =>
                    new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
                )
              : prev,
          );
          setCardState((prev) => ({ ...prev, [event.id]: "pending" }));
          setToast("Event added to the shared feed");
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
        showPassedActions={activeTab === "all-events"}
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
