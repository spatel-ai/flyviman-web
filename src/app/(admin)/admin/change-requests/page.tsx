import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangeRequestsList } from "@/features/admin-bookings/change-requests-list";
import { canActOnBookings } from "@/features/admin-bookings/status";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Change requests" };

export default function AdminChangeRequestsPage() {
  return (
    <>
      <h1 className="text-h2">Change requests</h1>
      <p className="mt-2 max-w-reading text-body text-muted">
        Changes and cancellations customers have asked for, waiting for an
        answer. The customer sees your note.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-72" />}>
        <ForRole />
      </Suspense>
    </>
  );
}

/** Operations and super administrators answer change requests; others go back. */
async function ForRole() {
  const session = await getSession();
  if (!canActOnBookings(session?.role)) redirect("/admin");
  return <ChangeRequestsList />;
}
