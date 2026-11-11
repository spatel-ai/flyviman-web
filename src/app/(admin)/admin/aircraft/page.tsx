import type { Metadata } from "next";
import { Suspense } from "react";
import { AircraftQueue } from "@/features/admin-aircraft/aircraft-queue";

export const metadata: Metadata = { title: "Aircraft" };

export default function AdminAircraftPage() {
  return (
    <>
      <h1 className="text-h2">Aircraft</h1>
      <p className="mt-2 text-muted">
        Listings waiting for a decision, and the fleet already approved.
      </p>
      <Suspense>
        <AircraftQueue />
      </Suspense>
    </>
  );
}
