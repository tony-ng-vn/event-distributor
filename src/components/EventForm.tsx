"use client";

import { useEffect, useState } from "react";
import type { DistributionChannel, EventFormData } from "@/types/event";
import { DISTRIBUTION_CHANNELS } from "@/types/event";
import {
  combineDateAndTime,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/dates";

interface EventFormProps {
  initialDate?: Date | null;
  initialData?: EventFormData | null;
  mode: "create" | "edit";
  onSubmit: (data: EventFormData) => void;
  onCancel: () => void;
}

const emptyForm = (date?: Date | null): EventFormData => {
  const base = date ?? new Date();
  const start = new Date(base);
  start.setHours(9, 0, 0, 0);
  const end = new Date(base);
  end.setHours(10, 0, 0, 0);

  return {
    title: "",
    description: "",
    location: "",
    startDate: `${toDateInputValue(start)}T${toTimeInputValue(start)}`,
    endDate: `${toDateInputValue(end)}T${toTimeInputValue(end)}`,
    recipients: "",
    channels: ["email"],
  };
};

export function EventForm({
  initialDate,
  initialData,
  mode,
  onSubmit,
  onCancel,
}: EventFormProps) {
  const [form, setForm] = useState<EventFormData>(
    initialData ?? emptyForm(initialDate),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialData ?? emptyForm(initialDate));
    setError(null);
  }, [initialData, initialDate]);

  const toggleChannel = (channel: DistributionChannel) => {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }

    const [startDatePart, startTimePart] = form.startDate.split("T");
    const [endDatePart, endTimePart] = form.endDate.split("T");

    if (!startDatePart || !startTimePart || !endDatePart || !endTimePart) {
      setError("Please set valid start and end times");
      return;
    }

    const start = combineDateAndTime(startDatePart, startTimePart);
    const end = combineDateAndTime(endDatePart, endTimePart);

    if (end <= start) {
      setError("End time must be after start time");
      return;
    }

    if (form.channels.length === 0) {
      setError("Select at least one distribution channel");
      return;
    }

    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <div className="border-b border-zinc-100 px-4 py-3 sm:px-5">
        <h2 className="text-base font-semibold text-zinc-900">
          {mode === "create" ? "Create Event" : "Edit Event"}
        </h2>
        <p className="text-sm text-zinc-500">
          Fill in details and choose your audience
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <Field label="Title" required>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Team all-hands, Product launch..."
            className="input-field"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Start" required>
            <input
              type="datetime-local"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="input-field"
            />
          </Field>
          <Field label="End" required>
            <input
              type="datetime-local"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="input-field"
            />
          </Field>
        </div>

        <Field label="Location">
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Conference Room A, Zoom link..."
            className="input-field"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Event details, agenda, notes..."
            className="input-field resize-none"
          />
        </Field>

        <Field label="Recipients / Audience">
          <textarea
            value={form.recipients}
            onChange={(e) => setForm({ ...form, recipients: e.target.value })}
            rows={2}
            placeholder="team@company.com, marketing, all-staff (comma separated)"
            className="input-field resize-none"
          />
        </Field>

        <Field label="Distribution Channels">
          <div className="grid grid-cols-2 gap-2">
            {DISTRIBUTION_CHANNELS.map((channel) => {
              const selected = form.channels.includes(channel.id);
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => toggleChannel(channel.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
                      : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                >
                  <p className="text-sm font-medium text-zinc-900">
                    {channel.label}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {channel.description}
                  </p>
                </button>
              );
            })}
          </div>
        </Field>
      </div>

      <div className="flex gap-2 border-t border-zinc-100 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          {mode === "create" ? "Create Event" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
