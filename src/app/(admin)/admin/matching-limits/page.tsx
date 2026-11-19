import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchingLimits } from "@/features/admin-matching-limits/matching-limits";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Matching limits" };

export default function AdminMatchingLimitsPage() {
  return (
    <>
      <h1 className="text-h2">Matching limits</h1>
      <p className="mt-2 max-w-reading text-body text-muted">
        Which trips an aircraft is offered for: leg length, runway, notice and
        landing sites. A change applies to new searches only; each is kept in
        the audit record with its reason.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <LimitsForRole />
      </Suspense>
    </>
  );
}

/** Operations and super admins change limits; finance reads them. */
async function LimitsForRole() {
  const session = await getSession();
  return (
    <MatchingLimits
      canEdit={session?.role === "OPS" || session?.role === "SUPER_ADMIN"}
    />
  );
}
