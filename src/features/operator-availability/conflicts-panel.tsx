"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { LoadError } from "@/components/shared/load-error";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatTimeRange, utcToLocal } from "@/lib/format/zoned";

type Conflict = Schemas["SoftHoldConflictDto"];

/**
 * Current soft holds that overlap on the same aircraft. Overlaps are allowed
 * (two customers may be considering the same time); the operator resolves
 * them. Shown only when there is something to resolve.
 */
export function ConflictsPanel({
  registrations,
  zones,
}: {
  registrations: Map<string, string>;
  zones: Map<string, string>;
}) {
  const conflicts = useQuery({
    queryKey: queryKeys.availabilityConflicts,
    queryFn: () => apiFetch<Conflict[]>("operator/availability/conflicts"),
  });
  if (conflicts.isError) {
    return (
      <LoadError
        what="overlapping soft holds"
        error={conflicts.error}
        onRetry={() => void conflicts.refetch()}
      />
    );
  }
  const pairs = conflicts.data?.data ?? [];
  if (pairs.length === 0) return null;

  return (
    <Card variant="flat" className="border border-warning/40">
      <section aria-labelledby="conflicts-heading">
        <h2 id="conflicts-heading" className="text-title">
          Overlapping soft holds ({pairs.length})
        </h2>
        <p className="mt-1 text-body-sm text-muted">
          Two holds cover the same time on one aircraft. Keep the one you can
          fly and remove the other.
        </p>
        <ul className="mt-3 flex flex-col gap-2 text-body-sm">
          {pairs.map((pair) => {
            const zone = zones.get(pair.aircraftId) ?? "Asia/Kolkata";
            const registration =
              registrations.get(pair.aircraftId) ?? "Aircraft";
            const day = utcToLocal(pair.hold.startsAt, zone).date;
            return (
              <li
                key={`${pair.hold.id}-${pair.overlaps.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1"
              >
                <span className="font-medium">{registration}</span>
                <span>
                  {formatTimeRange(pair.hold.startsAt, pair.hold.endsAt, zone)}{" "}
                  overlaps{" "}
                  {formatTimeRange(
                    pair.overlaps.startsAt,
                    pair.overlaps.endsAt,
                    zone,
                  )}
                </span>
                <Link
                  href={`/operator/availability/${encodeURIComponent(pair.aircraftId)}?view=week&date=${day}`}
                  className="text-accent hover:underline"
                >
                  Open calendar
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </Card>
  );
}
