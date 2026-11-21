import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FinanceOnly } from "@/features/admin-finance/notes";
import { ReconciliationReport } from "@/features/admin-finance/reconciliation-report";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Reconciliation" };

export default function AdminReconciliationPage() {
  return (
    <>
      <h1 className="text-h2">Reconciliation</h1>
      <p className="mt-2 max-w-reading text-body text-muted">
        Payments received, refunds, bookings and operator settlements for a
        period, and anything that does not agree. Built from Flyviman&apos;s own
        records; compare the totals with the payment provider&apos;s dashboard.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <ForRole />
      </Suspense>
    </>
  );
}

/** Finance and super admins see the report; operations get the note at once. */
async function ForRole() {
  const session = await getSession();
  if (session?.role !== "FINANCE_ADMIN" && session?.role !== "SUPER_ADMIN") {
    return <FinanceOnly />;
  }
  return <ReconciliationReport />;
}
