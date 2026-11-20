"use client";

import { formatDateTime } from "@/lib/format/date";
import { holdLabel, holdMinutesLeft } from "./status";
import { useNow } from "./use-now";

/** When the hold on the aircraft lapses, and how long is left. */
export function HoldTime({ expiresAt }: { expiresAt: string | null }) {
  const now = useNow();
  if (!expiresAt) return <span className="text-muted">No hold</span>;
  const urgent = holdMinutesLeft(expiresAt, now) < 120;
  return (
    <span>
      <span className={urgent ? "font-medium text-warning" : "font-medium"}>
        {holdLabel(expiresAt, now)}
      </span>
      <span className="block text-caption text-muted">
        Answer by {formatDateTime(expiresAt)}
      </span>
    </span>
  );
}
