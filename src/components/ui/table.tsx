"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { Button } from "@/components/ui/button";
import { shortPlaceName } from "@/lib/format/place";
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
 * never scrolls sideways. Only when the table really overflows does the
 * wrapper become a keyboard-focusable region, and an edge fade marks the
 * side that has more columns hidden.
 */
export function Table({
  containerClassName,
  className,
  "aria-label": ariaLabel,
  ...props
}: TableProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [more, setMore] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const wide = el.scrollWidth > el.clientWidth + 1;
    const tall = el.scrollHeight > el.clientHeight + 1;
    setOverflow(wide || tall);
    // scrollLeft is negative in right-to-left layouts: use its size.
    const left = Math.abs(el.scrollLeft);
    const next = {
      start: wide && left > 1,
      end: wide && left + el.clientWidth < el.scrollWidth - 1,
    };
    setMore((prev) =>
      prev.start === next.start && prev.end === next.end ? prev : next,
    );
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div className="relative w-full">
      <div
        ref={scroller}
        onScroll={measure}
        {...(overflow
          ? {
              role: "region",
              tabIndex: 0,
              "aria-label": ariaLabel
                ? `${ariaLabel}, scrolls`
                : "Table, scrolls sideways",
            }
          : {})}
        className={cn(
          "w-full overflow-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          containerClassName,
        )}
      >
        <table
          aria-label={ariaLabel}
          className={cn(
            "w-full border-collapse text-left text-body-sm tabular-nums",
            className,
          )}
          {...props}
        />
      </div>
      <span
        aria-hidden="true"
        data-testid="table-shadow-start"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-20 w-8 bg-linear-to-r from-surface/90 to-transparent transition-opacity duration-150",
          more.start ? "opacity-100" : "opacity-0",
        )}
      />
      <span
        aria-hidden="true"
        data-testid="table-shadow-end"
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-20 w-8 bg-linear-to-l from-surface/90 to-transparent transition-opacity duration-150",
          more.end ? "opacity-100" : "opacity-0",
        )}
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
        "sticky top-0 z-10 border-b border-border bg-surface-raised px-3 py-3 text-caption font-medium whitespace-nowrap text-muted",
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
      className={cn("px-3 py-3 align-middle text-foreground", className)}
      {...props}
    />
  );
}

export interface TruncatedCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /** The full value, shown on hover and read by assistive technology. */
  title: string;
}

/**
 * A cell for long text (names, emails, notes, routes): one line, cut with an
 * ellipsis at `max-w-56` (override with a `max-w-*` class), the full value in
 * `title`. Never for money, status, dates or references. For a cell with
 * two lines of text, use `TruncatedText` for each line inside a `TableCell`.
 */
export function TruncatedCell({
  title,
  className,
  children,
  ...props
}: TruncatedCellProps) {
  return (
    <TableCell
      title={title}
      className={cn("max-w-56 truncate", className)}
      {...props}
    >
      {children}
    </TableCell>
  );
}

/** One truncated line inside a cell, with the full text in `title`. */
export function TruncatedText({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span title={title} className={cn("block truncate", className)}>
      {children}
    </span>
  );
}

/**
 * A route on one line with both ends always visible: each end is cut with an
 * ellipsis on its own, the arrow stays. An airport name loses its trailing
 * "International Airport" (`shortPlaceName`). The full "A to B" is the
 * `title` and the accessible name. The parent must be able to shrink
 * (a table cell with `max-w-0`, or a `min-w-0` flex child).
 */
export function RouteText({
  origin,
  destination,
  className,
}: {
  origin: string;
  destination: string;
  className?: string;
}) {
  const full = `${origin} to ${destination}`;
  return (
    <span
      title={full}
      className={cn("flex min-w-0 items-baseline gap-1", className)}
    >
      <span className="sr-only">{full}</span>
      <span aria-hidden="true" className="min-w-0 flex-[0_1_auto] truncate">
        {shortPlaceName(origin)}
      </span>
      <span aria-hidden="true" className="shrink-0 text-muted">
        →
      </span>
      <span aria-hidden="true" className="min-w-0 flex-[0_1_auto] truncate">
        {shortPlaceName(destination)}
      </span>
    </span>
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
