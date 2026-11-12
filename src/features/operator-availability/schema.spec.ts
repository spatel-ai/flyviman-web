import { describe, expect, it } from "vitest";
import { defaultExpiry, entrySchema, toRequest } from "./schema";

const IST = "Asia/Kolkata";
const NOW = Date.parse("2026-11-12T06:00:00Z");
const schema = entrySchema(IST, () => NOW);

const base = {
  type: "OPEN" as const,
  startDate: "2026-11-18",
  startTime: "10:00",
  endDate: "2026-11-18",
  endTime: "14:00",
  originId: "",
  expiresDate: "",
  expiresTime: "",
  note: "",
};

function issues(values: object) {
  const result = schema.safeParse({ ...base, ...values });
  return result.success
    ? []
    : result.error.issues.map((issue) => [issue.path[0], issue.message]);
}

describe("availability entry form", () => {
  it("sends local times as UTC instants", () => {
    const values = schema.parse(base);
    expect(toRequest(values, IST)).toEqual({
      collection: "slots",
      body: {
        startsAt: "2026-11-18T04:30:00.000Z",
        endsAt: "2026-11-18T08:30:00.000Z",
        kind: "OPEN",
        originId: null,
      },
    });
  });

  it("refuses an end before the start, a past entry and an over-long one", () => {
    expect(issues({ endTime: "09:00" })).toEqual([
      ["endTime", "The end must be after the start"],
    ]);
    expect(issues({ startDate: "2026-11-01", endDate: "2026-11-02" })).toEqual([
      ["endDate", "This time has already passed"],
    ]);
    expect(issues({ endDate: "2027-07-01" })).toEqual([
      ["endDate", "An entry can last at most 180 days"],
    ]);
  });

  it("needs a soft hold to lapse within 30 days", () => {
    expect(issues({ type: "SOFT_HOLD" })).toEqual([
      ["expiresDate", "Choose when the hold lapses"],
    ]);
    expect(
      issues({
        type: "SOFT_HOLD",
        expiresDate: "2027-01-30",
        expiresTime: "12:00",
      }),
    ).toEqual([
      ["expiresDate", "A soft hold must lapse within the next 30 days"],
    ]);
    const hold = schema.parse({
      ...base,
      type: "SOFT_HOLD",
      expiresDate: "2026-11-15",
      expiresTime: "18:00",
      note: "  Charter enquiry  ",
    });
    expect(toRequest(hold, IST)).toEqual({
      collection: "blocks",
      body: {
        startsAt: "2026-11-18T04:30:00.000Z",
        endsAt: "2026-11-18T08:30:00.000Z",
        reason: "SOFT_HOLD",
        expiresAt: "2026-11-15T12:30:00.000Z",
        note: "Charter enquiry",
      },
    });
  });

  it("sends an origin only with a departure slot", () => {
    expect(issues({ type: "DEPARTURE_SLOT" })).toEqual([
      ["originId", "Choose where the aircraft departs from"],
    ]);
    const departure = schema.parse({
      ...base,
      type: "DEPARTURE_SLOT",
      originId: "loc-1",
    });
    expect(toRequest(departure, IST).body).toMatchObject({ originId: "loc-1" });
    const open = schema.parse({ ...base, originId: "loc-1" });
    expect(toRequest(open, IST).body).toMatchObject({ originId: null });
  });

  it("explains a lapse time in the past, or after the hold is over", () => {
    expect(
      issues({
        type: "SOFT_HOLD",
        expiresDate: "2026-11-11",
        expiresTime: "12:00",
      }),
    ).toEqual([["expiresDate", "This time has already passed"]]);
    expect(
      issues({
        type: "SOFT_HOLD",
        expiresDate: "2026-11-18",
        expiresTime: "15:00",
      }),
    ).toEqual([
      ["expiresDate", "The hold must lapse before the time it holds is over"],
    ]);
  });

  it("defaults a soft hold to lapse six hours before it starts, within limits", () => {
    // Starts 18 Nov 10:00 IST: lapses 18 Nov 04:00 IST.
    expect(defaultExpiry(base, IST, NOW)).toEqual({
      date: "2026-11-18",
      time: "04:00",
    });
    // Starting within the hour: never in the past (now is 11:30 IST).
    expect(
      defaultExpiry(
        {
          ...base,
          startDate: "2026-11-12",
          startTime: "12:00",
          endDate: "2026-11-12",
          endTime: "18:00",
        },
        IST,
        NOW,
      ),
    ).toEqual({ date: "2026-11-12", time: "12:30" });
    // Far ahead: capped inside the 30-day window.
    const far = defaultExpiry(
      { ...base, startDate: "2027-02-01", endDate: "2027-02-01" },
      IST,
      NOW,
    );
    expect(
      schema.safeParse({
        ...base,
        type: "SOFT_HOLD",
        startDate: "2027-02-01",
        endDate: "2027-02-01",
        expiresDate: far.date,
        expiresTime: far.time,
      }).success,
    ).toBe(true);
  });
});
