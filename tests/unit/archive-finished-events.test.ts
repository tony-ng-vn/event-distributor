/**
 * Unit test for archiveFinishedEvents. The row filtering happens in PostgREST,
 * so we assert the query is built correctly (scoped to ended + un-archived
 * rows, stamping archived_at) and returns the affected-row count -- not that a
 * fake re-implements the filter.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const getInsforgeAdmin = vi.fn();

vi.mock("@/lib/db", () => ({
  getInsforgeAdmin: () => getInsforgeAdmin(),
}));

import { archiveFinishedEvents } from "@/lib/events-service";

type Call = { method: string; args: unknown[] };

function makeFakeDb(result: { data: unknown; error: unknown }) {
  const calls: Call[] = [];
  // Chainable builder: every filter returns `this`; `select` resolves.
  const builder: Record<string, unknown> = {};
  const record = (method: string) => (...args: unknown[]) => {
    calls.push({ method, args });
    return builder;
  };
  builder.from = record("from");
  builder.update = record("update");
  builder.lt = record("lt");
  builder.is = record("is");
  builder.select = (...args: unknown[]) => {
    calls.push({ method: "select", args });
    return Promise.resolve(result);
  };
  return { db: { database: builder }, calls };
}

describe("archiveFinishedEvents", () => {
  beforeEach(() => {
    getInsforgeAdmin.mockReset();
  });

  it("stamps archived_at on ended, un-archived rows and returns the count", async () => {
    const now = new Date("2026-07-20T08:00:00.000Z");
    const { db, calls } = makeFakeDb({
      data: [{ id: "a" }, { id: "b" }, { id: "c" }],
      error: null,
    });
    getInsforgeAdmin.mockReturnValue(db);

    const count = await archiveFinishedEvents(now);
    expect(count).toBe(3);

    const byMethod = Object.fromEntries(calls.map((c) => [c.method, c.args]));
    expect(byMethod.from).toEqual(["events"]);
    expect(byMethod.update).toEqual([{ archived_at: now.toISOString() }]);
    // Only rows that have already ended.
    expect(byMethod.lt).toEqual(["end_at", now.toISOString()]);
    // Idempotent: skip rows already archived.
    expect(byMethod.is).toEqual(["archived_at", null]);
    expect(byMethod.select).toEqual(["id"]);
  });

  it("returns 0 when nothing needs archiving", async () => {
    const { db } = makeFakeDb({ data: [], error: null });
    getInsforgeAdmin.mockReturnValue(db);

    expect(await archiveFinishedEvents(new Date())).toBe(0);
  });

  it("throws when the update fails", async () => {
    const { db } = makeFakeDb({ data: null, error: { message: "boom" } });
    getInsforgeAdmin.mockReturnValue(db);

    await expect(archiveFinishedEvents(new Date())).rejects.toThrow("boom");
  });
});
