"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { LoadError } from "@/components/shared/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { receiptHref } from "@/lib/api/payments";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";

type Document = Schemas["BookingDocumentDto"];

/** Where a document opens; null for a kind this page does not know yet. */
function hrefOf(reference: string, document: Document): string | null {
  const trip = `/account/trips/${encodeURIComponent(reference)}`;
  switch (document.kind) {
    case "CONFIRMATION":
      return `${trip}/itinerary`;
    case "RECEIPT":
      return document.paymentReference
        ? receiptHref(reference, document.paymentReference)
        : null;
    case "CANCELLATION_TERMS":
      return "#cancellation-terms";
    default:
      return null;
  }
}

/**
 * The trip's documents (`GET /bookings/:reference/documents`): the printable
 * confirmation once confirmed, a receipt per payment received, and the
 * cancellation terms accepted with the request.
 */
export function TripDocuments({ reference }: { reference: string }) {
  const documents = useQuery({
    queryKey: queryKeys.bookingDocuments(reference),
    queryFn: async () =>
      (
        await apiFetch<Document[]>(
          `bookings/${encodeURIComponent(reference)}/documents`,
        )
      ).data,
  });

  return (
    <section
      aria-labelledby="documents-heading"
      className="flex flex-col gap-3"
    >
      <h2 id="documents-heading" className="text-title">
        Documents
      </h2>
      {documents.isPending ? (
        <Skeleton className="h-16" />
      ) : documents.isError ? (
        <LoadError
          what="your documents"
          error={documents.error}
          onRetry={() => void documents.refetch()}
        />
      ) : (
        <ul className="flex flex-col gap-2 text-body-sm">
          {documents.data.map((document) => {
            const href = document.available
              ? hrefOf(reference, document)
              : null;
            return (
              <li
                key={`${document.kind}-${document.paymentReference ?? ""}`}
                className="flex flex-col"
              >
                {href ? (
                  <Link href={href} className="text-accent hover:underline">
                    {document.title}
                  </Link>
                ) : (
                  <span className="text-muted">{document.title}</span>
                )}
                <span className="text-caption text-muted">
                  {document.issuedAt
                    ? formatDateTime(document.issuedAt)
                    : "Available once the booking is confirmed"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
