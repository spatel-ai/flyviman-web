import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  /**
   * Classes for the scrolling wrapper. Give it a maximum height (for example
   * `max-h-96`) to scroll rows under the sticky header inside the wrapper.
   */
  containerClassName?: string;
}

/**
 * Portal table. Wide tables scroll inside their own wrapper, so the page
 * never scrolls sideways.
 */
export function Table({ containerClassName, className, ...props }: TableProps) {
  return (
    <div className={cn("w-full overflow-auto", containerClassName)}>
      <table
        className={cn(
          "w-full border-collapse text-left text-body-sm tabular-nums",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function TableHead({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={className} {...props} />;
}

export function TableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export function TableRow({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("border-b border-border/60 last:border-b-0", className)}
      {...props}
    />
  );
}

export type SortDirection = "asc" | "desc" | "none";

const ARIA_SORT: Record<SortDirection, "ascending" | "descending" | "none"> = {
  asc: "ascending",
  desc: "descending",
  none: "none",
};

const SORT_MARK: Record<SortDirection, string> = {
  asc: "↑",
  desc: "↓",
  none: "↕",
};

export interface TableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** Current sort of this column. Set it on every sortable column. */
  sort?: SortDirection;
  /** Makes the heading a button. The caller decides the next direction. */
  onSort?: () => void;
}

export function TableHeaderCell({
  sort,
  onSort,
  className,
  children,
  scope = "col",
  ...props
}: TableHeaderCellProps) {
  return (
    <th
      scope={scope}
      aria-sort={sort ? ARIA_SORT[sort] : undefined}
      className={cn(
        "sticky top-0 z-10 border-b border-border bg-surface-raised px-4 py-3 text-caption font-medium whitespace-nowrap text-muted",
        className,
      )}
      {...props}
    >
      {onSort ? (
        <button
          type="button"
          onClick={onSort}
          className="inline-flex items-center gap-1 rounded-sm font-medium transition-colors duration-150 ease-standard hover:text-foreground"
        >
          {children}
          <span
            aria-hidden="true"
            className={cn(
              sort && sort !== "none" ? "text-accent" : "text-subtle",
            )}
          >
            {SORT_MARK[sort ?? "none"]}
          </span>
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function TableCell({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-4 py-3 align-middle text-foreground", className)}
      {...props}
    />
  );
}

export interface PaginationProps {
  /** Current page, starting at 1. */
  page: number;
  pageSize: number;
  /** Total number of rows across all pages. */
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 text-body-sm",
        className,
      )}
    >
      <p className="text-muted tabular-nums" aria-live="polite">
        {total === 0 ? "No results" : `Showing ${first}–${last} of ${total}`}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
