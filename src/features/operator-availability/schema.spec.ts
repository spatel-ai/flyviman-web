import { describe, expect, it } from "vitest";
import { entrySchema, toRequest } from "./schema";

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
    const departure = schema.parse({
      ...base,
      type: "DEPARTURE_SLOT",
      originId: "loc-1",
    });
    expect(toRequest(departure, IST).body).toMatchObject({ originId: "loc-1" });
    const open = schema.parse({ ...base, originId: "loc-1" });
    expect(toRequest(open, IST).body).toMatchObject({ originId: null });
  });
});
