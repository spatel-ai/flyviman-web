import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  /** Says why there is nothing here and what to do next. */
  description?: string;
  /** Usually one Button or link. */
  action?: ReactNode;
  className?: string;
}

/** Shown in place of a list or table that has nothing in it. */
export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 px-6 py-12 text-center",
        className,
      )}
    >
      <p className="text-title text-foreground">{title}</p>
      {description ? (
        <p className="max-w-reading text-body-sm text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
