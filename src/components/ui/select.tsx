"use client";

import { useId } from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  /** Always visible; placeholders are not labels. */
  label: string;
  options: SelectOption[];
  hint?: string;
  /** Says what is wrong and how to fix it. */
  error?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Submitted with a native form. */
  name?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  /** Applied to the trigger. */
  className?: string;
}

/**
 * A labelled select with the same field contract as Input. For React Hook
 * Form, pass `value`, `onValueChange` and `name` from a Controller.
 */
export function Select({
  label,
  options,
  hint,
  error,
  placeholder = "Select",
  id,
  className,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const messageId = `${selectId}-message`;
  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={selectId}
        className="text-body-sm font-medium text-foreground"
      >
        {label}
      </label>
      <SelectPrimitive.Root {...props}>
        <SelectPrimitive.Trigger
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            "flex h-11 items-center justify-between gap-2 rounded-sm border border-border bg-surface px-3.5 text-left text-body text-foreground",
            "data-placeholder:text-subtle",
            "transition-colors duration-150 ease-standard",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-danger",
            className,
          )}
        >
          <span className="truncate">
            <SelectPrimitive.Value placeholder={placeholder} />
          </span>
          <SelectPrimitive.Icon className="text-muted">
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className="z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-border/60 bg-surface-raised shadow-md"
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    "flex min-h-11 cursor-default items-center justify-between gap-3 rounded-sm px-3 text-body-sm text-foreground outline-none select-none",
                    "data-highlighted:bg-surface",
                    "data-disabled:cursor-not-allowed data-disabled:opacity-50",
                  )}
                >
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="text-accent">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-4"
                    >
                      <path d="M3.5 8.5l3 3 6-7" />
                    </svg>
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
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
