"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { LocationField } from "@/components/shared/location-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MOBILITY_OPTIONS } from "@/lib/air-ambulance/labels";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { applyApiError } from "@/lib/api/messages";
import type { Schemas } from "@/lib/api/types";
import { todayIn } from "@/lib/format/zoned";
import { newKey } from "@/lib/idempotency";
import { ACCEPTED_FILE_TYPES, fileProblem, uploadFile } from "@/lib/uploads";
import {
  EMPTY_REQUEST,
  MAX_DOCUMENTS,
  REQUEST_ALIASES,
  REQUEST_FIELDS,
  REQUEST_ZONE,
  requestSchema,
  toRequestBody,
  type RequestOutput,
  type RequestValues,
} from "./schema";

type Step = "idle" | "sending" | "uploading";

/**
 * The air ambulance request (W4-6). One page, never animated, nothing saved
 * in the browser (medical details are never cached). One Idempotency-Key per
 * request, so a double tap or a retry creates one request (rule 5). The
 * documents are attached after the request exists; one that fails is added
 * again from the request's page, never by sending the request again.
 */
export function RequestForm() {
  const router = useRouter();
  const [key] = useState(newKey);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [fileKey, setFileKey] = useState(0);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RequestValues, unknown, RequestOutput>({
    resolver: zodResolver(requestSchema),
    defaultValues: EMPTY_REQUEST,
  });

  function addFiles(chosen: File[]) {
    setFileKey((value) => value + 1);
    const problem = chosen.map(fileProblem).find(Boolean);
    if (problem) {
      setFileError(problem);
      return;
    }
    const next = [...files, ...chosen];
    if (next.length > MAX_DOCUMENTS) {
      setFileError(`Attach up to ${MAX_DOCUMENTS} documents.`);
      return;
    }
    setFileError(null);
    setFiles(next);
  }

  async function onSubmit(values: RequestOutput) {
    if (step !== "idle") return;
    setFormError(null);
    let reference: string;
    try {
      setStep("sending");
      const { data } = await apiFetch<Schemas["AirAmbulanceCreatedDto"]>(
        "air-ambulance/requests",
        {
          method: "POST",
          headers: { "Idempotency-Key": key },
          body: toRequestBody(values),
        },
      );
      reference = data.reference;
    } catch (error) {
      setStep("idle");
      setFormError(
        error instanceof ApiError && error.code === "CATEGORY_DISABLED"
          ? "We are not taking air ambulance requests at the moment. For an immediate emergency, call 112 or your local emergency services now."
          : applyApiError(error, setError, REQUEST_FIELDS, REQUEST_ALIASES),
      );
      return;
    }

    setStep("uploading");
    let failed = 0;
    for (const file of files) {
      try {
        const fileId = await uploadFile("AIR_AMBULANCE_DOCUMENT", file);
        await apiFetch<Schemas["AirAmbulanceDocumentDto"]>(
          `air-ambulance/requests/${encodeURIComponent(reference)}/documents`,
          { method: "POST", body: { fileId } },
        );
      } catch {
        failed += 1;
      }
    }
    router.push(
      `/account/air-ambulance/${encodeURIComponent(reference)}${
        failed > 0 ? "?documents=incomplete" : "?sent=1"
      }`,
    );
  }

  const busy = step !== "idle";

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-10"
      aria-label="Air ambulance request"
    >
      <FormAlert message={formError} />

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 text-title">Contact</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Your name"
            autoComplete="name"
            error={errors.contactName?.message}
            {...register("contactName")}
          />
          <Input
            label="Phone"
            type="tel"
            autoComplete="tel"
            hint="With the country code, for example +919876543210."
            error={errors.contactPhone?.message}
            {...register("contactPhone")}
          />
          <Input
            label="Email (optional)"
            type="email"
            autoComplete="email"
            error={errors.contactEmail?.message}
            {...register("contactEmail")}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Second contact's name (optional)"
            error={errors.emergencyContactName?.message}
            {...register("emergencyContactName")}
          />
          <Input
            label="Second contact's phone (optional)"
            type="tel"
            error={errors.emergencyContactPhone?.message}
            {...register("emergencyContactPhone")}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 text-title">Journey</legend>
        {/* min-w-0: a long airport name in a picker must not widen the
            page on phones (it did, and the list opened off screen). */}
        <div className="grid gap-6 md:grid-cols-2 [&>*]:min-w-0">
          <Controller
            control={control}
            name="originLocationId"
            render={({ field, fieldState }) => (
              <LocationField
                label="From"
                searchLabel="Find the airport or helipad nearest the patient"
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="destinationLocationId"
            render={({ field, fieldState }) => (
              <LocationField
                label="To"
                searchLabel="Find the airport or helipad nearest the receiving facility"
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Collection address (optional)"
            hint="Where the patient is now, for example a hospital and ward."
            error={errors.pickupAddress?.message}
            {...register("pickupAddress")}
          />
          <Input
            label="Receiving facility (optional)"
            error={errors.destinationFacility?.message}
            {...register("destinationFacility")}
          />
          <Input
            label="Preferred date"
            type="date"
            min={todayIn(REQUEST_ZONE)}
            error={errors.preferredDate?.message}
            {...register("preferredDate")}
          />
          <Input
            label="Preferred time (India time)"
            type="time"
            error={errors.preferredTime?.message}
            {...register("preferredTime")}
          />
          <Input
            label="Patients"
            inputMode="numeric"
            hint="1 to 4."
            error={errors.patientCount?.message}
            {...register("patientCount")}
          />
          <Input
            label="People travelling with the patient"
            inputMode="numeric"
            hint="0 to 6."
            error={errors.accompanyingPersons?.message}
            {...register("accompanyingPersons")}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-title">Medical details</legend>
        <p className="max-w-reading text-body-sm text-muted">
          Seen only by you, the operations team member handling your request
          and, once you accept a quote, the operator flying the mission.
        </p>
        <Textarea
          label="Patient's condition"
          rows={4}
          error={errors.patientCondition?.message}
          {...register("patientCondition")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="mobility"
            render={({ field, fieldState }) => (
              <Select
                label="Mobility"
                placeholder="Choose one"
                options={MOBILITY_OPTIONS}
                value={field.value}
                onValueChange={field.onChange}
                name={field.name}
                error={fieldState.error?.message}
              />
            )}
          />
          <div className="flex flex-col justify-end">
            <Controller
              control={control}
              name="stretcherRequired"
              render={({ field }) => (
                <Checkbox
                  label="Stretcher needed"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
              )}
            />
            <Controller
              control={control}
              name="oxygenRequired"
              render={({ field }) => (
                <Checkbox
                  label="Oxygen needed"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
              )}
            />
          </div>
          <Input
            label="Medical staff needed (optional)"
            hint="For example a doctor and a nurse."
            error={errors.medicalStaffRequired?.message}
            {...register("medicalStaffRequired")}
          />
          <Input
            label="Equipment needed (optional)"
            hint="For example a ventilator."
            error={errors.equipmentRequired?.message}
            {...register("equipmentRequired")}
          />
        </div>
        <Textarea
          label="Specialised care (optional)"
          rows={3}
          error={errors.specialisedCare?.message}
          {...register("specialisedCare")}
        />
        <Textarea
          label="Anything else (optional)"
          rows={3}
          error={errors.notes?.message}
          {...register("notes")}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-title">
          Medical documents (optional)
        </legend>
        <Input
          key={fileKey}
          label="Add documents"
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES.join(",")}
          hint={`PDF, JPEG or PNG, up to 10 MB each, at most ${MAX_DOCUMENTS}.`}
          error={fileError ?? undefined}
          disabled={busy || files.length >= MAX_DOCUMENTS}
          onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
          className="w-full min-w-0 py-1.5 text-body-sm file:mr-3 file:rounded-pill file:border-0 file:bg-border/60 file:px-3 file:py-1 file:text-body-sm file:text-foreground"
        />
        {files.length > 0 ? (
          <ul aria-label="Chosen documents" className="flex flex-col gap-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-3 rounded-md bg-surface px-4 py-2"
              >
                <span className="min-w-0 break-all text-body-sm">
                  {file.name}
                </span>
                <Button
                  variant="ghost"
                  className="h-9"
                  disabled={busy}
                  aria-label={`Remove ${file.name}`}
                  onClick={() =>
                    setFiles(files.filter((_, at) => at !== index))
                  }
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </fieldset>

      <div className="flex flex-col items-start gap-2">
        <p className="max-w-reading text-body-sm text-muted">
          This sends a request. It is not confirmed until operations and the
          operator have verified the mission and you have accepted a quote.
        </p>
        <Button type="submit" loading={busy}>
          {step === "uploading" ? "Attaching documents…" : "Send request"}
        </Button>
        <p className="sr-only" role="status">
          {step === "sending"
            ? "Sending the request"
            : step === "uploading"
              ? "Attaching documents"
              : ""}
        </p>
      </div>
    </form>
  );
}
