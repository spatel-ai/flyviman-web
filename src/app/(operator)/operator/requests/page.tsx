import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RequestsAccess } from "@/features/operator-requests/requests-access";
import { RequestsList } from "@/features/operator-requests/requests-list";

export const metadata: Metadata = { title: "Requests" };

export default function OperatorRequestsPage() {
  return (
    <RequestsAccess title="Requests">
      <h1 className="text-h2">Requests</h1>
      <p className="mt-2 max-w-prose text-muted">
        Customers&apos; requests for your aircraft. Answer before the hold
        lapses, or the request closes.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-64" />}>
        <RequestsList />
      </Suspense>
    </RequestsAccess>
  );
}
