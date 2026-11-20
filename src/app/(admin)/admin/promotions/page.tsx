import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ManagedByFinanceNote,
  PromotionsList,
} from "@/features/admin-promotions/promotions-list";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Promotions" };

export default function AdminPromotionsPage() {
  return (
    <>
      <h1 className="text-h2">Promotions</h1>
      <p className="mt-2 max-w-reading text-body text-muted">
        Codes customers enter on a trip for a discount Flyviman funds. Each is
        created and ended with a reason kept in the audit record; automatic
        discounts for everyone are the Discount pricing rule.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <PromotionsForRole />
      </Suspense>
    </>
  );
}

/** Finance and super admins manage codes; others get the note at once. */
async function PromotionsForRole() {
  const session = await getSession();
  return session?.role === "FINANCE_ADMIN" ||
    session?.role === "SUPER_ADMIN" ? (
    <PromotionsList />
  ) : (
    <ManagedByFinanceNote />
  );
}
