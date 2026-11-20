import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { PayPage } from "@/features/payment/pay-page";

export const metadata: Metadata = { title: "Pay", robots: { index: false } };

async function Pay({
  params,
}: Pick<PageProps<"/account/trips/[reference]/pay">, "params">) {
  const { reference } = await params;
  return <PayPage reference={reference} />;
}

export default function Page({
  params,
}: PageProps<"/account/trips/[reference]/pay">) {
  return (
    <PageTransition>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Pay params={params} />
      </Suspense>
    </PageTransition>
  );
}
