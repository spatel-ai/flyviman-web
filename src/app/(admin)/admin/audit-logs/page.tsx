import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditList } from "@/features/admin-audit/audit-list";

export const metadata: Metadata = { title: "Audit log" };

export default function AdminAuditLogsPage() {
  return (
    <>
      <h1 className="text-h2">Audit log</h1>
      <p className="mt-2 max-w-reading text-body text-muted">
        Who changed what and when, newest first. Times are Indian time.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <AuditList />
      </Suspense>
    </>
  );
}
