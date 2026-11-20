"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { applyApiError } from "@/lib/api/messages";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { noteSchema, type NoteValues } from "./schema";

type Note = Schemas["BookingNoteDto"];

/** Internal notes: never shown to the customer, the operator or finance. */
export function Notes({
  reference,
  notes,
}: {
  reference: string;
  notes: Note[];
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError: setFieldError,
    formState: { errors },
  } = useForm<NoteValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { note: "" },
  });

  const add = useMutation({
    mutationFn: (values: NoteValues) =>
      apiFetch(`admin/bookings/${reference}/notes`, {
        method: "POST",
        body: { note: values.note.trim() },
      }),
    onSuccess: async () => {
      reset();
      toast({ title: "Note added", tone: "success" });
      await queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
    },
    onError: (failure) =>
      setError(applyApiError(failure, setFieldError, ["note"])),
  });

  return (
    <section aria-labelledby="notes-heading" className="flex flex-col gap-3">
      <h2 id="notes-heading" className="text-title">
        Internal notes
      </h2>
      <p className="text-body-sm text-muted">
        Only Flyviman operations see these. Never put medical details here.
      </p>
      {notes.length === 0 ? (
        <p className="text-body-sm text-muted">No notes yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg bg-surface p-4">
              <p className="text-caption text-muted">
                {formatDateTime(note.createdAt)}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-body-sm">
                {note.body}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Card>
        <form
          noValidate
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            setError(null);
            void handleSubmit((values) => add.mutate(values))(event);
          }}
        >
          <FormAlert message={error} />
          <Textarea
            label="Add a note"
            rows={3}
            maxLength={2000}
            error={errors.note?.message}
            {...register("note")}
          />
          <div>
            <Button type="submit" className="h-10" loading={add.isPending}>
              Add note
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
