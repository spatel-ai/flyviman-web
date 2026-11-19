"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { Button } from "@/components/ui/button";
import {
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
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";

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
  const [title, setTitle] = useState(policy.title);
  const [body, setBody] = useState(policy.body);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publish = useMutation({
    mutationFn: () =>
      apiFetch<Policy>(
        `admin/content/policies/${encodeURIComponent(policy.slug)}`,
        {
          method: "PUT",
          body: { title: title.trim(), body: body.trim() },
        },
      ),
    onSuccess: (result) => {
      toast({
        title: `Published version ${result.data.version}`,
        tone: "success",
      });
      onDone();
    },
    onError: (failure) => setError(messageFor(failure)),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError("Enter the title and the text.");
      return;
    }
    setError(null);
    publish.mutate();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <FormAlert message={error} />
      <Input
        label="Title"
        value={title}
        maxLength={200}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Textarea
        label="Text"
        hint="Plain text with blank lines between paragraphs."
        rows={12}
        value={body}
        maxLength={50000}
        onChange={(e) => setBody(e.target.value)}
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
        <Button type="submit" className="h-10" loading={publish.isPending}>
          Publish new version
        </Button>
      </DialogFooter>
    </form>
  );
}
