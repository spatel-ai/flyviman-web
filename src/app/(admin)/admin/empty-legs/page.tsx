import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyLegsQueue } from "@/features/admin-empty-legs/empty-legs-queue";

export const metadata: Metadata = { title: "Empty legs" };

export default function AdminEmptyLegsPage() {
  return (
    <>
      <h1 className="text-h2">Empty legs</h1>
      <p className="mt-2 text-muted">
        Operator offers waiting for review. An offer is shown to customers only
        after you approve it.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-40" />}>
        <EmptyLegsQueue />
      </Suspense>
    </>
  );
}
