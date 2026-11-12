/**
 * Calendar arithmetic in an airport's time zone, with `Intl` only (no date
 * library). Calendar days are plain "YYYY-MM-DD" strings; instants are UTC
 * ISO strings ending in `Z`, which is what the API takes and returns.
 */

const DAY_MS = 86_400_000;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsIn(instant: Date, zone: string) {
  let format = partsFormatters.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    partsFormatters.set(zone, format);
  }
  const parts: Record<string, number> = {};
  for (const part of format.formatToParts(instant)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return parts as Record<
    "year" | "month" | "day" | "hour" | "minute" | "second",
    number
  >;
}

/** Minutes the zone is ahead of UTC at that instant (IST: 330). */
export function zoneOffsetMinutes(instant: Date, zone: string): number {
  const p = partsIn(instant, zone);
  const asUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
  );
  const whole = Math.floor(instant.getTime() / 1000) * 1000;
  return Math.round((asUtc - whole) / 60_000);
}

/**
 * A wall-clock date and time in the zone, as a UTC ISO string. A time that
 * does not exist (skipped by a daylight-saving change) resolves to the hour
 * before the change; India has no daylight saving, so this is accepted.
 */
export function localToUtc(date: string, time: string, zone: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  // Two passes settle the offset on either side of a daylight-saving change.
  let guess = wall - zoneOffsetMinutes(new Date(wall), zone) * 60_000;
  guess = wall - zoneOffsetMinutes(new Date(guess), zone) * 60_000;
  return new Date(guess).toISOString();
}

/** The zone's calendar day and wall-clock time of a UTC instant. */
export function utcToLocal(
  iso: string,
  zone: string,
): { date: string; time: string } {
  const p = partsIn(new Date(iso), zone);
  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
    time: `${pad(p.hour)}:${pad(p.minute)}`,
  };
}

/** Today's calendar day in the zone. */
export function todayIn(zone: string, now: Date = new Date()): string {
  return utcToLocal(now.toISOString(), zone).date;
}

/** Midnight at the start of a calendar day in the zone, as UTC. */
export function dayStartUtc(date: string, zone: string): string {
  return localToUtc(date, "00:00", zone);
}

function asUtcDay(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/** A calendar day moved by whole days. */
export function addDays(date: string, days: number): string {
  return new Date(asUtcDay(date).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Whole days from one calendar day to another. */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (asUtcDay(to).getTime() - asUtcDay(from).getTime()) / DAY_MS,
  );
}

/** The Monday on or before a calendar day. */
export function weekStart(date: string): string {
  const weekday = (asUtcDay(date).getUTCDay() + 6) % 7; // Monday = 0
  return addDays(date, -weekday);
}

/** The first day of the day's month. */
export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/** The same day of the next or previous month (clamped to day 1). */
export function addMonths(date: string, months: number): string {
  const [year, month] = date.split("-").map(Number);
  const moved = new Date(Date.UTC(year, month - 1 + months, 1));
  return moved.toISOString().slice(0, 10);
}

/**
 * The 42 days (six weeks, Monday first) a month view shows for the month of
 * `date`, starting on the Monday on or before the first.
 */
export function monthGrid(date: string): string[] {
  const first = weekStart(monthStart(date));
  return Array.from({ length: 42 }, (_, index) => addDays(first, index));
}

/** `count` consecutive days from `from`. */
export function daysFrom(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDays(from, index));
}

/** The zone's short name at an instant, for example "IST". */
export function zoneName(zone: string, instant: Date = new Date()): string {
  const part = new Intl.DateTimeFormat("en-IN", {
    timeZone: zone,
    timeZoneName: "short",
  })
    .formatToParts(instant)
    .find((item) => item.type === "timeZoneName");
  return part?.value ?? zone;
}

const dayFormat = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** A calendar day as "Mon, 16 Nov". */
export function formatCalendarDay(date: string): string {
  return dayFormat.format(asUtcDay(date));
}

const monthFormat = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** A month as "November 2026". */
export function formatMonth(date: string): string {
  return monthFormat.format(asUtcDay(date));
}

const shortDay = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/**
 * A span in the zone's local time with its zone name: "18 Nov, 10:00–14:00
 * IST", or "18 Nov 22:00 – 19 Nov 02:00 IST" across midnight.
 */
export function formatTimeRange(
  startsAt: string,
  endsAt: string,
  zone: string,
): string {
  const start = utcToLocal(startsAt, zone);
  const end = utcToLocal(endsAt, zone);
  const name = zoneName(zone, new Date(startsAt));
  const startDay = shortDay.format(asUtcDay(start.date));
  if (start.date === end.date) {
    return `${startDay}, ${start.time}–${end.time} ${name}`;
  }
  const endDay = shortDay.format(asUtcDay(end.date));
  return `${startDay} ${start.time} – ${endDay} ${end.time} ${name}`;
}
