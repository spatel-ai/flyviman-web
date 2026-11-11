"use client";

import {
  useId,
  useRef,
  useState,
  type ComponentProps,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Controlled (`open`, `onOpenChange`) or uncontrolled with a DialogTrigger. */
export const Dialog = DialogPrimitive.Root;

/** Use `asChild` to make an existing Button the trigger. */
export const DialogTrigger = DialogPrimitive.Trigger;

/** Closes the dialog. Use `asChild` around a Button in the footer. */
export const DialogClose = DialogPrimitive.Close;

export interface DialogContentProps extends Omit<
  ComponentProps<typeof DialogPrimitive.Content>,
  "title"
> {
  /** Required: names the dialog for everyone, including screen readers. */
  title: string;
  description?: string;
}

/**
 * The dialog panel. Focus is trapped inside while it is open and returns to
 * the trigger on close; Escape and a click outside close it.
 */
export function DialogContent({
  title,
  description,
  className,
  children,
  onKeyDown,
  ...props
}: DialogContentProps) {
  const closeButton = useRef<HTMLButtonElement>(null);
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-scrim p-4 transition-opacity duration-250 ease-standard starting:opacity-0">
        <DialogPrimitive.Content
          // Radix warns when a dialog has no description; none is intended here.
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            "relative flex w-full max-w-lg flex-col gap-4 rounded-lg bg-surface-raised p-6 text-foreground shadow-lg",
            "transition duration-450 ease-emphasis starting:scale-95 starting:opacity-0",
            className,
          )}
          {...props}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            // Radix lets only the most recently opened layer react to
            // Escape, and a toast that is still showing counts as one. The
            // dialog holds the focus, so Escape always means "close this".
            if (event.key === "Escape" && !event.defaultPrevented) {
              event.stopPropagation();
              closeButton.current?.click();
            }
          }}
        >
          <div className="flex flex-col gap-1.5 pr-10">
            <DialogPrimitive.Title className="text-title">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-body-sm text-muted">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          {children}
          <DialogPrimitive.Close
            ref={closeButton}
            aria-label="Close"
            className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-pill text-muted transition-colors duration-150 ease-standard hover:bg-surface hover:text-foreground"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="size-4"
            >
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
            </svg>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Overlay>
    </DialogPrimitive.Portal>
  );
}

/** Action row: stacked on mobile, right-aligned from the sm breakpoint. */
export function DialogFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

/** The API refuses a reason shorter than this. */
export const REASON_MIN_LENGTH = 3;

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Says what will happen and whether it can be undone. */
  description: string;
  /** Names the action, for example "Suspend operator". */
  confirmLabel: string;
  cancelLabel?: string;
  /** Uses the destructive button for the confirming action. */
  destructive?: boolean;
  /** Shows a required "Reason" field; confirm stays disabled until filled. */
  requireReason?: boolean;
  /** Receives the trimmed reason when `requireReason` is set. */
  onConfirm: (reason?: string) => void;
  /** Shows progress and blocks a repeat confirmation. */
  loading?: boolean;
}

/**
 * Confirmation for destructive and irreversible portal actions (suspend,
 * reject, override, refund). It does not close itself on confirm: the caller
 * closes it when the action has succeeded.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  ...body
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description}>
        <ConfirmDialogBody {...body} />
      </DialogContent>
    </Dialog>
  );
}

// Mounted only while the dialog is open, so the reason starts empty each time.
function ConfirmDialogBody({
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  requireReason = false,
  onConfirm,
  loading = false,
}: Omit<
  ConfirmDialogProps,
  "open" | "onOpenChange" | "title" | "description"
>): ReactNode {
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (requireReason && trimmed.length < REASON_MIN_LENGTH) return;
        onConfirm(requireReason ? trimmed : undefined);
      }}
    >
      {requireReason ? (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={reasonId}
            className="text-body-sm font-medium text-foreground"
          >
            Reason
          </label>
          <textarea
            id={reasonId}
            required
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-describedby={`${reasonId}-hint`}
            className="rounded-sm border border-border bg-surface px-3.5 py-2.5 text-body-sm text-foreground transition-colors duration-150 ease-standard placeholder:text-subtle"
          />
          <p id={`${reasonId}-hint`} className="text-caption text-muted">
            Recorded with this action.
          </p>
        </div>
      ) : null}
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary">{cancelLabel}</Button>
        </DialogClose>
        <Button
          type="submit"
          variant={destructive ? "destructive" : "primary"}
          loading={loading}
          disabled={requireReason && trimmed.length < REASON_MIN_LENGTH}
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
