import type { Schemas } from "@/lib/api/types";
import { addDays, daysBetween, utcToLocal } from "@/lib/format/zoned";
import type { EntryType } from "./labels";

type Slot = Schemas["SlotResponseDto"];
type Block = Schemas["BlockResponseDto"];

/** A slot or a block, in one shape for drawing. */
export interface Entry {
  id: string;
  aircraftId: string;
  source: "slot" | "block";
  type: EntryType;
  startsAt: string;
  endsAt: string;
  expiresAt: string | null;
  note: string | null;
  originId: string | null;
}

export function toEntries(slots: Slot[], blocks: Block[]): Entry[] {
  const all: Entry[] = [
    ...slots.map((slot) => ({
      id: slot.id,
      aircraftId: slot.aircraftId,
      source: "slot" as const,
      type: slot.kind as EntryType,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      expiresAt: null,
      note: null,
      originId: slot.originId ?? null,
    })),
    ...blocks.map((block) => ({
      id: block.id,
      aircraftId: block.aircraftId,
      source: "block" as const,
      type: block.reason as EntryType,
      startsAt: block.startsAt,
      endsAt: block.endsAt,
      expiresAt: block.expiresAt ?? null,
      note: block.note ?? null,
      originId: null,
    })),
  ];
  return all.sort(
    (a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id),
  );
}

/**
 * The local calendar days an entry covers. An entry ending exactly at
 * midnight does not cover the day that midnight starts.
 */
export function localDays(
  entry: Pick<Entry, "startsAt" | "endsAt">,
  zone: string,
): { first: string; last: string } {
  const start = utcToLocal(entry.startsAt, zone);
  const end = utcToLocal(entry.endsAt, zone);
  const last =
    end.time === "00:00" && end.date > start.date
      ? addDays(end.date, -1)
      : end.date;
  return { first: start.date, last };
}

/** Entries that touch a local calendar day. */
export function entriesOnDay(
  entries: Entry[],
  day: string,
  zone: string,
): Entry[] {
  return entries.filter((entry) => {
    const { first, last } = localDays(entry, zone);
    return first <= day && day <= last;
  });
}

export interface PlacedEntry {
  entry: Entry;
  /** Zero-based columns within the visible days, inclusive. */
  startColumn: number;
  endColumn: number;
  /** Zero-based row so bars that share a day do not overlap. */
  lane: number;
}

/**
 * Places one aircraft's entries as bars across the visible days, stacking
 * any that overlap into separate lanes. Entries outside the days are left
 * out.
 */
export function placeEntries(
  entries: Entry[],
  firstDay: string,
  dayCount: number,
  zone: string,
): { placed: PlacedEntry[]; lanes: number } {
  const lastDay = addDays(firstDay, dayCount - 1);
  const laneEnds: number[] = [];
  const placed: PlacedEntry[] = [];
  for (const entry of entries) {
    const { first, last } = localDays(entry, zone);
    if (last < firstDay || first > lastDay) continue;
    const startColumn = Math.max(0, daysBetween(firstDay, first));
    const endColumn = Math.min(dayCount - 1, daysBetween(firstDay, last));
    let lane = laneEnds.findIndex((end) => end < startColumn);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(endColumn);
    } else {
      laneEnds[lane] = endColumn;
    }
    placed.push({ entry, startColumn, endColumn, lane });
  }
  return { placed, lanes: Math.max(1, laneEnds.length) };
}
