import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FinanceOnly, NotAvailableYet } from "@/features/admin-finance/notes";
import { RefundsQueue } from "@/features/admin-finance/refunds-queue";
import { FINANCE_ROUTES_READY } from "@/lib/api/payments";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Refunds" };

export default function AdminRefundsPage() {
  return (
    <>
      <h1 className="text-h2">Refunds</h1>
      <p className="mt-2 max-w-reading text-body text-muted">
        Refunds owed after a cancellation, oldest first. Starting one needs a
        reason, which is kept in the audit record.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <ForRole />
      </Suspense>
    </>
  );
}

/** Finance and super admins see refunds; operations get the note at once. */
async function ForRole() {
  const session = await getSession();
  if (session?.role !== "FINANCE_ADMIN" && session?.role !== "SUPER_ADMIN") {
    return <FinanceOnly />;
  }
  return FINANCE_ROUTES_READY ? (
    <RefundsQueue />
  ) : (
    <NotAvailableYet what="Refunds" />
  );
}
