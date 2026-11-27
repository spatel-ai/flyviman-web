import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDashboard } from "@/features/admin-reports/dashboard";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  // The layout's title template does not apply to the page of its own segment.
  title: { absolute: "Dashboard · Admin · Flyviman" },
};

export default function AdminDashboardPage() {
  return (
    <>
      <h1 className="text-h2">Dashboard</h1>
      <p className="mt-2 max-w-reading text-body text-muted">
        The last 30 days and what needs attention now.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-64" />}>
        <ForRole />
      </Suspense>
    </>
  );
}

async function ForRole() {
  const session = await getSession();
  if (!session) return null;
  return <AdminDashboard role={session.role} />;
}
