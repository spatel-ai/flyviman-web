import type { Metadata } from "next";
import { Suspense } from "react";
import { ExpiringDocuments } from "@/features/admin-documents/expiring-documents";

export const metadata: Metadata = { title: "Expiring documents" };

export default function AdminExpiringDocumentsPage() {
  return (
    <>
      <h1 className="text-h2">Expiring documents</h1>
      <p className="mt-2 max-w-prose text-muted">
        Certificates and insurance that lapse soon or already have. An aircraft
        whose required document has expired is not offered to customers until a
        renewed copy is uploaded.
      </p>
      <Suspense>
        <ExpiringDocuments />
      </Suspense>
    </>
  );
}
