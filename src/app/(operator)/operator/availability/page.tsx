import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Availability" };

// The timeline is a large client component: load it only on this page.
const FleetTimeline = dynamic(
  () =>
    import("@/features/operator-availability/fleet-timeline").then(
      (module) => module.FleetTimeline,
    ),
  { loading: () => <Skeleton className="mt-6 h-96" /> },
);

export default function OperatorAvailabilityPage() {
  return (
    <>
      <h1 className="text-h2">Availability</h1>
      <p className="mt-2 text-muted">
        When each aircraft is offered, and when it is held or grounded. Choose a
        day to add time; choose an entry to change or remove it.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <FleetTimeline />
      </Suspense>
    </>
  );
}
