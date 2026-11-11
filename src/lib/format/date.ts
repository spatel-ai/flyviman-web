/**
 * Formats a UTC timestamp in a given IANA time zone, with the zone shown:
 * "12 Nov 2026, 3:30 pm IST". Times are always shown in the local time of
 * the place they refer to, never silently in the viewer's zone.
 */
export function formatDateTime(
  iso: string,
  timeZone: string = "Asia/Kolkata",
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Not a valid timestamp: ${iso}`);
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(date);
}
