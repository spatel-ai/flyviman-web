import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Queue } from "@/features/admin-air-ambulance/queue";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Air ambulance" };

async function QueueForViewer() {
  const session = await getSession();
  if (!session || (session.role !== "OPS" && session.role !== "SUPER_ADMIN")) {
    return (
      <p className="mt-6 text-body text-muted">
        Air ambulance requests are handled by operations.
      </p>
    );
  }
  return <Queue viewerId={session.id} />;
}

export default function AdminAirAmbulancePage() {
  return (
    <>
      <h1 className="text-h2">Air ambulance</h1>
      <p className="mt-2 max-w-reading text-body text-muted">
        Requests from customers, newest first. Take one to see its medical
        details and work it through to confirmation.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <QueueForViewer />
      </Suspense>
    </>
  );
}
