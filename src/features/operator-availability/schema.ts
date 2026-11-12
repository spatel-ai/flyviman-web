import { z } from "zod";
import { localToUtc, utcToLocal } from "@/lib/format/zoned";
import type { EntryType } from "./labels";

const DAY_MS = 86_400_000;
/** Mirrors the API: an entry is at most 180 days long. */
export const MAX_ENTRY_DAYS = 180;
/** Mirrors the API: a soft hold lapses within 30 days. */
export const MAX_SOFT_HOLD_DAYS = 30;

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");
const time = z.string().regex(/^\d{2}:\d{2}$/, "Choose a time");

/**
 * The add and edit form, in the aircraft's local time. `zone` turns the wall
 * times into instants so the limits are checked as the API checks them.
 */
export function entrySchema(zone: string, now: () => number = Date.now) {
  return z
    .object({
      type: z.enum([
        "OPEN",
        "DEPARTURE_SLOT",
        "SOFT_HOLD",
        "MAINTENANCE",
        "BLACKOUT",
        "OTHER",
      ]),
      startDate: day,
      startTime: time,
      endDate: day,
      endTime: time,
      originId: z.string(),
      expiresDate: z.string(),
      expiresTime: z.string(),
      note: z.string().trim().max(500, "Keep the note under 500 characters"),
    })
    .superRefine((values, ctx) => {
      if (
        !day.safeParse(values.startDate).success ||
        !time.safeParse(values.startTime).success ||
        !day.safeParse(values.endDate).success ||
        !time.safeParse(values.endTime).success
      ) {
        return;
      }
      const start = Date.parse(
        localToUtc(values.startDate, values.startTime, zone),
      );
      const end = Date.parse(localToUtc(values.endDate, values.endTime, zone));
      if (end <= start) {
        ctx.addIssue({
          code: "custom",
          path: ["endTime"],
          message: "The end must be after the start",
        });
      } else if (end - start > MAX_ENTRY_DAYS * DAY_MS) {
        ctx.addIssue({
          code: "custom",
          path: ["endDate"],
          message: `An entry can last at most ${MAX_ENTRY_DAYS} days`,
        });
      } else if (end <= now()) {
        ctx.addIssue({
          code: "custom",
          path: ["endDate"],
          message: "This time has already passed",
        });
      }
      if (values.type === "DEPARTURE_SLOT" && !values.originId) {
        ctx.addIssue({
          code: "custom",
          path: ["originId"],
          message: "Choose where the aircraft departs from",
        });
      }
      if (values.type === "SOFT_HOLD") {
        if (
          !day.safeParse(values.expiresDate).success ||
          !time.safeParse(values.expiresTime).success
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["expiresDate"],
            message: "Choose when the hold lapses",
          });
          return;
        }
        const lapses = Date.parse(
          localToUtc(values.expiresDate, values.expiresTime, zone),
        );
        if (lapses <= now()) {
          ctx.addIssue({
            code: "custom",
            path: ["expiresDate"],
            message: "This time has already passed",
          });
        } else if (lapses > now() + MAX_SOFT_HOLD_DAYS * DAY_MS) {
          ctx.addIssue({
            code: "custom",
            path: ["expiresDate"],
            message: `A soft hold must lapse within the next ${MAX_SOFT_HOLD_DAYS} days`,
          });
        } else if (end > start && lapses > end) {
          ctx.addIssue({
            code: "custom",
            path: ["expiresDate"],
            message: "The hold must lapse before the time it holds is over",
          });
        }
      }
    });
}

export type EntryValues = z.infer<ReturnType<typeof entrySchema>>;

const HOUR_MS = 3_600_000;

/**
 * When a new soft hold should lapse by default: six hours before it starts,
 * but never in the past or beyond the 30-day limit (and never after it ends).
 */
export function defaultExpiry(
  values: Pick<EntryValues, "startDate" | "startTime" | "endDate" | "endTime">,
  zone: string,
  now: number = Date.now(),
): { date: string; time: string } {
  let at = now + 24 * HOUR_MS;
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(values.startDate) &&
    /^\d{2}:\d{2}$/.test(values.startTime)
  ) {
    const start = Date.parse(
      localToUtc(values.startDate, values.startTime, zone),
    );
    at = Math.min(
      Math.max(start - 6 * HOUR_MS, now + HOUR_MS),
      now + MAX_SOFT_HOLD_DAYS * DAY_MS - HOUR_MS,
    );
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(values.endDate) &&
      /^\d{2}:\d{2}$/.test(values.endTime)
    ) {
      const end = Date.parse(localToUtc(values.endDate, values.endTime, zone));
      at = Math.min(at, end);
    }
  }
  // Whole minutes, as the time field shows them.
  const local = utcToLocal(
    new Date(Math.ceil(at / 60_000) * 60_000).toISOString(),
    zone,
  );
  return { date: local.date, time: local.time };
}

/** Which collection an entry type belongs to. */
export function isSlotType(type: EntryType): boolean {
  return type === "OPEN" || type === "DEPARTURE_SLOT";
}

/** The request for the API: UTC instants with `Z`, as the API requires. */
export function toRequest(values: EntryValues, zone: string) {
  const startsAt = localToUtc(values.startDate, values.startTime, zone);
  const endsAt = localToUtc(values.endDate, values.endTime, zone);
  if (isSlotType(values.type)) {
    return {
      collection: "slots" as const,
      body: {
        startsAt,
        endsAt,
        kind: values.type,
        originId:
          values.type === "DEPARTURE_SLOT" && values.originId
            ? values.originId
            : null,
      },
    };
  }
  return {
    collection: "blocks" as const,
    body: {
      startsAt,
      endsAt,
      reason: values.type,
      ...(values.type === "SOFT_HOLD"
        ? {
            expiresAt: localToUtc(values.expiresDate, values.expiresTime, zone),
          }
        : {}),
      ...(values.note ? { note: values.note } : {}),
    },
  };
}
