import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingsAccess } from "@/features/operator-bookings/bookings-access";
import { BookingsList } from "@/features/operator-bookings/bookings-list";

export const metadata: Metadata = { title: "Bookings" };

export default function OperatorBookingsPage() {
  return (
    <BookingsAccess title="Bookings">
      <h1 className="text-h2">Bookings</h1>
      <p className="mt-2 max-w-prose text-muted">
        Confirmed trips on your aircraft. Mark each scheduled when it is
        arranged and completed once it has flown.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-64" />}>
        <BookingsList />
      </Suspense>
    </BookingsAccess>
  );
}
