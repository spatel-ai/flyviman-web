"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { MedicalDetails } from "@/components/shared/air-ambulance/medical-details";
import {
  AirAmbulanceStatusBadge,
  AirAmbulanceTimeline,
} from "@/components/shared/air-ambulance/status";
import { LoadError } from "@/components/shared/load-error";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { isNotFoundError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";

type Mission = Schemas["OperatorAirAmbulanceRequestDto"];

/**
 * One mission for the selected operator's administrator: route, places and
 * medical details. Each load is a medical read the API audits, so nothing
 * is kept once the page closes.
 */
export function MissionDetail({ reference }: { reference: string }) {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.operatorAirAmbulanceRequest(reference),
    queryFn: () =>
      apiFetch<Mission>(
        `operator/air-ambulance/requests/${encodeURIComponent(reference)}`,
      ),
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (isError && isNotFoundError(error)) {
    return (
      <RecordNotFound
        title="Mission not found"
        description="This mission does not exist, or it is not one you were selected for."
        backHref="/operator/air-ambulance"
        backLabel="Back to air ambulance"
      />
    );
  }
  if (isError) {
    return (
      <LoadError
        what="this mission"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }
  if (isPending) {
    return (
      <>
        <p role="status" className="sr-only">
          Loading the mission
        </p>
        <Skeleton className="h-96" />
      </>
    );
  }

  const mission = data.data;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/operator/air-ambulance"
          className="text-body-sm text-accent hover:underline"
        >
          Air ambulance
        </Link>
        <h1 className="mt-2 text-h2 tabular-nums">{mission.reference}</h1>
        <div className="mt-2">
          <AirAmbulanceStatusBadge status={mission.status} />
        </div>
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-title">Journey</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-body-sm text-muted">Route</dt>
            <dd>
              {mission.originName ?? "Unknown"} to{" "}
              {mission.destinationName ?? "unknown"}
            </dd>
          </div>
          <div>
            <dt className="text-body-sm text-muted">Preferred time</dt>
            <dd>{formatDateTime(mission.preferredAt)}</dd>
          </div>
          <div>
            <dt className="text-body-sm text-muted">Collection address</dt>
            <dd className="break-words">
              {mission.pickupAddress ?? "Not given"}
            </dd>
          </div>
          <div>
            <dt className="text-body-sm text-muted">Receiving facility</dt>
            <dd className="break-words">
              {mission.destinationFacility ?? "Not given"}
            </dd>
          </div>
          <div>
            <dt className="text-body-sm text-muted">Travelling</dt>
            <dd>
              {mission.patientCount} patient(s), {mission.accompanyingPersons}{" "}
              with them
            </dd>
          </div>
        </dl>
        <p className="text-body-sm text-muted">
          Flyviman operations coordinate with the customer and will contact you
          about the mission.
        </p>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-title">Medical details</h2>
        {mission.medical ? (
          <MedicalDetails medical={mission.medical} />
        ) : (
          <p className="text-body-sm text-muted">
            No medical details recorded.
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-title">Timeline</h2>
        <AirAmbulanceTimeline entries={mission.timeline} />
      </Card>
    </div>
  );
}
