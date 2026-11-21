import type { Metadata } from "next";
import { BookingDetail } from "@/features/operator-bookings/booking-detail";
import { BookingsAccess } from "@/features/operator-bookings/bookings-access";

export const metadata: Metadata = { title: "Booking" };

export default async function OperatorBookingPage({
  params,
}: PageProps<"/operator/bookings/[reference]">) {
  const { reference } = await params;
  return (
    <BookingsAccess title="Booking" approvedOnly={false}>
      <BookingDetail reference={reference} />
    </BookingsAccess>
  );
}
