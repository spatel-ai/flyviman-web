import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchResults } from "@/features/search/search-results";

export const metadata: Metadata = {
  title: "Search results",
  robots: { index: false },
};

// The search is known only at request time, so it is read inside Suspense.
async function Results({
  params,
}: Pick<PageProps<"/search/[searchId]">, "params">) {
  const { searchId } = await params;
  return <SearchResults searchId={searchId} />;
}

export default function Page({ params }: PageProps<"/search/[searchId]">) {
  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-wide px-4 py-12 md:px-6 md:py-16">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <Results params={params} />
        </Suspense>
      </div>
    </PageTransition>
  );
}
