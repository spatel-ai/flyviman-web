"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ExpiryBadge } from "@/components/shared/expiry-badge";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError, isNotFoundError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import {
  actionErrorMessage,
  ACTIONS,
  availableActions,
  canReview,
  isStale,
  type OperatorAction,
} from "./actions";
import { InlineError } from "./inline-error";
import {
  documentTypeLabel,
  formatAddress,
  formatDay,
  missingLabel,
  serviceLabel,
} from "./labels";
import { useMe } from "./use-me";

type OperatorDetailData = Schemas["AdminOperatorDetailDto"];
type OperatorDocument = Schemas["OperatorDocumentResponseDto"];

// Every operator list and detail query sits under this prefix.
const OPERATOR_QUERIES = queryKeys.adminOperators({}).slice(0, 2);

function BackLink() {
  return (
    <Link
      href="/admin/operators"
      className="text-body-sm text-accent hover:underline"
    >
      Back to operators
    </Link>
  );
}

export function OperatorDetailSkeleton() {
  return (
    <div aria-busy="true" className="mt-4 flex flex-col gap-6">
      <p role="status" className="sr-only">
        Loading operator
      </p>
      <Skeleton className="h-9 w-72 max-w-full" />
      <Skeleton className="h-64" />
      <Skeleton className="h-40" />
    </div>
  );
}

export function OperatorDetail({ id }: { id: string }) {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: queryKeys.adminOperator(id),
    queryFn: () =>
      apiFetch<OperatorDetailData>(
        `admin/operators/${encodeURIComponent(id)}`,
      ).then((result) => result.data),
  });
  const role = useMe().data?.role;

  // A failed background refetch keeps showing what was last loaded.
  if (!data) {
    if (isPending) {
      return (
        <>
          <BackLink />
          <OperatorDetailSkeleton />
        </>
      );
    }
    if (isNotFoundError(error)) {
      return (
        <RecordNotFound
          title="Operator not found"
          description="This operator does not exist, or the link is not correct."
          backHref="/admin/operators"
          backLabel="Back to operators"
        />
      );
    }
    return (
      <>
        <BackLink />
        <h1 className="mt-4 mb-6 text-h2">Operator</h1>
        <InlineError
          message={messageFor(error)}
          onRetry={() => void refetch()}
        />
      </>
    );
  }

  const operator = data;
  return (
    <>
      <BackLink />
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-h2 wrap-break-word">{operator.legalName}</h1>
          <div>
            <StatusBadge kind="operator" status={operator.status} />
          </div>
        </div>
        <DecisionActions operator={operator} role={role} />
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {operator.missing.length > 0 ? (
          <Card>
            <h2 className="text-title">What is still missing</h2>
            <ul className="mt-3 list-disc pl-5 text-body-sm">
              {operator.missing.map((item) => (
                <li key={item}>{missingLabel(item)}</li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Card variant="raised">
          <h2 className="text-title">Company details</h2>
          <CompanyDetails operator={operator} />
        </Card>

        <Card variant="raised">
          <h2 className="text-title">Documents</h2>
          <Documents operator={operator} canDecide={canReview(role)} />
        </Card>
      </div>
    </>
  );
}

function DecisionActions({
  operator,
  role,
}: {
  operator: OperatorDetailData;
  role: Schemas["Role"] | undefined;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState<OperatorAction | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const decision = useMutation({
    mutationFn: ({
      action,
      reason,
    }: {
      action: OperatorAction;
      reason?: string;
    }) =>
      apiFetch<OperatorDetailData>(`admin/operators/${operator.id}/${action}`, {
        method: "POST",
        body: reason ? { reason } : undefined,
      }).then((result) => result.data),
    onSuccess: (updated, { action }) => {
      queryClient.setQueryData(queryKeys.adminOperator(operator.id), updated);
      void queryClient.invalidateQueries({ queryKey: OPERATOR_QUERIES });
      setOpen(null);
      toast({ title: ACTIONS[action].done, tone: "success" });
    },
    onError: (error) => {
      setOpen(null);
      setProblem(actionErrorMessage(error));
      if (isStale(error)) {
        void queryClient.invalidateQueries({ queryKey: OPERATOR_QUERIES });
      }
    },
  });

  const actions = availableActions(operator.status, role);
  const dialog = open ? ACTIONS[open] : null;

  if (actions.length === 0 && !problem) return null;
  return (
    <div className="flex max-w-full flex-col gap-3 sm:items-end">
      {actions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action}
              variant={ACTIONS[action].primary ? "primary" : "secondary"}
              className="h-10"
              onClick={() => {
                setProblem(null);
                setOpen(action);
              }}
            >
              {ACTIONS[action].label}
            </Button>
          ))}
        </div>
      ) : null}
      {problem ? (
        <p role="alert" className="text-body-sm text-danger">
          {problem}
        </p>
      ) : null}
      {open && dialog ? (
        <ConfirmDialog
          open
          onOpenChange={(next) => {
            if (!next && !decision.isPending) setOpen(null);
          }}
          title={dialog.title}
          description={dialog.description}
          confirmLabel={dialog.confirmLabel}
          destructive={dialog.destructive}
          requireReason={dialog.requireReason}
          loading={decision.isPending}
          onConfirm={(reason) => decision.mutate({ action: open, reason })}
        />
      ) : null}
    </div>
  );
}

