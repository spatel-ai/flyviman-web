"use client";

import { useSyncExternalStore } from "react";
import { payDeadline } from "./deadline-text";

const MINUTE = 60_000;

function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, MINUTE);
  return () => window.clearInterval(timer);
}

/**
 * The clock to the minute, read in the browser only: 0 on the server and
 * during hydration, so the server's text and the first client render match.
 */
function useMinuteClock(): number {
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / MINUTE) * MINUTE,
    () => 0,
  );
}

/**
 * The payment deadline: the date, the time left, and once it has passed
 * what that means. Plain text, not a live region, so a screen reader is not
 * interrupted as the minutes go by.
 */
export function PayDeadline({
  holdExpiresAt,
  status,
}: {
  holdExpiresAt: string | null | undefined;
  /** Only an `AWAITING_PAYMENT` booking has a pay-by time: a balance due on a
   * confirmed booking is held until the trip ends. */
  status: string;
}) {
  const now = useMinuteClock();
  // Before the clock is read only the absolute "Pay by" time shows (it does
  // not depend on now); the time left follows once the page is live.
  const deadline =
    status === "AWAITING_PAYMENT" ? payDeadline(holdExpiresAt, now) : null;
  if (!deadline) return null;
  const remaining = now === 0 ? "\u00a0" : deadline.remaining;
  return (
    <div className="flex flex-col gap-1" data-testid="pay-deadline">
      <p className="text-body-sm font-medium">{deadline.label}</p>
      {remaining ? (
        <p className="text-body-sm text-muted tabular-nums">{remaining}</p>
      ) : (
        <p className="text-body-sm text-muted">
          We check the trip is still available when you pay. If it is not,
          nothing is charged.
        </p>
      )}
    </div>
  );
}
