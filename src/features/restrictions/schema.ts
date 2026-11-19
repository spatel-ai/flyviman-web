import { z } from "zod";
import type { Schemas } from "@/lib/api/types";

/** The restrictions an aircraft or an organisation carries (same shape). */
export type Restrictions = Schemas["AircraftRestrictionsDto"];

// TODO(W1-4): switch to Schemas["OperatorRestrictionsResponseDto"] and
// Schemas["OperatorRestrictionsDto"] after `npm run api:types`.
export interface OperatorRestrictionsResponse {
  restrictions: Restrictions | null;
}
export interface OperatorRestrictionsBody {
  restrictions: Restrictions | null;
}

export const MAX_EXCLUDED_LOCATIONS = 100;
export const MAX_NOTICE_MINUTES = 10_080;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const whole = /^\d+$/;

export const restrictionsSchema = z
  .object({
    hoursStart: z.string().trim(),
    hoursEnd: z.string().trim(),
    excludedLocationIds: z
      .array(z.string().regex(UUID))
      .max(
        MAX_EXCLUDED_LOCATIONS,
        `At most ${MAX_EXCLUDED_LOCATIONS} locations.`,
      ),
    noticeHours: z.string().trim(),
    noticeMinutes: z.string().trim(),
  })
  .superRefine((values, ctx) => {
    const { hoursStart, hoursEnd } = values;
    if (hoursStart !== "" && !TIME.test(hoursStart)) {
      ctx.addIssue({
        code: "custom",
        path: ["hoursStart"],
        message: "Enter a time such as 06:00.",
      });
    }
    if (hoursEnd !== "" && !TIME.test(hoursEnd)) {
      ctx.addIssue({
        code: "custom",
        path: ["hoursEnd"],
        message: "Enter a time such as 22:00.",
      });
    }
    if ((hoursStart === "") !== (hoursEnd === "")) {
      ctx.addIssue({
        code: "custom",
        path: [hoursStart === "" ? "hoursStart" : "hoursEnd"],
        message: "Set both the start and the end, or leave both empty.",
      });
    } else if (hoursStart !== "" && hoursStart === hoursEnd) {
      ctx.addIssue({
        code: "custom",
        path: ["hoursEnd"],
        message: "The end must differ from the start.",
      });
    }
    const { noticeHours: hours, noticeMinutes: minutes } = values;
    if (hours !== "" && !whole.test(hours)) {
      ctx.addIssue({
        code: "custom",
        path: ["noticeHours"],
        message: "A whole number of hours.",
      });
    }
    if (minutes !== "" && (!whole.test(minutes) || Number(minutes) > 59)) {
      ctx.addIssue({
        code: "custom",
        path: ["noticeMinutes"],
        message: "A whole number from 0 to 59.",
      });
    }
    if (
      (hours === "" || whole.test(hours)) &&
      (minutes === "" || whole.test(minutes)) &&
      noticeToMinutes(hours, minutes) > MAX_NOTICE_MINUTES
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["noticeHours"],
        message: "At most 7 days (168 hours).",
      });
    }
  });

export type RestrictionsValues = z.infer<typeof restrictionsSchema>;

function noticeToMinutes(hours: string, minutes: string): number {
  return Number(hours || 0) * 60 + Number(minutes || 0);
}

/**
 * The body to send: only what is set, and `null` when nothing is, which
 * clears the restrictions.
 */
export function toRestrictions(
  values: RestrictionsValues,
): Restrictions | null {
  const result: Restrictions = {};
  if (values.hoursStart !== "" && values.hoursEnd !== "") {
    result.operatingHours = { start: values.hoursStart, end: values.hoursEnd };
  }
  if (values.excludedLocationIds.length > 0) {
    result.excludedLocationIds = values.excludedLocationIds;
  }
  if (values.noticeHours !== "" || values.noticeMinutes !== "") {
    result.minimumNoticeMinutes = noticeToMinutes(
      values.noticeHours,
      values.noticeMinutes,
    );
  }
  return Object.keys(result).length === 0 ? null : result;
}

export function fromRestrictions(
  restrictions: Restrictions | null | undefined,
): RestrictionsValues {
  const notice = restrictions?.minimumNoticeMinutes;
  return {
    hoursStart: restrictions?.operatingHours?.start ?? "",
    hoursEnd: restrictions?.operatingHours?.end ?? "",
    excludedLocationIds: restrictions?.excludedLocationIds ?? [],
    noticeHours: notice == null ? "" : String(Math.floor(notice / 60)),
    noticeMinutes: notice == null ? "" : String(notice % 60),
  };
}

/** API field names that differ from this form's. */
export const RESTRICTION_ALIASES = {
  "restrictions.operatingHours.start": "hoursStart",
  "restrictions.operatingHours.end": "hoursEnd",
  "restrictions.excludedLocationIds": "excludedLocationIds",
  "restrictions.minimumNoticeMinutes": "noticeHours",
  operatingHours: "hoursStart",
  excludedLocationIds: "excludedLocationIds",
  minimumNoticeMinutes: "noticeHours",
} as const;
