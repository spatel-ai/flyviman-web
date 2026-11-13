"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<
  ComponentProps<typeof CheckboxPrimitive.Root>,
  "children"
> {
  /** Always visible. May contain links (for example to terms). */
  label: ReactNode;
  hint?: string;
  /** Says what is wrong and how to fix it. */
  error?: string;
}

/**
 * A labelled checkbox with the same field contract as Input. For React Hook
 * Form, pass `checked`, `onCheckedChange` and `name` from a Controller.
 */
export function Checkbox({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;
  const messageId = `${checkboxId}-message`;
  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-11 items-center gap-3">
        <CheckboxPrimitive.Root
          id={checkboxId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-sm border border-border bg-surface text-accent-foreground",
            "transition-colors duration-150 ease-standard",
            "aria-checked:border-accent-fill aria-checked:bg-accent-fill",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-danger",
            className,
          )}
          {...props}
        >
          <CheckboxPrimitive.Indicator>
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3.5"
            >
              <path d="M3.5 8.5l3 3 6-7" />
            </svg>
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        <label htmlFor={checkboxId} className="text-body-sm text-foreground">
          {label}
        </label>
      </div>
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
