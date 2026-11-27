import type { Metadata } from "next";
import { BookingDetail } from "@/features/operator-bookings/booking-detail";
import { BookingsAccess } from "@/features/operator-bookings/bookings-access";

export async function generateMetadata({
  params,
}: PageProps<"/operator/bookings/[reference]">): Promise<Metadata> {
  const { reference } = await params;
  return {
    title: `Booking ${reference}`,
  };
}

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
