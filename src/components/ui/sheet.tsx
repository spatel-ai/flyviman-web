"use client";

import { useRef, type ComponentProps } from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

type Side = "right" | "left";

// From the md breakpoint the sheet is a full-height panel on one side.
const SIDES: Record<Side, string> = {
  right:
    "md:right-0 md:left-auto md:starting:translate-x-full md:starting:translate-y-0",
  left: "md:right-auto md:left-0 md:starting:-translate-x-full md:starting:translate-y-0",
};

/** Controlled (`open`, `onOpenChange`) or uncontrolled with a SheetTrigger. */
export const Sheet = SheetPrimitive.Root;

/** Use `asChild` to make an existing button the trigger. */
export const SheetTrigger = SheetPrimitive.Trigger;

/** Closes the sheet. Wrap navigation links with `asChild` to close on tap. */
export const SheetClose = SheetPrimitive.Close;

export interface SheetContentProps extends Omit<
  ComponentProps<typeof SheetPrimitive.Content>,
  "title"
> {
  /** Required: names the sheet for everyone, including screen readers. */
  title: string;
  description?: string;
  /** Keeps the title for screen readers only, for example on a nav drawer. */
  hideTitle?: boolean;
  /** Edge it slides from at the md breakpoint and up. Mobile: the bottom. */
  side?: Side;
}

/**
 * A panel that slides from the bottom on mobile and from one side from the
 * md breakpoint. Focus is trapped while open and returns to the trigger.
 */
export function SheetContent({
  title,
  description,
  hideTitle = false,
  side = "right",
  className,
  children,
  onKeyDown,
  ...props
}: SheetContentProps) {
  const closeButton = useRef<HTMLButtonElement>(null);
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-250 ease-standard starting:opacity-0" />
      <SheetPrimitive.Content
        // Radix warns when a dialog has no description; none is intended here.
        {...(description ? {} : { "aria-describedby": undefined })}
        data-side={side}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-5/6 flex-col gap-4 overflow-y-auto rounded-t-xl bg-surface-raised p-6 text-foreground shadow-lg",
          "transition duration-450 ease-emphasis starting:translate-y-full",
          "md:inset-y-0 md:max-h-none md:w-full md:max-w-sm md:rounded-none",
          SIDES[side],
          className,
        )}
        {...props}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          // See DialogContent: Escape closes the sheet even while a toast,
          // which Radix treats as a newer layer, is still showing.
          if (event.key === "Escape" && !event.defaultPrevented) {
            event.stopPropagation();
            closeButton.current?.click();
          }
        }}
      >
        <div
          className={cn("flex flex-col gap-1.5 pr-10", hideTitle && "sr-only")}
        >
          <SheetPrimitive.Title className="text-title">
            {title}
          </SheetPrimitive.Title>
          {description ? (
            <SheetPrimitive.Description className="text-body-sm text-muted">
              {description}
            </SheetPrimitive.Description>
          ) : null}
        </div>
        {children}
        <SheetPrimitive.Close
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
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
