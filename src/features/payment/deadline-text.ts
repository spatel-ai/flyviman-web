import { formatDateTime } from "@/lib/format/date";

export interface PayDeadline {
  /** "Pay by 12 Nov 2026, 3:30 pm IST", or the lapsed notice. */
  label: string;
  /** "2 days 3 hours left"; null once the deadline has passed. */
  remaining: string | null;
  expired: boolean;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

/** Time left, to the minute, in the two largest units that apply. */
export function timeLeft(ms: number): string {
  if (ms < MINUTE) return "less than a minute left";
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  const minutes = Math.floor((ms % HOUR) / MINUTE);
  if (days > 0) return `${plural(days, "day")} ${plural(hours, "hour")} left`;
  if (hours > 0) {
    return `${plural(hours, "hour")} ${plural(minutes, "minute")} left`;
  }
  return `${plural(minutes, "minute")} left`;
}

/**
 * When an unpaid booking's hold on the aircraft lapses (`holdExpiresAt`),
 * in India time, and how long is left. Null when the booking has no hold.
 */
export function payDeadline(
  holdExpiresAt: string | null | undefined,
  now: number,
): PayDeadline | null {
  if (!holdExpiresAt) return null;
  const at = Date.parse(holdExpiresAt);
  if (Number.isNaN(at)) return null;
  if (at <= now) {
    return {
      label: `The payment deadline passed on ${formatDateTime(holdExpiresAt)}`,
      remaining: null,
      expired: true,
    };
  }
  return {
    label: `Pay by ${formatDateTime(holdExpiresAt)}`,
    remaining: timeLeft(at - now),
    expired: false,
  };
}
