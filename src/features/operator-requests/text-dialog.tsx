"use client";

import { useState } from "react";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { messageFor } from "@/lib/api/messages";

export interface TextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  label: string;
  hint?: string;
  submitLabel: string;
  maxLength: number;
  /** Throw to keep the dialog open with the error; return to close it. */
  onSubmit: (text: string) => Promise<void>;
}

/** A dialog with one required text field: a question, a note, a decision. */
export function TextDialog({
  open,
  onOpenChange,
  title,
  description,
  ...body
}: TextDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description}>
        {/* Mounted only while open, so the field starts empty. */}
        <TextDialogBody {...body} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function TextDialogBody({
  label,
  hint,
  submitLabel,
  maxLength,
  onSubmit,
  onDone,
}: Omit<TextDialogProps, "open" | "onOpenChange" | "title" | "description"> & {
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const trimmed = text.trim();
  const tooLong = trimmed.length > maxLength;

  async function submit() {
    if (!trimmed || tooLong) return;
    setPending(true);
    setProblem(null);
    try {
      await onSubmit(trimmed);
      onDone();
    } catch (error) {
      setProblem(messageFor(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <FormAlert message={problem} />
      <Textarea
        label={label}
        hint={hint}
        rows={4}
        value={text}
        onChange={(event) => setText(event.target.value)}
        error={tooLong ? `Keep this under ${maxLength} characters` : undefined}
      />
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary" className="h-10">
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="submit"
          className="h-10"
          loading={pending}
          disabled={!trimmed || tooLong}
        >
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
