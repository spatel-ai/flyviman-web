import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ManagedByFinance,
  RulesList,
} from "@/features/admin-pricing/rules-list";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Pricing rules" };

export default function AdminPricingRulesPage() {
  return (
    <>
      <h1 className="text-h2">Pricing rules</h1>
      <p className="mt-2 max-w-reading text-body text-muted">
        Commission, tax and the defaults every estimate is built from. A change
        is a new version and applies to new estimates only; each is kept in the
        audit record with its reason.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <RulesForRole />
      </Suspense>
    </>
  );
}

/** Finance and super admins manage rules; operations get the note at once. */
async function RulesForRole() {
  const session = await getSession();
  return session?.role === "FINANCE_ADMIN" ||
    session?.role === "SUPER_ADMIN" ? (
    <RulesList />
  ) : (
    <ManagedByFinance />
  );
}
