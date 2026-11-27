"use client";

import { useEffect, useState } from "react";
import { payDeadline } from "./deadline-text";

/** The clock, refreshed once a minute: enough for a time shown in minutes. */
function useMinuteClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/**
 * The payment deadline: the date, the time left, and once it has passed
 * what that means. Plain text, not a live region, so a screen reader is not
 * interrupted as the minutes go by.
 */
export function PayDeadline({
  holdExpiresAt,
}: {
  holdExpiresAt: string | null | undefined;
}) {
  const now = useMinuteClock();
  const deadline = payDeadline(holdExpiresAt, now);
  if (!deadline) return null;
  return (
    <div className="flex flex-col gap-1" data-testid="pay-deadline">
      <p className="text-body-sm font-medium">{deadline.label}</p>
      {deadline.remaining ? (
        <p className="text-body-sm text-muted tabular-nums">
          {deadline.remaining}
        </p>
      ) : (
        <p className="text-body-sm text-muted">
          We check the trip is still available when you pay. If it is not,
          nothing is charged.
        </p>
      )}
    </div>
  );
}
