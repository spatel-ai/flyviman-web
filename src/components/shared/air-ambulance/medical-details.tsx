"use client";

import { useState } from "react";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { mobilityLabel } from "@/lib/air-ambulance/labels";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import type { Schemas } from "@/lib/api/types";
import { reserveTab } from "@/lib/browser/open-link";

type Medical = Schemas["MedicalDetailsDto"];

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-body-sm text-muted">{label}</dt>
      <dd className="break-words whitespace-pre-wrap">
        {value ?? <span className="text-muted">Not given</span>}
      </dd>
    </div>
  );
}

/**
 * The patient's medical details and documents, for those the API lets read
 * them (each read and each download is audited by the API). Nothing here is
 * stored, logged or put in an address.
 */
export function MedicalDetails({ medical }: { medical: Medical }) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(fileId: string) {
    setError(null);
    setDownloading(fileId);
    const tab = reserveTab();
    try {
      const { data } = await apiFetch<Schemas["DownloadLinkResponseDto"]>(
        `documents/${encodeURIComponent(fileId)}/download`,
      );
      tab.open(data.url);
    } catch (failure) {
      tab.cancel();
      setError(messageFor(failure));
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Row label="Condition" value={medical.patientCondition} />
        </div>
        <Row label="Mobility" value={mobilityLabel(medical.mobility)} />
        <Row label="Stretcher" value={yesNo(medical.stretcherRequired)} />
        <Row label="Oxygen" value={yesNo(medical.oxygenRequired)} />
        <Row label="Medical staff" value={medical.medicalStaffRequired} />
        <Row label="Equipment" value={medical.equipmentRequired} />
        <Row label="Specialised care" value={medical.specialisedCare} />
        <div className="sm:col-span-2">
          <Row label="Notes" value={medical.notes} />
        </div>
      </dl>
      <section aria-labelledby="medical-documents-heading">
        <h3 id="medical-documents-heading" className="text-body font-medium">
          Medical documents
        </h3>
        <FormAlert message={error} />
        {medical.documents.length === 0 ? (
          <p className="mt-2 text-body-sm text-muted">No documents attached.</p>
        ) : (
          <ul
            aria-label="Medical documents"
            className="mt-2 flex flex-col gap-2"
          >
            {medical.documents.map((document) => (
              <li
                key={document.fileId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface px-4 py-2"
              >
                <span className="min-w-0 break-all text-body-sm">
                  {document.fileName}
                </span>
                <Button
                  variant="secondary"
                  className="h-9"
                  loading={downloading === document.fileId}
                  onClick={() => void download(document.fileId)}
                  aria-label={`Download ${document.fileName}`}
                >
                  Download
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
