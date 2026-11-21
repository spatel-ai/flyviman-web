import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FinanceOnly } from "@/features/admin-finance/notes";
import { SettlementsList } from "@/features/admin-finance/settlements-list";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Settlements" };

export default function AdminSettlementsPage() {
  return (
    <>
      <h1 className="text-h2">Settlements</h1>
      <p className="mt-2 max-w-reading text-body text-muted">
        What Flyviman owes each operator for a completed booking: the money kept
        less commission and tax. Pay by bank transfer, then record the transfer
        reference here. Every change needs a reason, kept in the audit record.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <ForRole />
      </Suspense>
    </>
  );
}

/** Finance and super admins see settlements; operations get the note at once. */
async function ForRole() {
  const session = await getSession();
  if (session?.role !== "FINANCE_ADMIN" && session?.role !== "SUPER_ADMIN") {
    return <FinanceOnly />;
  }
  return <SettlementsList />;
}
