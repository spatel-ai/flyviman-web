import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TripConfirmation } from "@/features/trips/confirmation";

export const metadata: Metadata = {
  title: "Booking confirmation",
  robots: { index: false },
};

async function Content({
  params,
}: Pick<PageProps<"/account/trips/[reference]/itinerary">, "params">) {
  const { reference } = await params;
  return <TripConfirmation reference={reference} />;
}

export default function Page({
  params,
}: PageProps<"/account/trips/[reference]/itinerary">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Content params={params} />
    </Suspense>
  );
}
