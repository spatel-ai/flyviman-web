import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdministratorOnly } from "@/features/operator-staff/administrator-only";
import type { Schemas } from "@/lib/api/types";
import { serverGet } from "@/lib/auth/server-api";
import { can } from "@/lib/operator-access";

export const metadata: Metadata = { title: "Availability" };

// The timeline is a large client component: load it only on this page.
const FleetTimeline = dynamic(
  () =>
    import("@/features/operator-availability/fleet-timeline").then(
      (module) => module.FleetTimeline,
    ),
  { loading: () => <Skeleton className="mt-6 h-96" /> },
);

export default async function OperatorAvailabilityPage() {
  const { data: operator } =
    await serverGet<Schemas["OperatorMeResponseDto"]>("operator/me");
  // The timeline needs "manage availability", as the API does; staff see
  // only the aircraft assigned to them.
  if (!can(operator.access, "MANAGE_AVAILABILITY")) {
    return <AdministratorOnly title="Availability" />;
  }
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
