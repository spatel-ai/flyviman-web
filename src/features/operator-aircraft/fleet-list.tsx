"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { useOperatorAccess, useOperatorApproved } from "@/lib/operator";
import { isOperatorAdmin } from "@/lib/operator-access";

type Summary = Schemas["AircraftSummaryResponseDto"];

export function FleetList() {
  const approved = useOperatorApproved();
  // Only administrators add aircraft; staff see those assigned to them.
  const access = useOperatorAccess();
  const admin = isOperatorAdmin(access);
  const fleet = useQuery({
    queryKey: queryKeys.operatorAircraft,
    queryFn: () => apiFetch<Summary[]>("operator/aircraft"),
  });

  if (fleet.isPending) {
    return <Skeleton className="mt-6 h-40" />;
  }
  if (fleet.isError) {
    return (
      <p className="mt-6 text-danger" role="alert">
        {messageFor(fleet.error)}
      </p>
    );
  }

  const aircraft = fleet.data.data;
  return (
    <div className="mt-6 flex flex-col gap-4">
      {/* Administrator notices only once the role is known (no flash for staff). */}
      {!access || !admin ? null : approved === false ? (
        <p className="text-body-sm text-muted">
          Your organisation is not approved at the moment, so you cannot add
          aircraft. You can still take an aircraft out of service.
        </p>
      ) : approved ? (
        <div>
          <Link href="/operator/aircraft/new" className={buttonClasses({})}>
            Add an aircraft
          </Link>
        </div>
      ) : null}
      {aircraft.length === 0 ? (
        !access ? null : !admin ? (
          <EmptyState
            title="No aircraft assigned to you yet"
            description="Your administrator chooses which aircraft you manage."
          />
        ) : (
          <EmptyState
            title="No aircraft yet"
            description="Add your first aircraft, then submit it for review."
          />
        )
      ) : (
        <ul className="flex flex-col gap-3">
          {aircraft.map((item) => (
            <li key={item.id}>
              <Card
                variant="raised"
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <Link
                    href={`/operator/aircraft/${encodeURIComponent(item.id)}`}
                    className="text-title text-accent hover:underline"
                  >
                    {item.registration}
                  </Link>
                  <p className="text-body-sm text-muted">
                    {item.manufacturer} {item.model} · {item.passengerCapacity}{" "}
                    passengers
                    {item.homeBase
                      ? ` · ${item.homeBase.code ?? item.homeBase.name}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge kind="aircraft" status={item.listingStatus} />
                  <StatusBadge
                    kind="availability"
                    status={item.availabilityStatus}
                  />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
