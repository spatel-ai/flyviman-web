import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleMatrixView } from "@/features/admin-roles/role-matrix-view";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Roles and permissions" };

export default function AdminRolesPage() {
  return (
    <>
      <h1 className="text-h2">Roles and permissions</h1>
      <p className="mt-2 max-w-reading text-body text-muted">
        What each role may do, as the platform enforces it. Read-only.
      </p>
      <Suspense fallback={<Skeleton className="mt-8 h-96" />}>
        <MatrixForRole />
      </Suspense>
    </>
  );
}

/** Super administrators read the matrix; other roles get the note at once. */
async function MatrixForRole() {
  const session = await getSession();
  return session?.role === "SUPER_ADMIN" ? (
    <RoleMatrixView />
  ) : (
    <p className="mt-8 max-w-reading text-body text-muted">
      Roles and permissions are managed by super administrators.
    </p>
  );
}
