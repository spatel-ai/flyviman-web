import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt } from "@/features/trips/receipt";

export const metadata: Metadata = {
  title: "Receipt",
  robots: { index: false },
};

async function Content({
  params,
}: Pick<PageProps<"/account/trips/[reference]/receipts/[payment]">, "params">) {
  const { reference, payment } = await params;
  return <Receipt bookingReference={reference} paymentReference={payment} />;
}

export default function Page({
  params,
}: PageProps<"/account/trips/[reference]/receipts/[payment]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Content params={params} />
    </Suspense>
  );
}
