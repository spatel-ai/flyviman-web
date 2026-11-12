import { describe, expect, it } from "vitest";
import {
  entriesOnDay,
  localDays,
  placeEntries,
  toEntries,
  type Entry,
} from "./entries";

const IST = "Asia/Kolkata";

function entry(id: string, startsAt: string, endsAt: string): Entry {
  return {
    id,
    aircraftId: "a1",
    source: "slot",
    type: "OPEN",
    startsAt,
    endsAt,
    expiresAt: null,
    note: null,
    originId: null,
  };
}

describe("calendar entries", () => {
  it("merges slots and blocks in time order", () => {
    const entries = toEntries(
      [
        {
          id: "s1",
          aircraftId: "a1",
          startsAt: "2026-11-18T04:30:00.000Z",
          endsAt: "2026-11-18T08:30:00.000Z",
          kind: "OPEN",
          originId: null,
        },
      ],
      [
        {
          id: "b1",
          aircraftId: "a1",
          startsAt: "2026-11-17T04:30:00.000Z",
          endsAt: "2026-11-17T08:30:00.000Z",
          reason: "MAINTENANCE",
          bookingId: null,
          expiresAt: null,
          note: "Engine check",
        },
      ],
    );
    expect(entries.map((e) => [e.id, e.type, e.source])).toEqual([
      ["b1", "MAINTENANCE", "block"],
      ["s1", "OPEN", "slot"],
    ]);
  });

  it("reads local days, and an end at local midnight does not spill over", () => {
    // 18 Nov 00:00 IST to 19 Nov 00:00 IST is one local day.
    expect(
      localDays(
        entry("e", "2026-11-17T18:30:00Z", "2026-11-18T18:30:00Z"),
        IST,
      ),
    ).toEqual({ first: "2026-11-18", last: "2026-11-18" });
    // 23:00 UTC on the 17th is already the 18th in India.
    expect(
      localDays(
        entry("e", "2026-11-17T23:00:00Z", "2026-11-18T01:00:00Z"),
        IST,
      ),
    ).toEqual({ first: "2026-11-18", last: "2026-11-18" });
  });

  it("finds what touches a day", () => {
    const entries = [
      entry("a", "2026-11-17T04:30:00Z", "2026-11-19T04:30:00Z"),
      entry("b", "2026-11-20T04:30:00Z", "2026-11-20T06:30:00Z"),
    ];
    expect(entriesOnDay(entries, "2026-11-18", IST).map((e) => e.id)).toEqual([
      "a",
    ]);
  });

  it("places bars on columns and stacks overlaps into lanes", () => {
    const entries = [
      entry("long", "2026-11-14T04:30:00Z", "2026-11-18T04:30:00Z"),
      entry("same-day", "2026-11-17T04:30:00Z", "2026-11-17T06:30:00Z"),
      entry("later", "2026-11-20T04:30:00Z", "2026-11-21T04:30:00Z"),
      entry("outside", "2026-12-01T04:30:00Z", "2026-12-02T04:30:00Z"),
    ];
    const { placed, lanes } = placeEntries(entries, "2026-11-16", 7, IST);
    expect(lanes).toBe(2);
    expect(
      placed.map((p) => [p.entry.id, p.startColumn, p.endColumn, p.lane]),
    ).toEqual([
      ["long", 0, 2, 0], // clipped to the first visible day
      ["same-day", 1, 1, 1],
      ["later", 4, 5, 0],
    ]);
  });
});
