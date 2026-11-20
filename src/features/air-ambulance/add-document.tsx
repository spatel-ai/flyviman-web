"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import { ACCEPTED_FILE_TYPES, fileProblem, uploadFile } from "@/lib/uploads";

/** Adds one medical document to the customer's open request. */
export function AddDocument({ reference }: { reference: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileKey, setFileKey] = useState(0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setFormError(null);
    const problem = file ? fileProblem(file) : "Choose a file to upload.";
    setFileError(problem);
    if (!file || problem) return;
    setBusy(true);
    try {
      const fileId = await uploadFile("AIR_AMBULANCE_DOCUMENT", file);
      await apiFetch(
        `air-ambulance/requests/${encodeURIComponent(reference)}/documents`,
        { method: "POST", body: { fileId } },
      );
      setFile(null);
      setFileKey((value) => value + 1);
      toast({ title: "Document added", tone: "success" });
    } catch (error) {
      setFormError(messageFor(error));
    } finally {
      setBusy(false);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.airAmbulanceRequest(reference),
      });
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void onSubmit(event)}
      aria-label="Add a document"
      className="flex flex-col gap-3"
    >
      <FormAlert message={formError} />
      <Input
        key={fileKey}
        label="Add a document"
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
          Upload document
        </Button>
      </div>
    </form>
  );
}
