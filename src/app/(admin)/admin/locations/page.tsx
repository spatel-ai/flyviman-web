import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LocationsList } from "@/features/admin-locations/locations-list";

export const metadata: Metadata = { title: "Locations" };

export default function AdminLocationsPage() {
  return (
    <>
      <h1 className="text-h2">Locations</h1>
      <p className="mt-2 max-w-reading text-body text-muted">
        Airports, heliports and landing sites used for search and pricing.
        Deactivating a location hides it from customers.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <LocationsList />
      </Suspense>
    </>
  );
}
