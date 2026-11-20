import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminRequestDetail } from "@/features/admin-air-ambulance/request-detail";
import { isAirAmbulanceReference } from "@/lib/air-ambulance/labels";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Air ambulance request" };

async function DetailForViewer({ reference }: { reference: string }) {
  const session = await getSession();
  if (!session || (session.role !== "OPS" && session.role !== "SUPER_ADMIN")) {
    return (
      <p className="text-body text-muted">
        Air ambulance requests are handled by operations.
      </p>
    );
  }
  return (
    <AdminRequestDetail
      reference={reference}
      viewer={{ id: session.id, role: session.role }}
    />
  );
}

export default async function AdminAirAmbulanceRequestPage({
  params,
}: PageProps<"/admin/air-ambulance/[reference]">) {
  const { reference } = await params;
  // Only a well-formed reference may reach the API path built from it.
  if (!isAirAmbulanceReference(reference)) notFound();
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <DetailForViewer reference={reference} />
    </Suspense>
  );
}
