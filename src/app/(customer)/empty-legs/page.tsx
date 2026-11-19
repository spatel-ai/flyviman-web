import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyLegsList } from "@/features/empty-legs/empty-legs-list";

export const metadata: Metadata = {
  title: "Empty legs",
  description:
    "Flights an operator is already making with no passengers, offered at a lower price. Each offer states what kind of price it is and its conditions.",
};

export default function Page() {
  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-wide px-4 py-16 md:px-6">
        <h1 className="text-h2">Empty legs</h1>
        <p className="mt-2 max-w-reading text-muted">
          A flight an operator is making anyway, with seats to spare. Offers
          change as operators plan; each shows its price type and conditions.
        </p>
        {/* Filters are read from the address, so the list is streamed. */}
        <Suspense fallback={<Skeleton className="mt-8 h-96" />}>
          <EmptyLegsList />
        </Suspense>
      </div>
    </PageTransition>
  );
}
