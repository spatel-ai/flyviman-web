"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { EmptyState } from "@/components/shared/empty-state";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { Button } from "@/components/ui/button";
import {
  ConfirmDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { applyApiError, messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { policySchema, type PolicyValues } from "./schema";

type Policy = Schemas["AdminPolicyResponseDto"];

export function PoliciesTab({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Policy | null>(null);
  const key = queryKeys.adminContent("policies");
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: key,
    queryFn: () => apiFetch<Policy[]>("admin/content/policies"),
  });
  const rows = data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-reading text-body-sm text-muted">
        Editing a policy publishes a new version. The text customers already
        accepted is kept, never overwritten.
      </p>
      {isError ? (
        <LoadError
          what="the policies"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : isPending ? (
        <Skeleton className="h-32" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No policies yet"
          description="Policies appear here once published."
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Policy</TableHeaderCell>
              <TableHeaderCell>Version</TableHeaderCell>
              <TableHeaderCell>Published</TableHeaderCell>
              <TableHeaderCell>Versions kept</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((policy) => (
              <TableRow key={policy.slug}>
                <TableCell>
                  {policy.title}
                  <span className="block text-body-sm text-muted">
                    {policy.slug}
                  </span>
                </TableCell>
                <TableCell>{policy.version}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {policy.publishedAt
                    ? formatDateTime(policy.publishedAt)
                    : "Not published"}
                </TableCell>
                <TableCell>{policy.versionCount}</TableCell>
                <TableCell>
                  {canEdit ? (
                    <Button
                      variant="secondary"
                      className="h-9"
                      aria-label={`New version of ${policy.title}`}
                      onClick={() => setEditing(policy)}
                    >
                      New version
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent
          title="Publish a new version"
          description={
            editing
              ? `${editing.title}, now at version ${editing.version}.`
              : undefined
          }
          className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        >
          {editing ? (
            <PolicyForm
              policy={editing}
              onDone={() => {
                setEditing(null);
                void queryClient.invalidateQueries({ queryKey: key });
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PolicyForm({
  policy,
  onDone,
}: {
  policy: Policy;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PolicyValues | null>(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    control,
    formState: { errors },
  } = useForm<PolicyValues>({
    resolver: zodResolver(policySchema),
    defaultValues: { title: policy.title, body: policy.body },
  });
  const [title, body] = useWatch({ control, name: ["title", "body"] });

  const publish = useMutation({
    mutationFn: (values: PolicyValues) =>
      apiFetch<Policy>(
        `admin/content/policies/${encodeURIComponent(policy.slug)}`,
        {
          method: "PUT",
          body: {
            title: values.title,
            body: values.body,
            baseVersion: policy.versionCount ?? 0,
          } satisfies Schemas["PublishPolicyDto"],
        },
      ),
    onSuccess: (result) => {
      toast({
        title: `Published version ${result.data.version}`,
        tone: "success",
      });
      onDone();
    },
    onError: (failure) => {
      setPending(null);
      if (
        failure instanceof ApiError &&
        failure.code === "CONTENT_VERSION_CONFLICT"
      ) {
        // Another admin published first: reload the list and close this editor.
        toast({ title: messageFor(failure), tone: "danger" });
        onDone();
        return;
      }
      setError(applyApiError(failure, setFieldError, ["title", "body"]));
    },
  });

  function review(values: PolicyValues) {
    if (
      values.title === policy.title.trim() &&
      values.body === policy.body.trim()
    ) {
      setError("Nothing has changed. Edit the title or the text first.");
      return;
    }
    setError(null);
    setPending(values);
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => void handleSubmit(review)(event)}
      noValidate
    >
      <FormAlert message={error} />
      <Input
        label="Title"
        maxLength={200}
        error={errors.title?.message}
        {...register("title")}
      />
      <Textarea
        label="Text"
        hint="Plain text with blank lines between paragraphs."
        rows={12}
        maxLength={50000}
        error={errors.body?.message}
        {...register("body")}
      />
      <Button
        type="button"
        variant="secondary"
        className="h-10 self-start"
        aria-expanded={preview}
        onClick={() => setPreview((open) => !open)}
      >
        {preview ? "Hide preview" : "Preview"}
      </Button>
      {preview ? (
        <div
          role="region"
          aria-label="Preview"
          className="rounded-md border border-border bg-surface-raised p-4"
        >
          <p className="text-body font-semibold">{title}</p>
          <p className="mt-2 whitespace-pre-line text-body text-muted">
            {body}
          </p>
        </div>
      ) : null}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="secondary" className="h-10">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" className="h-10">
          Publish new version
        </Button>
      </DialogFooter>
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && !publish.isPending && setPending(null)}
        title="Publish this version?"
        description={`${policy.title} goes live for every customer at once. The earlier text is kept, but the new version applies from now.`}
        confirmLabel="Publish"
        loading={publish.isPending}
        onConfirm={() => pending && publish.mutate(pending)}
      />
    </form>
  );
}
