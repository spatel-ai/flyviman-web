import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangeRequestsList } from "@/features/admin-bookings/change-requests-list";

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
        <ChangeRequestsList />
      </Suspense>
    </>
  );
}
