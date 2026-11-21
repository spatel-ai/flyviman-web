import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportsView } from "@/features/admin-reports/reports-view";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Reports" };

export default function AdminReportsPage() {
  return (
    <>
      <h1 className="text-h2">Reports</h1>
      <p className="mt-2 max-w-reading text-body text-muted">
        Bookings, revenue, payments and operator performance for a period. What
        you see depends on your role.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <ForRole />
      </Suspense>
    </>
  );
}

async function ForRole() {
  const session = await getSession();
  if (!session) return null;
  return <ReportsView role={session.role} />;
}
