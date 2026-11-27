import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { SearchInfoSections } from "@/features/search-landing/info-sections";
import { SearchLandingSkeleton } from "@/features/search-landing/search-landing-skeleton";
import { SearchLanding } from "@/features/search-landing/search-landing";

export const metadata: Metadata = {
  title: "Search private jets and helicopters",
  description:
    "Compare approved private jets, turboprops and helicopters for your trip, each with a clear estimate.",
};

export default function Page() {
  return (
    <PageTransition>
      {/* The landing reads ?service= from the address, so it is streamed. */}
      <Suspense fallback={<SearchLandingSkeleton />}>
        <SearchLanding />
      </Suspense>
      <SearchInfoSections />
    </PageTransition>
  );
}
