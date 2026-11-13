"use client";

import { Popover } from "radix-ui";
import { useSyncExternalStore, type ReactNode } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const DESKTOP = "(min-width: 768px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A button, rendered as the trigger. */
  trigger: ReactNode;
  /** Names the sheet on phones (shown) and the popover (screen readers). */
  title: string;
  children: ReactNode;
  width?: "sm" | "md" | "lg";
}) {
  const desktop = useIsDesktop();
  if (!desktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent title={title}>
          {children}
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label={title}
          align="start"
          sideOffset={8}
          collisionPadding={16}
          className={cn(
            "z-50 rounded-lg bg-surface-raised p-4 text-foreground shadow-lg outline-none",
            "transition duration-150 ease-standard starting:translate-y-1 starting:opacity-0",
            width === "sm" && "w-72",
            width === "md" && "w-96",
            width === "lg" && "w-auto",
          )}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
