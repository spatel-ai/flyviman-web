import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EnquiriesList } from "@/features/admin-enquiries/enquiries-list";

export const metadata: Metadata = { title: "Enquiries" };

export default function AdminEnquiriesPage() {
  return (
    <>
      <h1 className="text-h2">Enquiries</h1>
      <p className="mt-2 max-w-reading text-body text-muted">
        Messages sent from the contact page, newest first.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <EnquiriesList />
      </Suspense>
    </>
  );
}
