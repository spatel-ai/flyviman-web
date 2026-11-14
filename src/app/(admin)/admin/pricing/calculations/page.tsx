import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CalculationsList } from "@/features/admin-pricing/calculations-list";

export const metadata: Metadata = { title: "Price calculations" };

export default function AdminPriceCalculationsPage() {
  return (
    <>
      <h1 className="text-h2">Price calculations</h1>
      <p className="mt-2 max-w-reading text-body text-muted">
        Every estimate shown to a customer, with the inputs and rule versions it
        was made from, newest first.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <CalculationsList />
      </Suspense>
    </>
  );
}
