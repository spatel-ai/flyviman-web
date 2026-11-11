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
      className={cn(
        "-mb-px inline-flex h-11 items-center border-b-2 border-transparent text-body-sm font-medium whitespace-nowrap text-muted",
        "transition-colors duration-250 ease-standard hover:text-foreground",
        "aria-selected:border-accent aria-selected:text-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export type TabsContentProps = ComponentProps<typeof TabsPrimitive.Content>;

export function TabsContent({ className, ...props }: TabsContentProps) {
  return <TabsPrimitive.Content className={className} {...props} />;
}
