import { z } from "zod";
import { REASON_MAX, REASON_MIN } from "@/lib/pricing-rules";

/** Whole-number setting, left empty for "no limit". Bounds mirror the API's. */
const whole = (max: number, unit: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d+$/.test(value), {
      message: "Enter a whole number, or leave empty for no limit.",
    })
    .refine((value) => value === "" || Number(value) <= max, {
      message: `At most ${max.toLocaleString("en-IN")} ${unit}.`,
    });

export const matchingLimitsSchema = z
  .object({
    minLegKm: whole(20_000, "km"),
    maxLegKm: whole(20_000, "km"),
    minRunwayM: whole(5_000, "metres"),
    minimumNoticeMinutes: whole(10_080, "minutes"),
    landingSites: z.enum(["", "ALLOWED", "NOT_ALLOWED"]),
    reason: z
      .string()
      .trim()
      .min(REASON_MIN, `Say why, in at least ${REASON_MIN} characters.`)
      .max(REASON_MAX, `At most ${REASON_MAX} characters.`),
  })
  .refine(
    ({ minLegKm, maxLegKm }) =>
      minLegKm === "" ||
      maxLegKm === "" ||
      Number(minLegKm) <= Number(maxLegKm),
    {
      path: ["minLegKm"],
      message: "The shortest leg cannot exceed the longest.",
    },
  );

export type MatchingLimitsValues = z.infer<typeof matchingLimitsSchema>;

export const LIMIT_KEYS = [
  "minLegKm",
  "maxLegKm",
  "minRunwayM",
  "minimumNoticeMinutes",
] as const;

/** Only the limits that are set; an empty field sends nothing. */
export function toMatchingConfig(
  values: MatchingLimitsValues,
): Record<string, number | string> {
  const config: Record<string, number | string> = {};
  for (const key of LIMIT_KEYS) {
    if (values[key] !== "") config[key] = Number(values[key]);
  }
  if (values.landingSites !== "") config.landingSites = values.landingSites;
  return config;
}

export function fromMatchingConfig(
  config: Record<string, unknown> = {},
): Omit<MatchingLimitsValues, "reason"> {
  const text = (value: unknown) =>
    typeof value === "number" ? String(value) : "";
  return {
    minLegKm: text(config.minLegKm),
    maxLegKm: text(config.maxLegKm),
    minRunwayM: text(config.minRunwayM),
    minimumNoticeMinutes: text(config.minimumNoticeMinutes),
    landingSites:
      config.landingSites === "ALLOWED" || config.landingSites === "NOT_ALLOWED"
        ? config.landingSites
        : "",
  };
}

export function describeLimits(config: Record<string, unknown>): string {
  const parts: string[] = [];
  const n = (key: string) =>
    typeof config[key] === "number" ? (config[key] as number) : null;
  if (n("minLegKm") != null) parts.push(`legs from ${n("minLegKm")} km`);
  if (n("maxLegKm") != null) parts.push(`legs up to ${n("maxLegKm")} km`);
  if (n("minRunwayM") != null)
    parts.push(`runway ${n("minRunwayM")} m or more`);
  if (n("minimumNoticeMinutes") != null)
    parts.push(`${n("minimumNoticeMinutes")} min notice`);
  if (config.landingSites === "ALLOWED") parts.push("landing sites allowed");
  if (config.landingSites === "NOT_ALLOWED") parts.push("no landing sites");
  return parts.length > 0 ? parts.join(", ") : "No limits set";
}
