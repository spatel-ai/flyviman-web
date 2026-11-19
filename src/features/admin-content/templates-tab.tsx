"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { placeholderProblem } from "./placeholders";

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
                <TableCell>{template.channel}</TableCell>
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
                      aria-label={`Edit ${template.key} ${template.channel}`}
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
            editing ? `${editing.key} over ${editing.channel}` : undefined
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
  const [subject, setSubject] = useState(template.subject ?? "");
  const [body, setBody] = useState(template.body);
  const [isActive, setIsActive] = useState(template.isActive);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      apiFetch<Template>(
        `admin/content/notification-templates/${encodeURIComponent(template.key)}`,
        {
          method: "PUT",
          body: {
            channel: template.channel,
            subject: hasSubject ? subject.trim() : null,
            body,
            isActive,
          },
        },
      ),
    onSuccess: () => {
      toast({ title: "Template saved", tone: "success" });
      onDone();
    },
    onError: (failure) => setError(messageFor(failure)),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const problem = placeholderProblem(
      template.placeholders,
      hasSubject ? subject : "",
      body,
    );
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    save.mutate();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
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
          value={subject}
          maxLength={200}
          onChange={(e) => setSubject(e.target.value)}
        />
      ) : null}
      <Textarea
        label="Message"
        value={body}
        maxLength={5000}
        onChange={(e) => setBody(e.target.value)}
      />
      <Checkbox
        label="Use this wording"
        hint="When off, the built-in wording is sent."
        checked={isActive}
        onCheckedChange={(checked) => setIsActive(checked === true)}
      />
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
