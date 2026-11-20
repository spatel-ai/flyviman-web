import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingDetail } from "@/features/admin-bookings/booking-detail";
import { canActOnBookings } from "@/features/admin-bookings/status";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Booking" };

export default async function AdminBookingPage({
  params,
}: PageProps<"/admin/bookings/[reference]">) {
  const { reference } = await params;
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <ForRole reference={reference} />
    </Suspense>
  );
}

/** Operations and super administrators act; finance reads. */
async function ForRole({ reference }: { reference: string }) {
  const session = await getSession();
  return (
    <BookingDetail
      reference={reference}
      canAct={canActOnBookings(session?.role)}
      viewerId={session?.id}
    />
  );
}
