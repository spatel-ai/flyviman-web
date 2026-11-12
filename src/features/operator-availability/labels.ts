import type { Tone } from "@/components/ui/badge";

/** Every kind of calendar entry: the two slot kinds and the block reasons. */
export type EntryType =
  | "OPEN"
  | "DEPARTURE_SLOT"
  | "SOFT_HOLD"
  | "MAINTENANCE"
  | "BLACKOUT"
  | "OTHER"
  | "BOOKING";

export const ENTRY_LABELS: Record<EntryType, string> = {
  OPEN: "Open",
  DEPARTURE_SLOT: "Departure slot",
  SOFT_HOLD: "Soft hold",
  MAINTENANCE: "Maintenance",
  BLACKOUT: "Blackout",
  OTHER: "Other block",
  BOOKING: "Booking",
};

/**
 * The tone of each entry. The label always travels with it; colour only
 * supports the words (design-system.md).
 */
export const ENTRY_TONES: Record<EntryType, Tone> = {
  OPEN: "success",
  DEPARTURE_SLOT: "success",
  SOFT_HOLD: "warning",
  MAINTENANCE: "warning",
  BLACKOUT: "danger",
  OTHER: "neutral",
  BOOKING: "info",
};

/** Bar and chip colours per tone, from the theme tokens. */
export const TONE_CLASSES: Record<Tone, string> = {
  neutral: "border border-border bg-surface text-muted",
  accent: "bg-accent/12 text-accent",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  danger: "bg-danger/12 text-danger",
  info: "bg-info/12 text-info",
};

/** The order entries are listed in the legend and the type picker. */
export const ENTRY_ORDER: EntryType[] = [
  "OPEN",
  "DEPARTURE_SLOT",
  "SOFT_HOLD",
  "MAINTENANCE",
  "BLACKOUT",
  "OTHER",
  "BOOKING",
];

/** Entries that offer time to customers, which need an approved operator. */
export const OFFERS_TIME: EntryType[] = ["OPEN", "DEPARTURE_SLOT", "SOFT_HOLD"];

/** Types an operator can add (bookings come only from bookings, M7). */
export function addableTypes(approved: boolean): EntryType[] {
  return ENTRY_ORDER.filter(
    (type) => type !== "BOOKING" && (approved || !OFFERS_TIME.includes(type)),
  );
}
