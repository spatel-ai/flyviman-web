"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { channelLabel } from "@/lib/format/labels";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { applyApiError, messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { placeholderProblem } from "./placeholders";
import { templateSchema, type TemplateValues } from "./schema";

type Template = Schemas["NotificationTemplateResponseDto"];

export function TemplatesTab({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Template | null>(null);
  const key = queryKeys.adminContent("templates");
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: key,
    queryFn: () => apiFetch<Template[]>("admin/content/notification-templates"),
  });
  const rows = data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-reading text-body-sm text-muted">
        Wording for emails, texts and in-app messages. Every {"{{placeholder}}"}{" "}
        the built-in wording uses must stay, because that is how the code or
        link reaches the person.
      </p>
      {isError ? (
        <LoadError
          what="the templates"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : isPending ? (
        <Skeleton className="h-48" />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Template</TableHeaderCell>
              <TableHeaderCell>Channel</TableHeaderCell>
              <TableHeaderCell>Wording</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((template) => (
              <TableRow key={`${template.key}-${template.channel}`}>
                <TableCell className="whitespace-nowrap">
                  {template.key}
                </TableCell>
                <TableCell>{channelLabel(template.channel)}</TableCell>
                <TableCell>
                  {template.stored ? (
                    <Badge tone="info">Edited</Badge>
                  ) : (
                    <Badge>Built-in</Badge>
                  )}
                  {template.isActive ? null : <Badge tone="warning">Off</Badge>}
                </TableCell>
                <TableCell>
                  {canEdit ? (
                    <Button
                      variant="secondary"
                      className="h-9"
                      aria-label={`Edit ${template.key} ${channelLabel(template.channel)}`}
                      onClick={() => setEditing(template)}
                    >
                      Edit
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
          title="Edit template"
          description={
            editing
              ? `${editing.key} over ${channelLabel(editing.channel)}`
              : undefined
          }
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        >
          {editing ? (
            <TemplateForm
              template={editing}
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

function TemplateForm({
  template,
  onDone,
}: {
  template: Template;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const hasSubject = template.subject !== null;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<TemplateValues | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<TemplateValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      subject: template.subject ?? "",
      body: template.body,
      isActive: template.isActive,
    },
  });

  const save = useMutation({
    mutationFn: (values: TemplateValues) =>
      apiFetch<Template>(
        `admin/content/notification-templates/${encodeURIComponent(template.key)}`,
        {
          method: "PUT",
          body: {
            channel: template.channel,
            baseVersion: template.version,
            subject: hasSubject ? values.subject : null,
            body: values.body,
            isActive: values.isActive,
          },
        },
      ),
    onSuccess: () => {
      toast({ title: "Template saved", tone: "success" });
      onDone();
    },
    onError: (failure) => {
      setPending(null);
      if (
        failure instanceof ApiError &&
        failure.code === "CONTENT_VERSION_CONFLICT"
      ) {
        toast({ title: messageFor(failure), tone: "danger" });
        onDone();
        return;
      }
      setError(
        applyApiError(failure, setFieldError, ["subject", "body", "isActive"]),
      );
    },
  });

  function review(values: TemplateValues) {
    const problem = placeholderProblem(
      template.placeholders,
      hasSubject ? values.subject : "",
      values.body,
    );
    if (problem) {
      setError(problem);
      return;
    }
    if (
      (hasSubject
        ? values.subject === (template.subject ?? "").trim()
        : true) &&
      values.body === template.body &&
      values.isActive === template.isActive
    ) {
      setError("Nothing has changed. Edit the wording first.");
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
      {template.placeholders.length > 0 ? (
        <p className="text-body-sm text-muted">
          Required:{" "}
          {template.placeholders.map((name) => `{{${name}}}`).join(", ")}
        </p>
      ) : null}
      {hasSubject ? (
        <Input
          label="Subject"
          maxLength={200}
          error={errors.subject?.message}
          {...register("subject")}
        />
      ) : null}
      <Textarea
        label="Message"
        maxLength={5000}
        error={errors.body?.message}
        {...register("body")}
      />
      <Controller
        control={control}
        name="isActive"
        render={({ field }) => (
          <Checkbox
            label="Use this wording"
            hint="When off, the built-in wording is sent."
            checked={field.value}
            onCheckedChange={(checked) => field.onChange(checked === true)}
          />
        )}
      />
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="secondary" className="h-10">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" className="h-10">
          Save
        </Button>
      </DialogFooter>
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && !save.isPending && setPending(null)}
        title="Publish this wording?"
        description={`Messages sent over ${channelLabel(template.channel)} for ${template.key} use this wording from now on.`}
        confirmLabel="Publish"
        loading={save.isPending}
        onConfirm={() => pending && save.mutate(pending)}
      />
    </form>
  );
}
