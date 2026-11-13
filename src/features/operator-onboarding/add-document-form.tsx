"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { indiaToday } from "@/lib/format/expiry";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { FormAlert } from "@/components/shared/form-alert";
import { ApiError } from "@/lib/api/errors";
import { hasCode, onboardingMessage } from "./messages";
import {
  ACCEPTED_FILE_TYPES,
  DOCUMENT_TYPES,
  fileProblem,
  type DocumentType,
  type OperatorDocument,
} from "./schema";

type Step = "idle" | "preparing" | "uploading" | "saving";

const STEP_LABEL: Record<Step, string> = {
  idle: "Add document",
  preparing: "Preparing…",
  uploading: "Uploading…",
  saving: "Saving…",
};

const UPLOAD_FAILED =
  "The upload did not complete. Check your connection and try again.";

/**
 * Sends the file straight to storage using the signed target. A refusal
 * from storage keeps its error code, so the form can say what was wrong.
 */
async function putFile(
  upload: Schemas["PresignUploadResponseDto"]["upload"],
  file: File,
): Promise<void> {
  let response: Response;
  try {
    // The one documented exception to "everything through apiFetch": this is
    // a signed storage URL, not our API. It carries its own authorisation,
    // so no cookies and no CSRF header are sent.
    response = await fetch(upload.url, {
      method: upload.method,
      headers: upload.headers as Record<string, string>,
      body: file,
      credentials: "omit",
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", UPLOAD_FAILED);
  }
  if (response.ok) return;

  const body = (await response.json().catch(() => null)) as {
    error?: { code?: string };
  } | null;
  const code =
    body?.error?.code ??
    (response.status === 413 ? "UPLOAD_TOO_LARGE" : "UPLOAD_FAILED");
  throw new ApiError(response.status, code, UPLOAD_FAILED);
}

export function AddDocumentForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [type, setType] = useState<DocumentType | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [typeError, setTypeError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [expiryError, setExpiryError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("idle");
  // Remounts the file input, the only way to clear a chosen file.
  const [fileKey, setFileKey] = useState(0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== "idle") return;
    setFormError(null);

    const missingType = type === "";
    const problem = file ? fileProblem(file) : "Choose a file to upload.";
    // The API refuses an expiry in the past; say so before uploading.
    const pastExpiry = expiresAt !== "" && expiresAt < indiaToday();
    setTypeError(missingType ? "Choose the type of document." : null);
    setFileError(problem);
    setExpiryError(
      pastExpiry ? "This date has passed. Upload the current copy." : null,
    );
    if (missingType || !file || problem || pastExpiry) return;

    try {
      setStep("preparing");
      const { data: presigned } = await apiFetch<
        Schemas["PresignUploadResponseDto"]
      >("uploads/presign", {
        method: "POST",
        body: {
          purpose: "OPERATOR_DOCUMENT",
          fileName: file.name,
          // Checked against the accepted types by fileProblem above.
          contentType: file.type as Schemas["PresignUploadDto"]["contentType"],
          sizeBytes: file.size,
        } satisfies Schemas["PresignUploadDto"],
      });

      setStep("uploading");
      await putFile(presigned.upload, file);

      setStep("saving");
      await apiFetch<OperatorDocument>("operator/documents", {
        method: "POST",
        body: {
          type,
          fileId: presigned.fileId,
          expiresAt: expiresAt === "" ? null : expiresAt,
        } satisfies Schemas["AddOperatorDocumentDto"],
      });

      setType("");
      setFile(null);
      setExpiresAt("");
      setFileKey((key) => key + 1);
      toast({ title: "Document added", tone: "success" });
    } catch (error) {
      setFormError(
        hasCode(error, "UPLOAD_FAILED") || hasCode(error, "NETWORK_ERROR")
          ? UPLOAD_FAILED
          : onboardingMessage(error),
      );
      // The status moved on since this page loaded: update the shell too.
      if (hasCode(error, "OPERATOR_UNDER_REVIEW")) router.refresh();
    } finally {
      setStep("idle");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.operatorDocuments,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.operatorProfile,
      });
    }
  }

  const busy = step !== "idle";

  return (
    <form
      noValidate
      onSubmit={(event) => void onSubmit(event)}
      aria-labelledby="add-document-heading"
      className="flex flex-col gap-4"
    >
      <h3 id="add-document-heading" className="text-body font-medium">
        Add a document
      </h3>
      <FormAlert message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Document type"
          placeholder="Choose a type"
          options={[...DOCUMENT_TYPES]}
          value={type}
          onValueChange={(value) => {
            setType(value as DocumentType);
            setTypeError(null);
          }}
          disabled={busy}
          error={typeError ?? undefined}
        />
        <Input
          label="Expiry date (optional)"
          type="date"
          min={indiaToday()}
          value={expiresAt}
          onChange={(event) => {
            setExpiresAt(event.target.value);
            setExpiryError(null);
          }}
          disabled={busy}
          error={expiryError ?? undefined}
          hint="We remind you 30 days, 7 days and on the day before it lapses."
        />
      </div>
      <Input
        key={fileKey}
        label="File"
        type="file"
        accept={ACCEPTED_FILE_TYPES.join(",")}
        hint="PDF, JPEG or PNG, up to 10 MB."
        error={fileError ?? undefined}
        disabled={busy}
        onChange={(event) => {
          const chosen = event.target.files?.[0] ?? null;
          setFile(chosen);
          setFileError(chosen ? fileProblem(chosen) : null);
        }}
        className="w-full min-w-0 py-1.5 text-body-sm file:mr-3 file:rounded-pill file:border-0 file:bg-border/60 file:px-3 file:py-1 file:text-body-sm file:text-foreground"
      />
      <div>
        <Button type="submit" variant="secondary" loading={busy}>
          {STEP_LABEL[step]}
        </Button>
        <p className="sr-only" role="status">
          {busy ? STEP_LABEL[step] : ""}
        </p>
      </div>
    </form>
  );
}
