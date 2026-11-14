"use client";

import { Popover } from "radix-ui";
import { useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const DESKTOP = "(min-width: 768px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Under the sticky header, with a little air. */
const HEADER_CLEARANCE = 64;

function makeRoom(field: HTMLElement, room: number) {
  const rect = field.getBoundingClientRect();
  if (window.innerHeight - rect.bottom >= room) return;
  // Instant: a smooth scroll is cut short when the picker takes focus.
  window.scrollBy({ top: rect.top - HEADER_CLEARANCE, behavior: "instant" });
}

/** True from the md breakpoint up; the server renders the desktop form. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP).matches,
    () => true,
  );
}

/**
 * A picker that opens as a popover under its field on desktop and as a
 * bottom sheet on phones, where a popover would not fit. Popovers and sheets
 * are motion level 1 and 2 (motion-design.md); nothing inside them moves.
 */
export function ResponsivePicker({
  open,
  onOpenChange,
  trigger,
  title,
  children,
  width = "md",
  room = 360,
  align = "start",
  side = "bottom",
  initialFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A button, rendered as the trigger. */
  trigger: ReactNode;
  /** Names the sheet on phones (shown) and the popover (screen readers). */
  title: string;
  children: ReactNode;
  width?: "sm" | "md" | "lg";
  /** Pixels the picker needs below its field (desktop). */
  room?: number;
  align?: "start" | "center";
  /**
   * Where the popover opens on desktop. `left` keeps a field's popover off
   * whatever sits below it (the travellers picker would cover Search).
   */
  side?: "bottom" | "left";
  /**
   * Where focus lands on opening, instead of the first control (a stepper's
   * minus button looked pressed). Give the element `tabIndex={-1}`.
   */
  initialFocus?: RefObject<HTMLElement | null>;
}) {
  const desktop = useIsDesktop();
  const onOpenAutoFocus = initialFocus
    ? (event: Event) => {
        event.preventDefault();
        initialFocus.current?.focus();
      }
    : undefined;
  if (!desktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent title={title} onOpenAutoFocus={onOpenAutoFocus}>
          {children}
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger
        asChild
        // Like a travel site: when the field sits too low for the picker,
        // the page scrolls first so the picker opens below it, in full.
        onClick={(event) => {
          if (!open) makeRoom(event.currentTarget, room);
        }}
      >
        {trigger}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label={title}
          onOpenAutoFocus={onOpenAutoFocus}
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={16}
          // Never flipped over the header: the page makes room first (above),
          // and if space is still short the picker scrolls inside.
          avoidCollisions={false}
          className={cn(
            // The hairline separates the popover from the card it opens over,
            // which has the same surface; in dark mode the shadow cannot.
            "z-50 overflow-y-auto rounded-lg border border-foreground/12 bg-surface-raised p-4 text-foreground shadow-lg outline-none",
            "max-h-(--radix-popover-content-available-height) max-w-(--radix-popover-content-available-width)",
            "transition duration-150 ease-standard starting:translate-y-1 starting:opacity-0",
            width === "sm" && "w-72",
            width === "md" && "w-96",
            width === "lg" && "w-2xl",
          )}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
