import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { ResultDetail } from "@/features/search/result-detail";

export const metadata: Metadata = {
  title: "Aircraft estimate",
  robots: { index: false },
};

async function Detail({
  params,
}: Pick<PageProps<"/search/[searchId]/[resultId]">, "params">) {
  const { searchId, resultId } = await params;
  return <ResultDetail searchId={searchId} resultId={resultId} />;
}

export default function Page({
  params,
}: PageProps<"/search/[searchId]/[resultId]">) {
  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-reading px-4 py-12 md:px-6 md:py-16">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <Detail params={params} />
        </Suspense>
      </div>
    </PageTransition>
  );
}
