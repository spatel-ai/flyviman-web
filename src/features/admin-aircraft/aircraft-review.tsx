"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { aircraftDocumentLabel, formatDay } from "@/lib/format/aircraft";

type Detail = Schemas["AdminAircraftDetailDto"];
type Action =
  | { kind: "reject" | "suspend" | "release" }
  | { kind: "rejectDocument"; documentId: string }
  | null;

export function AircraftReview({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [action, setAction] = useState<Action>(null);
  const [error, setError] = useState<string | null>(null);
  // The id comes from the URL; encode it so it can only name one aircraft.
  const base = `admin/aircraft/${encodeURIComponent(id)}`;
  const aircraft = useQuery({
    queryKey: queryKeys.adminAircraftDetail(id),
    queryFn: () => apiFetch<Detail>(base),
  });

  const decide = useMutation({
    mutationFn: async (input: { path: string; body?: object }) => {
      await apiFetch(input.path, { method: "POST", body: input.body });
    },
    onSuccess: async () => {
      setAction(null);
      setError(null);
      // The queue tabs and this detail share the ["admin", "aircraft"] prefix.
      await queryClient.invalidateQueries({ queryKey: ["admin", "aircraft"] });
    },
    onError: (failure) => setError(messageFor(failure)),
  });
  // The aircraft no longer exists after a release, so leave the page before
  // refreshing the queue, rather than refetching this detail into a 404.
  async function release(reason: string) {
    setError(null);
    try {
      await apiFetch(`${base}/release-registration`, {
        method: "POST",
        body: { reason },
      });
    } catch (failure) {
      setError(messageFor(failure));
      return;
    }
    setAction(null);
    router.push("/admin/aircraft");
    queryClient.removeQueries({ queryKey: queryKeys.adminAircraftDetail(id) });
    await queryClient.invalidateQueries({
      queryKey: ["admin", "aircraft"],
      predicate: (query) => query.queryKey[2] !== id,
    });
  }
  const documentPath = (documentId: string) =>
    `admin/aircraft/documents/${encodeURIComponent(documentId)}/verify`;

  if (aircraft.isPending) return <Skeleton className="h-64" />;
  if (aircraft.isError) {
    return (
      <p role="alert" className="text-danger">
        {messageFor(aircraft.error)}
      </p>
    );
  }
  const item = aircraft.data.data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/aircraft"
          className="text-body-sm text-accent hover:underline"
        >
          Aircraft
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-h2">{item.registration}</h1>
          <StatusBadge kind="operator" status={item.listingStatus} />
        </div>
        <p className="mt-2 text-muted">
          {item.operatorName} · {item.manufacturer} {item.model} ·{" "}
          {item.passengerCapacity} passengers
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
      {item.reviewNote ? (
        <Card variant="raised">
          <p className="text-body-sm">{item.reviewNote}</p>
        </Card>
      ) : null}
      <section>
        <h2 className="text-title">Documents</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {item.documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center gap-3">
              <span>
                {aircraftDocumentLabel(document.type)} · {document.fileName}
                {document.expiresAt
                  ? ` · expires ${formatDay(document.expiresAt)}`
                  : ""}
              </span>
              <StatusBadge
                kind="document"
                status={document.verificationStatus}
              />
              {document.verificationStatus === "VERIFIED" ? null : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    decide.mutate({
                      path: documentPath(document.id),
                      body: { decision: "VERIFIED" },
                    })
                  }
                >
                  Mark verified
                </Button>
              )}
              {document.verificationStatus === "REJECTED" ? null : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setAction({
                      kind: "rejectDocument",
                      documentId: document.id,
                    })
                  }
                >
                  Reject document
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>
      <div className="flex flex-wrap gap-3">
        {item.listingStatus === "PENDING_REVIEW" ? (
          <>
            <Button
              onClick={() => decide.mutate({ path: `${base}/approve` })}
              loading={decide.isPending}
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              onClick={() => setAction({ kind: "reject" })}
            >
              Reject
            </Button>
          </>
        ) : null}
        {item.listingStatus === "APPROVED" ? (
          <Button
            variant="secondary"
            onClick={() => setAction({ kind: "suspend" })}
          >
            Suspend
          </Button>
        ) : null}
        {item.listingStatus === "SUSPENDED" ? (
          <Button
            onClick={() => decide.mutate({ path: `${base}/reinstate` })}
            loading={decide.isPending}
          >
            Reinstate
          </Button>
        ) : null}
        {item.listingStatus === "DRAFT" || item.listingStatus === "REJECTED" ? (
          <Button
            variant="destructive"
            onClick={() => setAction({ kind: "release" })}
          >
            Release registration
          </Button>
        ) : null}
      </div>
      <ConfirmDialog
        open={action?.kind === "reject" || action?.kind === "suspend"}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        title={
          action?.kind === "suspend"
            ? "Suspend this aircraft"
            : "Reject this listing"
        }
        description="The operator sees the reason. A suspended aircraft stays suspended until you reinstate it."
        confirmLabel={action?.kind === "suspend" ? "Suspend" : "Reject"}
        destructive
        requireReason
        loading={decide.isPending}
        onConfirm={(reason) => {
          if (action?.kind !== "reject" && action?.kind !== "suspend") return;
          decide.mutate({ path: `${base}/${action.kind}`, body: { reason } });
        }}
      />
      <ConfirmDialog
        open={action?.kind === "rejectDocument"}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        title="Reject this document"
        description="The operator sees the reason. If the aircraft is approved and this was its last valid copy of a required document, the aircraft is suspended."
        confirmLabel="Reject document"
        destructive
        requireReason
        loading={decide.isPending}
        onConfirm={(reason) => {
          if (action?.kind !== "rejectDocument") return;
          decide.mutate({
            path: documentPath(action.documentId),
            body: { decision: "REJECTED", reason },
          });
        }}
      />
      <ConfirmDialog
        open={action?.kind === "release"}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        title="Release this registration"
        description="The aircraft is deleted so another operator can use the registration mark. This cannot be undone, and the reason is kept in the audit log."
        confirmLabel="Release registration"
        destructive
        requireReason
        loading={decide.isPending}
        onConfirm={(reason) => void release(reason ?? "")}
      />
    </div>
  );
}
