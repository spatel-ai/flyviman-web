import { z } from "zod";
import { localToUtc } from "@/lib/format/zoned";
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
        if (lapses <= now() || lapses > now() + MAX_SOFT_HOLD_DAYS * DAY_MS) {
          ctx.addIssue({
            code: "custom",
            path: ["expiresDate"],
            message: `A soft hold must lapse within the next ${MAX_SOFT_HOLD_DAYS} days`,
          });
        }
      }
    });
}

export type EntryValues = z.infer<ReturnType<typeof entrySchema>>;

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
