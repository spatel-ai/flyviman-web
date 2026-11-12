"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import {
  AIRCRAFT_DOCUMENT_LABELS,
  aircraftDocumentLabel,
  formatDay,
  missingLabel,
} from "@/lib/format/aircraft";
import { useOperatorApproved } from "@/lib/operator";

type Aircraft = Schemas["AircraftResponseDto"];

const DOCUMENT_TYPES = Object.entries(AIRCRAFT_DOCUMENT_LABELS).map(
  ([value, label]) => ({ value, label }),
);

async function upload(
  file: File,
  purpose: "AIRCRAFT_DOCUMENT" | "AIRCRAFT_PHOTO",
) {
  const { data } = await apiFetch<Schemas["PresignUploadResponseDto"]>(
    "uploads/presign",
    {
      method: "POST",
      body: {
        purpose,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      },
    },
  );
  const response = await fetch(data.upload.url, {
    method: data.upload.method,
    headers: data.upload.headers as Record<string, string>,
    body: file,
    credentials: "omit",
  });
  if (!response.ok) {
    throw new ApiError(response.status, "UPLOAD_FAILED", "The upload failed.");
  }
  return data.fileId;
}

export function AircraftEditor({ id }: { id: string }) {
  const approved = useOperatorApproved();
  const queryClient = useQueryClient();
  // The id comes from the URL; encode it so it can only name one aircraft.
  const base = `operator/aircraft/${encodeURIComponent(id)}`;
  const aircraft = useQuery({
    queryKey: queryKeys.operatorAircraftDetail(id),
    queryFn: () => apiFetch<Aircraft>(base),
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.operatorAircraftDetail(id),
    });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.operatorAircraft,
    });
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
  // Under review or suspended, or the operator itself is not approved: the
  // API refuses changes, so none are offered.
  const locked =
    item.listingStatus === "PENDING_REVIEW" ||
    item.listingStatus === "SUSPENDED" ||
    approved !== true;

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
        </div>
        <p className="mt-2 text-muted">
          {item.manufacturer} {item.model} · {item.passengerCapacity} passengers
          · {item.rangeKm ?? "Range not set"} km
        </p>
      </div>
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
            </li>
          ))}
        </ul>
        {locked ? null : (
          <form
            onSubmit={(event) => void addDocument(event)}
            className="mt-4 flex max-w-lg flex-col gap-4"
          >
            <DocumentTypeField />
            <Input label="Expiry date" name="expiresAt" type="date" required />
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
      {locked || item.listingStatus === "APPROVED" ? null : (
        <Button loading={pending} onClick={() => void submit()}>
          Submit for review
        </Button>
      )}
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
