import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/**
 * A placeholder block shown while content loads. Size it with `className`
 * (for example `h-6 w-40`). Hidden from assistive technology: the region that
 * is loading announces itself.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-sm bg-border/60", className)}
      {...props}
    />
  );
}
