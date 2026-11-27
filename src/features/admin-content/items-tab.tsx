"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  TruncatedCell,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";

type Item = Schemas["ContentItemResponseDto"];

interface Props {
  path: "banners" | "faqs";
  noun: string;
  titleLabel: string;
  bodyLabel: string;
}

/** Banners and questions: the same list, form and publish switch. */
export function ItemsTab({ path, noun, titleLabel, bodyLabel }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const key = queryKeys.adminContent(path);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: key,
    queryFn: () => apiFetch<Item[]>(`admin/content/${path}`),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  const toggle = useMutation({
    mutationFn: (item: Item) =>
      apiFetch<Item>(`admin/content/${path}/${item.id}`, {
        method: "PATCH",
        body: { published: !item.publishedAt },
      }),
    onSuccess: (_result, item) => {
      void refresh();
      toast({
        title: item.publishedAt ? "Unpublished" : "Published",
        tone: "success",
      });
    },
    onError: (failure) => toast({ title: messageFor(failure), tone: "danger" }),
  });

  const remove = useMutation({
    mutationFn: (item: Item) =>
      apiFetch<null>(`admin/content/${path}/${item.id}`, { method: "DELETE" }),
    onSuccess: () => {
      void refresh();
      setDeleting(null);
      toast({ title: "Deleted", tone: "success" });
    },
    onError: (failure) => toast({ title: messageFor(failure), tone: "danger" }),
  });

  const rows = data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button className="h-10" onClick={() => setEditing("new")}>
          Add {noun}
        </Button>
      </div>

      {isError ? (
        <LoadError
          what={`the ${noun}s`}
          error={error}
          onRetry={() => void refetch()}
        />
      ) : isPending ? (
        <Skeleton className="h-48" />
      ) : rows.length === 0 ? (
        <EmptyState
          title={`No ${noun}s yet`}
          description={`Add a ${noun}. It stays a draft until you publish it.`}
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{titleLabel}</TableHeaderCell>
              <TableHeaderCell>Order</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.id}>
                <TruncatedCell
                  className="w-full max-w-0 min-w-40"
                  title={item.title}
                >
                  {item.title}
                </TruncatedCell>
                <TableCell>{item.sortOrder}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {item.publishedAt ? (
                    <Badge tone="success">Published</Badge>
                  ) : (
                    <Badge tone="warning">Draft</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="h-9"
                      aria-label={`Edit ${item.title}`}
                      onClick={() => setEditing(item)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-9"
                      aria-label={`${item.publishedAt ? "Unpublish" : "Publish"} ${item.title}`}
                      disabled={toggle.isPending}
                      onClick={() => toggle.mutate(item)}
                    >
                      {item.publishedAt ? "Unpublish" : "Publish"}
                    </Button>
                    <Button
                      variant="danger"
                      className="h-9"
                      aria-label={`Delete ${item.title}`}
                      onClick={() => setDeleting(item)}
                    >
                      Delete
                    </Button>
                  </div>
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
          title={editing === "new" ? `Add ${noun}` : `Edit ${noun}`}
          description="Check the preview before you publish."
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        >
          {editing ? (
            <ItemForm
              key={editing === "new" ? "new" : editing.id}
              path={path}
              item={editing === "new" ? undefined : editing}
              titleLabel={titleLabel}
              bodyLabel={bodyLabel}
              onDone={() => {
                setEditing(null);
                void refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete this ${noun}?`}
        description={`"${deleting?.title ?? ""}" is removed for good. To hide it for now, unpublish it instead.`}
        confirmLabel={`Delete ${noun}`}
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </div>
  );
}

function ItemForm({
  path,
  item,
  titleLabel,
  bodyLabel,
  onDone,
}: {
  path: string;
  item?: Item;
  titleLabel: string;
  bodyLabel: string;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(item?.title ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [region, setRegion] = useState(item?.region ?? "");
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0));
  const [published, setPublished] = useState(Boolean(item?.publishedAt));
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const data = {
        title: title.trim(),
        body: body.trim(),
        sortOrder: Number(sortOrder) || 0,
        published,
      };
      return item
        ? apiFetch(`admin/content/${path}/${item.id}`, {
            method: "PATCH",
            body: { ...data, region: region.trim() || null },
          })
        : apiFetch(`admin/content/${path}`, {
            method: "POST",
            body: {
              ...data,
              ...(region.trim() ? { region: region.trim() } : {}),
            },
          });
    },
    onSuccess: () => {
      toast({ title: item ? "Saved" : "Added", tone: "success" });
      onDone();
    },
    onError: (failure) => setError(messageFor(failure)),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError(
        `Enter the ${titleLabel.toLowerCase()} and the ${bodyLabel.toLowerCase()}.`,
      );
      return;
    }
    setError(null);
    save.mutate();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <FormAlert message={error} />
      <Input
        label={titleLabel}
        value={title}
        maxLength={200}
        onChange={(event) => setTitle(event.target.value)}
      />
      <Textarea
        label={bodyLabel}
        value={body}
        maxLength={5000}
        onChange={(event) => setBody(event.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Region"
          hint="Optional, for example IN."
          value={region}
          maxLength={8}
          onChange={(event) => setRegion(event.target.value)}
        />
        <Input
          label="Order"
          type="number"
          min={0}
          max={10000}
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
        />
      </div>
      <Checkbox
        label="Published"
        checked={published}
        onCheckedChange={(checked) => setPublished(checked === true)}
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
          aria-label="Preview"
          role="region"
          className="rounded-md border border-border bg-surface-raised p-4"
        >
          <p className="text-body font-semibold">{title || titleLabel}</p>
          <p className="mt-2 whitespace-pre-line text-body text-muted">
            {body || bodyLabel}
          </p>
        </div>
      ) : null}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="secondary" className="h-10">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" className="h-10" loading={save.isPending}>
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