function CompanyDetails({ operator }: { operator: OperatorDetailData }) {
  const rows: [string, string | null][] = [
    ["Trading name", operator.tradingName],
    ["Registration number", operator.registrationNumber],
    ["GSTIN", operator.taxNumber],
    ["Business address", formatAddress(operator.businessAddress)],
    ["Billing address", formatAddress(operator.billingAddress)],
    ["Contact name", operator.contactName],
    ["Contact email", operator.contactEmail],
    ["Contact phone", operator.contactPhone],
    ["Services", operator.serviceCategories.map(serviceLabel).join(", ")],
    ["Operating regions", operator.operatingRegions.join(", ")],
    [
      "Submitted",
      operator.submittedAt ? formatDateTime(operator.submittedAt) : null,
    ],
    [
      "Reviewed",
      operator.reviewedAt ? formatDateTime(operator.reviewedAt) : null,
    ],
    ["Review note", operator.reviewNote],
  ];
  const fallback: Record<string, string> = {
    Submitted: "Not submitted",
    Reviewed: "Not reviewed",
    "Review note": "None",
  };

  return (
    <dl className="mt-4 grid gap-x-8 gap-y-4 text-body-sm sm:grid-cols-2">
      {rows.map(([term, value]) => (
        <div key={term} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-caption text-muted">{term}</dt>
          <dd className="wrap-break-word">
            {value || (
              <span className="text-muted">
                {fallback[term] ?? "Not provided"}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Documents({
  operator,
  canDecide,
}: {
  operator: OperatorDetailData;
  canDecide: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [rejecting, setRejecting] = useState<OperatorDocument | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const verification = useMutation({
    mutationFn: ({
      document,
      reason,
    }: {
      document: OperatorDocument;
      reason?: string;
    }) =>
      apiFetch<OperatorDocument>(`admin/documents/${document.id}/verify`, {
        method: "POST",
        body: reason
          ? { decision: "REJECTED", reason }
          : { decision: "VERIFIED" },
      }).then((result) => result.data),
    onSuccess: (updated) => {
      queryClient.setQueryData<OperatorDetailData>(
        queryKeys.adminOperator(operator.id),
        (current) =>
          current && {
            ...current,
            documents: current.documents.map((document) =>
              document.id === updated.id ? updated : document,
            ),
          },
      );
      // `missing` depends on the documents, so the detail is loaded again.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.adminOperator(operator.id),
      });
      setRejecting(null);
      toast({
        title:
          updated.verificationStatus === "REJECTED"
            ? "Document rejected"
            : "Document verified",
        tone: "success",
      });
    },
    onError: (error) => {
      setRejecting(null);
      setProblem(actionErrorMessage(error));
      if (isStale(error)) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.adminOperator(operator.id),
        });
      }
    },
  });

  const download = useMutation({
    mutationFn: async (document: OperatorDocument) => {
      // Opened during the click, so the browser does not treat it as a
      // pop-up; pointed at the short-lived link once the API returns it.
      const tab = window.open("", "_blank");
      try {
        const { data } = await apiFetch<Schemas["DownloadLinkResponseDto"]>(
          `documents/${document.fileId}/download`,
        );
        const url = new URL(data.url, window.location.href);
        if (url.protocol !== "https:" && url.protocol !== "http:") {
          throw new Error("Not a web link");
        }
        if (tab) {
          tab.opener = null;
          tab.location.replace(url.href);
        } else {
          window.open(url.href, "_blank", "noopener,noreferrer");
        }
      } catch (error) {
        tab?.close();
        throw error;
      }
    },
    onError: (error) =>
      setProblem(
        error instanceof ApiError && error.code === "NOT_FOUND"
          ? "This file is no longer available."
          : messageFor(error),
      ),
  });

  if (operator.documents.length === 0) {
    return (
      <EmptyState
        title="No documents uploaded"
        description="The operator has not added any compliance documents yet."
      />
    );
  }

  const busy = verification.isPending;
  return (
    <div className="mt-4 flex flex-col gap-4">
      {problem ? (
        <p role="alert" className="text-body-sm text-danger">
          {problem}
        </p>
      ) : null}
      <ul className="flex flex-col">
        {operator.documents.map((document) => {
          const type = documentTypeLabel(document.type);
          const named = `${type}, ${document.fileName}`;
          const pending =
            busy && verification.variables?.document.id === document.id;
          return (
            <li
              key={document.id}
              className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 py-4 first:pt-0 last:border-b-0 last:pb-0"
            >
              <div className="flex min-w-0 flex-col gap-1 text-body-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{type}</h3>
                  <StatusBadge
                    kind="document"
                    status={document.verificationStatus}
                  />
                  <ExpiryBadge expiresAt={document.expiresAt} />
                </div>
                <p className="wrap-break-word text-muted">
                  {document.fileName}
                </p>
                <p className="text-caption text-muted">
                  {document.expiresAt
                    ? `Expires ${formatDay(document.expiresAt)}`
                    : "No expiry date"}
                </p>
                {document.verificationNote ? (
                  <p className="wrap-break-word">
                    <span className="text-muted">Note: </span>
                    {document.verificationNote}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  className="h-10"
                  aria-label={`Open ${named}`}
                  loading={
                    download.isPending && download.variables?.id === document.id
                  }
                  onClick={() => {
                    setProblem(null);
                    download.mutate(document);
                  }}
                >
                  Open
                </Button>
                {canDecide && document.verificationStatus !== "VERIFIED" ? (
                  <Button
                    variant="secondary"
                    className="h-10"
                    aria-label={`Verify ${named}`}
                    loading={pending && !rejecting}
                    disabled={busy}
                    onClick={() => {
                      setProblem(null);
                      verification.mutate({ document });
                    }}
                  >
                    Verify
                  </Button>
                ) : null}
                {canDecide && document.verificationStatus !== "REJECTED" ? (
                  <Button
                    variant="secondary"
                    className="h-10"
                    aria-label={`Reject ${named}`}
                    disabled={busy}
                    onClick={() => {
                      setProblem(null);
                      setRejecting(document);
                    }}
                  >
                    Reject
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {rejecting ? (
        <ConfirmDialog
          open
          onOpenChange={(next) => {
            if (!next && !busy) setRejecting(null);
          }}
          title="Reject this document?"
          description={`${documentTypeLabel(rejecting.type)} (${rejecting.fileName}). The operator sees your reason and can upload a replacement.`}
          confirmLabel="Reject document"
          destructive
          requireReason
          loading={busy}
          onConfirm={(reason) =>
            verification.mutate({ document: rejecting, reason })
          }
        />
      ) : null}
    </div>
  );
}
