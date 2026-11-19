import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { OfferList } from "@/features/operator-empty-legs/offers-list";

export const metadata: Metadata = { title: "Empty legs" };

export default function OperatorEmptyLegsPage() {
  return (
    <>
      <h1 className="text-h2">Empty legs</h1>
      <p className="mt-2 text-muted">
        Flights you are making anyway, offered at a lower price. An offer is
        shown to customers only after it is approved and while it is valid.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-40" />}>
        <OfferList />
      </Suspense>
    </>
  );
}
