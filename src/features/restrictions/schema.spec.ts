import { describe, expect, it } from "vitest";
import {
  fromRestrictions,
  restrictionsSchema,
  toRestrictions,
  type RestrictionsValues,
} from "./schema";

const ID = "6f1c1f0a-4b7e-4a55-9d3a-0c2d7c1a9b11";
const empty: RestrictionsValues = {
  hoursStart: "",
  hoursEnd: "",
  excludedLocationIds: [],
  noticeHours: "",
  noticeMinutes: "",
};

describe("restrictions form", () => {
  it("sends only what is set, and null when nothing is", () => {
    expect(toRestrictions(empty)).toBeNull();
    expect(
      toRestrictions({
        hoursStart: "22:00",
        hoursEnd: "06:00",
        excludedLocationIds: [ID],
        noticeHours: "2",
        noticeMinutes: "30",
      }),
    ).toEqual({
      operatingHours: { start: "22:00", end: "06:00" },
      excludedLocationIds: [ID],
      minimumNoticeMinutes: 150,
    });
  });

  it("keeps a notice of zero as set", () => {
    expect(toRestrictions({ ...empty, noticeHours: "0" })).toEqual({
      minimumNoticeMinutes: 0,
    });
  });

  it("round-trips stored restrictions", () => {
    const stored = {
      operatingHours: { start: "06:00", end: "20:00" },
      excludedLocationIds: [ID],
      minimumNoticeMinutes: 1500,
    };
    expect(fromRestrictions(stored)).toMatchObject({
      noticeHours: "25",
      noticeMinutes: "0",
    });
    expect(toRestrictions(fromRestrictions(stored))).toEqual(stored);
    expect(fromRestrictions(null)).toEqual(empty);
  });

  it("lets an end before the start span midnight but refuses equal times", () => {
    expect(
      restrictionsSchema.safeParse({
        ...empty,
        hoursStart: "22:00",
        hoursEnd: "06:00",
      }).success,
    ).toBe(true);
    expect(
      restrictionsSchema.safeParse({
        ...empty,
        hoursStart: "06:00",
        hoursEnd: "06:00",
      }).success,
    ).toBe(false);
  });

  it("needs both ends of the hours or neither", () => {
    const result = restrictionsSchema.safeParse({
      ...empty,
      hoursStart: "06:00",
    });
    expect(result.success).toBe(false);
    expect(
      restrictionsSchema.safeParse({
        ...empty,
        hoursStart: "6am",
        hoursEnd: "9pm",
      }).success,
    ).toBe(false);
  });

  it("bounds the notice to seven days", () => {
    expect(
      restrictionsSchema.safeParse({ ...empty, noticeHours: "168" }).success,
    ).toBe(true);
    expect(
      restrictionsSchema.safeParse({
        ...empty,
        noticeHours: "168",
        noticeMinutes: "1",
      }).success,
    ).toBe(false);
    expect(
      restrictionsSchema.safeParse({ ...empty, noticeMinutes: "60" }).success,
    ).toBe(false);
    expect(
      restrictionsSchema.safeParse({ ...empty, noticeHours: "1.5" }).success,
    ).toBe(false);
  });

  it("allows at most 100 excluded locations", () => {
    const ids = Array.from({ length: 101 }, () => ID);
    expect(
      restrictionsSchema.safeParse({ ...empty, excludedLocationIds: ids })
        .success,
    ).toBe(false);
  });
});
