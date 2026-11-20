import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { RequestFlow } from "@/features/booking-request/request-flow";

export const metadata: Metadata = {
  title: "Request this flight",
  robots: { index: false },
};

async function Flow({
  params,
}: Pick<PageProps<"/book/[searchId]/[resultId]">, "params">) {
  const { searchId, resultId } = await params;
  return <RequestFlow searchId={searchId} resultId={resultId} />;
}

export default function Page({
  params,
}: PageProps<"/book/[searchId]/[resultId]">) {
  return (
    <PageTransition>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Flow params={params} />
      </Suspense>
    </PageTransition>
  );
}
