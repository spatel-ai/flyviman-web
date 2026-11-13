import { useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Always visible; placeholders are not labels. */
  label: string;
  hint?: string;
  /** Says what is wrong and how to fix it. */
  error?: string;
}

/** A multi-line text field, styled and labelled like `Input`. */
export function Textarea({
  label,
  hint,
  error,
  id,
  className,
  rows = 5,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={fieldId}
        className="text-body-sm font-medium text-foreground"
      >
        {label}
      </label>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          "min-h-28 rounded-sm border border-border bg-surface px-3.5 py-3 text-body text-foreground",
          "placeholder:text-subtle",
          "transition-colors duration-150 ease-standard",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-danger",
          className,
        )}
        {...props}
      />
      {message ? (
        <p
          id={messageId}
          role={error ? "alert" : undefined}
          className={cn("text-caption", error ? "text-danger" : "text-muted")}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
