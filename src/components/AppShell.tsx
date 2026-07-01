"use client";

import { useMemo, useState } from "react";
import { Calendar } from "@/components/Calendar";
import { EventDetail } from "@/components/EventDetail";
import { EventForm } from "@/components/EventForm";
import { EventList } from "@/components/EventList";
import { Header } from "@/components/Header";
import { eventToFormData, useEvents } from "@/hooks/useEvents";
import type { CalendarView, Event, EventFormData } from "@/types/event";

type PanelMode = "detail" | "create" | "edit" | null;

export function AppShell() {
  const {
    events,
    hydrated,
    createEvent,
    updateEvent,
    deleteEvent,
    distributeEvent,
    scheduleEvent,
  } = useEvents();

  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>(null);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const openCreate = (date?: Date | null) => {
    setSelectedDate(date ?? new Date());
    setSelectedEventId(null);
    setPanelMode("create");
  };

  const openDetail = (event: Event) => {
    setSelectedEventId(event.id);
    setSelectedDate(new Date(event.startDate));
    setPanelMode("detail");
  };

  const closePanel = () => {
    setPanelMode(null);
  };

  const handleCreate = (data: EventFormData) => {
    const event = createEvent(data);
    openDetail(event);
  };

  const handleUpdate = (data: EventFormData) => {
    if (!selectedEventId) return;
    updateEvent(selectedEventId, data);
    setPanelMode("detail");
  };

  const handleDelete = () => {
    if (!selectedEventId) return;
    deleteEvent(selectedEventId);
    setSelectedEventId(null);
    setPanelMode(null);
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600" />
          Loading events...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <Header />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 lg:flex-row lg:p-6">
        <div className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-6 h-[calc(100vh-7.5rem)] overflow-hidden rounded-2xl border border-zinc-200 shadow-sm">
            <EventList
              events={events}
              selectedId={selectedEventId}
              onSelect={openDetail}
              onCreateNew={() => openCreate()}
            />
          </div>
        </div>

        <div className="flex min-h-[560px] flex-1 flex-col gap-4 lg:min-h-[calc(100vh-7.5rem)]">
          <div className="flex items-center justify-between lg:hidden">
            <h2 className="text-sm font-semibold text-zinc-900">Calendar</h2>
            <button
              type="button"
              onClick={() => openCreate(selectedDate)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700"
            >
              + New Event
            </button>
          </div>

          <div className="min-h-[480px] flex-1">
            <Calendar
              events={events}
              view={calendarView}
              currentDate={currentDate}
              selectedDate={selectedDate}
              selectedEventId={selectedEventId}
              onViewChange={setCalendarView}
              onNavigate={setCurrentDate}
              onDateSelect={(date) => {
                setSelectedDate(date);
                setPanelMode((mode) => (mode === "create" ? "create" : mode));
              }}
              onEventSelect={openDetail}
            />
          </div>

          <div className="lg:hidden">
            <div className="max-h-72 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <EventList
                events={events}
                selectedId={selectedEventId}
                onSelect={openDetail}
                onCreateNew={() => openCreate()}
              />
            </div>
          </div>
        </div>

        {panelMode && (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-zinc-900/30 p-4 backdrop-blur-sm sm:items-center lg:static lg:inset-auto lg:z-auto lg:w-96 lg:shrink-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl lg:sticky lg:top-6 lg:max-h-[calc(100vh-7.5rem)]">
              {panelMode === "create" && (
                <EventForm
                  mode="create"
                  initialDate={selectedDate}
                  onSubmit={handleCreate}
                  onCancel={closePanel}
                />
              )}

              {panelMode === "edit" && selectedEvent && (
                <EventForm
                  mode="edit"
                  initialData={eventToFormData(selectedEvent)}
                  onSubmit={handleUpdate}
                  onCancel={() => setPanelMode("detail")}
                />
              )}

              {panelMode === "detail" && selectedEvent && (
                <EventDetail
                  event={selectedEvent}
                  onEdit={() => setPanelMode("edit")}
                  onDelete={handleDelete}
                  onSchedule={() => scheduleEvent(selectedEvent.id)}
                  onDistribute={(channels) =>
                    distributeEvent(selectedEvent.id, channels)
                  }
                  onClose={closePanel}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
