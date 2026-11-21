import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyLegRequest } from "@/features/booking-request/empty-leg-request";

export const metadata: Metadata = {
  title: "Request this empty leg",
  robots: { index: false },
};

async function Flow({
  params,
}: Pick<PageProps<"/book/empty-leg/[id]">, "params">) {
  const { id } = await params;
  return <EmptyLegRequest id={id} />;
}

export default function Page({ params }: PageProps<"/book/empty-leg/[id]">) {
  return (
    <PageTransition>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Flow params={params} />
      </Suspense>
    </PageTransition>
  );
}
