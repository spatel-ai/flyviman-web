import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { isUuid } from "@/lib/utils";

export const metadata: Metadata = { title: "Aircraft availability" };

const AircraftCalendar = dynamic(
  () =>
    import("@/features/operator-availability/aircraft-calendar").then(
      (module) => module.AircraftCalendar,
    ),
  { loading: () => <Skeleton className="h-96" /> },
);

export default async function AircraftAvailabilityPage({
  params,
}: PageProps<"/operator/availability/[aircraftId]">) {
  const { aircraftId } = await params;
  // Only a UUID may reach the API path built from this id.
  if (!isUuid(aircraftId)) notFound();
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <AircraftCalendar id={aircraftId} />
    </Suspense>
  );
}
