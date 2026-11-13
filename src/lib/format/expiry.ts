import type { Tone } from "@/components/ui/badge";

/** Today's date in India (`YYYY-MM-DD`), as the API counts expiry days. */
export function indiaToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    now,
  );
}

/** Whole days from `today` to a date-only value; negative once past. */
export function daysUntil(day: string, today: string): number {
  return Math.round(
    (Date.parse(`${day.slice(0, 10)}T00:00:00Z`) -
      Date.parse(`${today}T00:00:00Z`)) /
      86_400_000,
  );
}

export interface ExpiryPresentation {
  label: string;
  tone: Tone;
}

/**
 * How an expiry date reads next to a document: nothing to flag beyond 30
 * days (D-048's first alert), then a warning, red in the last week and once
 * expired. The words carry the meaning; the colour only supports it.
 */
export function expiryState(
  day: string,
  today: string,
): ExpiryPresentation | null {
  const days = daysUntil(day, today);
  if (days < 0) {
    return {
      label: days === -1 ? "Expired yesterday" : `Expired ${-days} days ago`,
      tone: "danger",
    };
  }
  if (days === 0) return { label: "Expires today", tone: "danger" };
  if (days <= 7) {
    return {
      label: days === 1 ? "Expires tomorrow" : `Expires in ${days} days`,
      tone: "danger",
    };
  }
  if (days <= 30) return { label: `Expires in ${days} days`, tone: "warning" };
  return null;
}
