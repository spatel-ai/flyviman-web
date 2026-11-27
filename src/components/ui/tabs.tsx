"use client";

import type { ComponentProps } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export type TabsProps = ComponentProps<typeof TabsPrimitive.Root>;

/** Controlled (`value`, `onValueChange`) or uncontrolled (`defaultValue`). */
export function Tabs({ className, ...props }: TabsProps) {
  return (
    <TabsPrimitive.Root
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  );
}

export type TabsListProps = ComponentProps<typeof TabsPrimitive.List>;

/** Give it an `aria-label` when no visible heading names the tab set. */
export function TabsList({ className, ...props }: TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn(
        "flex gap-6 overflow-x-auto border-b border-border/60",
        className,
      )}
      {...props}
    />
  );
}

export type TabsTriggerProps = ComponentProps<typeof TabsPrimitive.Trigger>;

export function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      // Radix points every trigger at a panel id, but it mounts only the
      // selected panel (and none at all where the tabs filter a list), so
      // the reference would dangle (axe aria-valid-attr-value). It is
      // optional in the ARIA tabs pattern; the panel keeps aria-labelledby.
      aria-controls={undefined}
      className={cn(
        "-mb-px inline-flex h-11 items-center border-b-2 border-transparent text-body-sm font-medium whitespace-nowrap text-muted",
        "transition duration-250 ease-standard hover:text-foreground active:scale-97 motion-reduce:active:scale-100",
        "aria-selected:border-accent aria-selected:text-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export type TabsContentProps = ComponentProps<typeof TabsPrimitive.Content> & {
  /**
   * Fade and rise 8 px on entry (motion level 2). Opt in only where the
   * motion catalogue allows it: the sign-in and registration method switch.
   * Portal tabs leave this off. Those panels hold form fields, so the panel
   * itself is not a tab stop (ARIA tabs pattern: tabindex 0 only when the
   * panel has no focusable content).
   */
  animate?: boolean;
};

export function TabsContent({
  animate = false,
  className,
  ...props
}: TabsContentProps) {
  return (
    <TabsPrimitive.Content
      {...(animate ? { tabIndex: -1 } : {})}
      className={cn(
        animate &&
          "transition duration-250 ease-standard starting:translate-y-2 starting:opacity-0",
        className,
      )}
      {...props}
    />
  );
}
