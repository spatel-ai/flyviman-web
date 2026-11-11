import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { OperatorsList } from "@/features/admin-operators/operators-list";

export const metadata: Metadata = { title: "Operators" };

export default function AdminOperatorsPage() {
  return (
    <>
      <h1 className="text-h2">Operators</h1>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <OperatorsList />
      </Suspense>
    </>
  );
}
