import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryConfigView } from "@/features/admin-category-config/category-config";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Categories" };

export default function AdminCategoryConfigPage() {
  return (
    <>
      <h1 className="text-h2">Categories</h1>
      <p className="mt-2 max-w-reading text-body text-muted">
        Which services are offered in each region, how they are booked and how
        they are paid for. Each change is kept in the audit log with its reason.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <ConfigForRole />
      </Suspense>
    </>
  );
}

/** Super administrators change the configuration; others read it. */
async function ConfigForRole() {
  const session = await getSession();
  return <CategoryConfigView canEdit={session?.role === "SUPER_ADMIN"} />;
}
