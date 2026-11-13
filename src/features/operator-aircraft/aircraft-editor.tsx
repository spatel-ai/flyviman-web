"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ExpiryBadge } from "@/components/shared/expiry-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import {
  AIRCRAFT_DOCUMENT_LABELS,
  aircraftDocumentLabel,
  formatDay,
  missingLabel,
  searchBlockerLabel,
} from "@/lib/format/aircraft";
import { indiaToday } from "@/lib/format/expiry";
import { useOperatorAccess, useOperatorApproved } from "@/lib/operator";
import { can } from "@/lib/operator-access";
import { AircraftDetailsDialog } from "./aircraft-details-dialog";
import { AircraftPhotos } from "./aircraft-photos";
import { AvailabilityStatusControl } from "./availability-status-control";
import { upload } from "./upload";

type Aircraft = Schemas["AircraftResponseDto"];

const DOCUMENT_TYPES = Object.entries(AIRCRAFT_DOCUMENT_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export function AircraftEditor({ id }: { id: string }) {
  const approved = useOperatorApproved();
  // Staff edit only with "manage aircraft" and see the calendar only with
  // "manage availability"; grounding needs either (D-068).
  const access = useOperatorAccess();
  const managesAircraft = can(access, "MANAGE_AIRCRAFT", id);
  const managesTime = can(access, "MANAGE_AVAILABILITY", id);
  const queryClient = useQueryClient();
  // The id comes from the URL; encode it so it can only name one aircraft.
  const base = `operator/aircraft/${encodeURIComponent(id)}`;
  const aircraft = useQuery({
    queryKey: queryKeys.operatorAircraftDetail(id),
    queryFn: () => apiFetch<Aircraft>(base),
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [removingDocument, setRemovingDocument] = useState<
    Aircraft["documents"][number] | null
  >(null);

  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.operatorAircraftDetail(id),
    });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.operatorAircraft,
    });
    await queryClient.invalidateQueries({ queryKey: queryKeys.availability });
  }

  if (aircraft.isPending) return <Skeleton className="mt-6 h-64" />;
  if (aircraft.isError) {
    return (
      <p role="alert" className="text-danger">
        {messageFor(aircraft.error)}
      </p>
    );
  }

  const item = aircraft.data.data;
  // Under review or suspended, the listing is frozen. Adding to it also needs
  // an approved operator; removing and grounding do not (D-058), so a
  // suspended operator can still take things away or ground the aircraft.
  const frozen =
    item.listingStatus === "PENDING_REVIEW" ||
    item.listingStatus === "SUSPENDED";
  const canAdd = !frozen && approved === true && managesAircraft;
  const canRemove = !frozen && managesAircraft;
  const locked = !canAdd;
  // A verified document stays until the listing is a draft or rejected
  // again; on a live listing it is replaced by uploading a new copy.
  const mayRemoveDocument = (document: Aircraft["documents"][number]) =>
    canRemove &&
    (document.verificationStatus !== "VERIFIED" ||
      item.listingStatus === "DRAFT" ||
      item.listingStatus === "REJECTED");

  async function removeDocument() {
    if (!removingDocument) return;
    setPending(true);
    setError(null);
    try {
      await apiFetch(
        `${base}/documents/${encodeURIComponent(removingDocument.id)}`,
        { method: "DELETE" },
      );
      setRemovingDocument(null);
      await refresh();
    } catch (failure) {
      setRemovingDocument(null);
      setError(messageFor(failure));
    } finally {
      setPending(false);
    }
  }

  async function submit() {
    setPending(true);
    setError(null);
    try {
      await apiFetch(`${base}/submit`, { method: "POST" });
      await refresh();
    } catch (failure) {
      setError(messageFor(failure));
    } finally {
      setPending(false);
    }
  }

  async function addDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // React clears currentTarget once the handler yields, so keep the form.
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return;
    setPending(true);
    setError(null);
    try {
      const fileId = await upload(file, "AIRCRAFT_DOCUMENT");
      await apiFetch(`${base}/documents`, {
        method: "POST",
        body: {
          type: String(form.get("type")),
          fileId,
          expiresAt: String(form.get("expiresAt")),
        },
      });
      formElement.reset();
      await refresh();
    } catch (failure) {
      setError(messageFor(failure));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/operator/aircraft"
          className="text-body-sm text-accent hover:underline"
        >
          Fleet
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-h2">{item.registration}</h1>
          <StatusBadge kind="aircraft" status={item.listingStatus} />
          <StatusBadge kind="availability" status={item.availabilityStatus} />
        </div>
        {item.listingStatus === "APPROVED" && item.searchBlockers.length > 0 ? (
          <Card
            variant="flat"
            role="status"
            className="mt-4 border border-warning/40"
          >
            <h2 className="text-title">Not offered to customers</h2>
            <p className="mt-1 text-body-sm text-muted">
              Customers will not see this aircraft until this is fixed:
            </p>
            <ul className="mt-2 list-disc pl-5 text-body-sm">
              {item.searchBlockers.map((code) => (
                <li key={code}>{searchBlockerLabel(code)}</li>
              ))}
            </ul>
          </Card>
        ) : null}
        <p className="mt-2 text-muted">
          {item.manufacturer} {item.model} · {item.passengerCapacity} passengers
          · {item.rangeKm ?? "Range not set"} km
          {item.homeBase ? ` · based at ${item.homeBase.name}` : ""}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {managesTime ? (
            <Link
              href={`/operator/availability/${item.id}`}
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              Calendar
            </Link>
          ) : null}
          {canAdd ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditing(true)}
            >
              Edit details
            </Button>
          ) : null}
        </div>
      </div>
      <AvailabilityStatusControl
        base={base}
        status={item.availabilityStatus}
        onChanged={refresh}
      />
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
      {item.reviewNote ? (
        <Card variant="raised">
          <p className="text-body-sm">
            <span className="font-medium">Review note. </span>
            {item.reviewNote}
          </p>
        </Card>
      ) : null}
      {item.missing.length > 0 ? (
        <Card variant="flat">
          <h2 className="text-title">Still needed before submit</h2>
          <ul className="mt-2 list-disc pl-5 text-body-sm text-muted">
            {item.missing.map((field) => (
              <li key={field}>{missingLabel(field)}</li>
            ))}
          </ul>
        </Card>
      ) : null}
      <section>
        <h2 className="text-title">Documents</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {item.documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center gap-2">
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
              <ExpiryBadge expiresAt={document.expiresAt} />
              {mayRemoveDocument(document) ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setRemovingDocument(document)}
                  aria-label={`Remove ${aircraftDocumentLabel(document.type)} (${document.fileName})`}
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        {locked ? null : (
          <form
            onSubmit={(event) => void addDocument(event)}
            className="mt-4 flex max-w-lg flex-col gap-4"
          >
            <DocumentTypeField />
            <Input
              label="Expiry date"
              name="expiresAt"
              type="date"
              min={indiaToday()}
              hint="Today or later. We remind you 30 days, 7 days and on the day before it lapses."
              required
            />
            <Input
              label="File"
              name="file"
              type="file"
              accept="application/pdf"
              required
            />
            <Button type="submit" variant="secondary" loading={pending}>
              Add document
            </Button>
          </form>
        )}
      </section>
      <AircraftPhotos
        base={base}
        media={item.media}
        canAdd={canAdd}
        canRemove={canRemove}
        onChanged={refresh}
      />
      {locked || item.listingStatus === "APPROVED" ? null : (
        <Button loading={pending} onClick={() => void submit()}>
          Submit for review
        </Button>
      )}
      <AircraftDetailsDialog
        aircraft={item}
        base={base}
        open={editing}
        onOpenChange={setEditing}
        onSaved={refresh}
      />
      <ConfirmDialog
        open={removingDocument !== null}
        onOpenChange={(open) => !open && setRemovingDocument(null)}
        title="Remove this document?"
        description={
          item.listingStatus === "APPROVED"
            ? "Removing a document sends the aircraft back to review. It is not offered to customers until operations approve it again."
            : "It is deleted. Add a new copy if the aircraft still needs one."
        }
        confirmLabel="Remove"
        destructive
        loading={pending}
        onConfirm={() => void removeDocument()}
      />
    </div>
  );
}

function DocumentTypeField() {
  const [type, setType] = useState("REGISTRATION");
  return (
    <>
      <input type="hidden" name="type" value={type} />
      <Select
        label="Document type"
        options={DOCUMENT_TYPES}
        value={type}
        onValueChange={setType}
      />
    </>
  );
}
