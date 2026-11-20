import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FinanceOnly } from "@/features/admin-finance/notes";
import { PaymentsList } from "@/features/admin-finance/payments-list";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Payments" };

export default function AdminPaymentsPage() {
  return (
    <>
      <h1 className="text-h2">Payments</h1>
      <p className="mt-2 max-w-reading text-body text-muted">
        Every payment attempt, newest first. A payment is settled by the payment
        provider&apos;s confirmed notice, never by the customer&apos;s browser.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <ForRole />
      </Suspense>
    </>
  );
}

/** Finance and super admins see payments; operations get the note at once. */
async function ForRole() {
  const session = await getSession();
  if (session?.role !== "FINANCE_ADMIN" && session?.role !== "SUPER_ADMIN") {
    return <FinanceOnly />;
  }
  return <PaymentsList />;
}
