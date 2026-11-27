import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { TripDetail } from "@/features/trips/trip-detail";

export async function generateMetadata({
  params,
}: PageProps<"/account/trips/[reference]">): Promise<Metadata> {
  const { reference } = await params;
  return {
    title: `Trip ${reference}`,
    robots: { index: false },
  };
}

async function Detail({
  params,
}: Pick<PageProps<"/account/trips/[reference]">, "params">) {
  const { reference } = await params;
  return <TripDetail reference={reference} />;
}

export default function Page({
  params,
}: PageProps<"/account/trips/[reference]">) {
  return (
    <PageTransition>
      <Suspense fallback={<Skeleton className="h-[60rem]" />}>
        <Detail params={params} />
      </Suspense>
    </PageTransition>
  );
}
