import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingsList } from "@/features/admin-bookings/bookings-list";

export const metadata: Metadata = { title: "Bookings" };

export default function AdminBookingsPage() {
  return (
    <>
      <h1 className="text-h2">Bookings</h1>
      <p className="mt-2 max-w-reading text-body text-muted">
        Every booking, newest first. Booking status and payment status are
        separate: a payment never confirms a booking by itself.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <BookingsList />
      </Suspense>
    </>
  );
}
