import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FinanceOnly } from "@/features/admin-finance/notes";
import { RefundsQueue } from "@/features/admin-finance/refunds-queue";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Refunds" };

export default function AdminRefundsPage() {
  return (
    <>
      <h1 className="text-h2">Refunds</h1>
      <p className="mt-2 max-w-reading text-body text-muted">
        Money owed back, oldest first, and the refunds already started. Starting
        one needs a reason, which is kept in the audit record.
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
  return <RefundsQueue />;
}
