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
import { useOperatorApproved } from "./use-operator-approved";

type Summary = Schemas["AircraftSummaryResponseDto"];

export function FleetList() {
  const approved = useOperatorApproved();
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
      {approved === false ? (
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
        <EmptyState
          title="No aircraft yet"
          description="Add your first aircraft, then submit it for review."
        />
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
                    href={`/operator/aircraft/${item.id}`}
                    className="text-title text-accent hover:underline"
                  >
                    {item.registration}
                  </Link>
                  <p className="text-body-sm text-muted">
                    {item.manufacturer} {item.model} · {item.passengerCapacity}{" "}
                    passengers
                  </p>
                </div>
                <StatusBadge kind="operator" status={item.listingStatus} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
