"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { reserveTab } from "@/lib/browser/open-link";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { AddDocumentForm } from "./add-document-form";
import { FormAlert } from "@/components/shared/form-alert";
import { hasCode, onboardingMessage } from "./messages";
import { documentTypeLabel, formatDay, type OperatorDocument } from "./schema";

/** Opens the short-lived download link in a new tab. */
async function openDownload(fileId: string): Promise<void> {
  const tab = reserveTab();
  try {
    const { data } = await apiFetch<Schemas["DownloadLinkResponseDto"]>(
      `documents/${fileId}/download`,
    );
    tab.open(data.url);
  } catch (error) {
    tab.cancel();
    throw error;
  }
}

export function DocumentsSection({ editable }: { editable: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [listError, setListError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<OperatorDocument | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const documents = useQuery({
    queryKey: queryKeys.operatorDocuments,
    queryFn: async () =>
      (await apiFetch<OperatorDocument[]>("operator/documents")).data,
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch<null>(`operator/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setListError(null);
      toast({ title: "Document removed", tone: "success" });
    },
    onError: (error) => {
      setListError(onboardingMessage(error));
      if (hasCode(error, "OPERATOR_UNDER_REVIEW")) router.refresh();
    },
    onSettled: () => {
      setRemoving(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.operatorDocuments,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.operatorProfile,
      });
    },
  });

  async function download(document: OperatorDocument) {
    setListError(null);
    setDownloadingId(document.id);
    try {
      await openDownload(document.fileId);
    } catch (error) {
      setListError(onboardingMessage(error));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <FormAlert message={listError} />

      {documents.isPending ? (
        <div role="status" aria-label="Loading documents">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      ) : documents.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-body-sm text-danger">
            We could not load your documents.{" "}
            {onboardingMessage(documents.error)}
          </p>
          <Button
            variant="secondary"
            size="sm"
            loading={documents.isRefetching}
            onClick={() => void documents.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : documents.data.length === 0 ? (
        <EmptyState
          title="No documents yet"
          description={
            editable
              ? "Add your air operator certificate and insurance certificate to submit your application."
              : "No documents were added to this application."
          }
        />
      ) : (
        <ul aria-label="Documents" className="flex flex-col">
          {documents.data.map((document) => {
            const label = documentTypeLabel(document.type);
            return (
              <li
                key={document.id}
                className="flex flex-col gap-3 border-b border-border/60 py-4 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-body font-medium text-foreground">
                      {label}
                    </p>
                    <StatusBadge
                      kind="document"
                      status={document.verificationStatus}
                    />
                  </div>
                  <p className="text-body-sm break-all text-muted">
                    {document.fileName}
                  </p>
                  <p className="text-caption text-muted">
                    {document.expiresAt
                      ? `Expires ${formatDay(document.expiresAt)}`
                      : "No expiry date"}
                  </p>
                  {document.verificationStatus === "REJECTED" &&
                  document.verificationNote ? (
                    <p className="text-body-sm wrap-break-word text-danger">
                      <span className="font-medium">Reason: </span>
                      {document.verificationNote}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Download ${label}, ${document.fileName}`}
                    loading={downloadingId === document.id}
                    onClick={() => void download(document)}
                  >
                    Download
                  </Button>
                  {editable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${label}, ${document.fileName}`}
                      onClick={() => {
                        setListError(null);
                        setRemoving(document);
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editable ? (
        <div className="border-t border-border/60 pt-6">
          <AddDocumentForm />
        </div>
      ) : null}

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setRemoving(null);
        }}
        title="Remove this document?"
        description={
          removing
            ? `${documentTypeLabel(removing.type)} (${removing.fileName}) will be deleted. This cannot be undone.`
            : ""
        }
        confirmLabel="Remove document"
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          if (removing) remove.mutate(removing.id);
        }}
      />
    </div>
  );
}
