"use client";

import { useCallback, useEffect, useState } from "react";
import { loadEvents, saveEvents } from "@/lib/storage";
import type {
  DistributionChannel,
  Event,
  EventFormData,
} from "@/types/event";

function generateId(): string {
  return crypto.randomUUID();
}

function parseRecipients(raw: string): string[] {
  return raw
    .split(/[,;\n]/)
    .map((r) => r.trim())
    .filter(Boolean);
}

function formToEvent(data: EventFormData, existing?: Event): Event {
  const startDate = new Date(data.startDate).toISOString();
  const endDate = new Date(data.endDate).toISOString();

  return {
    id: existing?.id ?? generateId(),
    title: data.title.trim(),
    description: data.description.trim(),
    location: data.location.trim(),
    startDate,
    endDate,
    recipients: parseRecipients(data.recipients),
    channels: data.channels,
    status: existing?.status ?? "draft",
    distributedAt: existing?.distributedAt,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
}

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEvents(loadEvents());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      saveEvents(events);
    }
  }, [events, hydrated]);

  const createEvent = useCallback((data: EventFormData) => {
    const event = formToEvent(data);
    setEvents((prev) => [...prev, event]);
    return event;
  }, []);

  const updateEvent = useCallback((id: string, data: EventFormData) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? formToEvent(data, e) : e)),
    );
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const distributeEvent = useCallback(
    (id: string, channels: DistributionChannel[]) => {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                channels,
                status: "distributed" as const,
                distributedAt: new Date().toISOString(),
              }
            : e,
        ),
      );
    },
    [],
  );

  const scheduleEvent = useCallback((id: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: "scheduled" as const } : e,
      ),
    );
  }, []);

  return {
    events,
    hydrated,
    createEvent,
    updateEvent,
    deleteEvent,
    distributeEvent,
    scheduleEvent,
  };
}

export function eventToFormData(event: Event): EventFormData {
  const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
  };

  return {
    title: event.title,
    description: event.description,
    location: event.location,
    startDate: toLocalInput(event.startDate),
    endDate: toLocalInput(event.endDate),
    recipients: event.recipients.join(", "),
    channels: event.channels,
  };
}
