import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { ScheduledResults } from "@/features/scheduled-search/scheduled-results";

export const metadata: Metadata = {
  title: "Scheduled flights",
  robots: { index: false },
};

// The search is known only at request time, so it is read inside Suspense.
async function Results({
  params,
}: Pick<PageProps<"/search/scheduled/[searchId]">, "params">) {
  const { searchId } = await params;
  return <ScheduledResults searchId={searchId} />;
}

export default function Page({
  params,
}: PageProps<"/search/scheduled/[searchId]">) {
  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-wide px-4 py-16 md:px-6 md:py-16">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <Results params={params} />
        </Suspense>
      </div>
    </PageTransition>
  );
}
