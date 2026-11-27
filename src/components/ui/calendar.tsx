"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";
import {
  addDays,
  addMonths,
  formatCalendarDay,
  formatMonth,
  monthGrid,
  monthStart,
  todayIn,
  weekStart,
} from "@/lib/format/zoned";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const WEEKDAYS = [
  ["Mo", "Monday"],
  ["Tu", "Tuesday"],
  ["We", "Wednesday"],
  ["Th", "Thursday"],
  ["Fr", "Friday"],
  ["Sa", "Saturday"],
  ["Su", "Sunday"],
] as const;

const MONTHS = Array.from({ length: 12 }, (_, index) => {
  const date = new Date(Date.UTC(2026, index, 1));
  const name = (month: "short" | "long") =>
    new Intl.DateTimeFormat("en-IN", { month, timeZone: "UTC" }).format(date);
  return { short: name("short"), long: name("long") };
});

/** Years offered in the chooser when no `min` or `max` bounds them. */
const YEARS_BACK = 120;
const YEARS_AHEAD = 50;

function clamp(day: string, min?: string, max?: string) {
  if (min && day < min) return min;
  if (max && day > max) return max;
  return day;
}

/** A day as "Mon, 16 Nov 2026": the year too, since the chooser spans decades. */
function dayLabel(day: string) {
  return `${formatCalendarDay(day)} ${day.slice(0, 4)}`;
}

function daysInMonth(month: string) {
  return Number(addDays(addMonths(month, 1), -1).slice(8));
}

/** Moves to the same day of another month, or its last day if shorter. */
function sameDayIn(month: string, day: string) {
  const date = Math.min(Number(day.slice(8)), daysInMonth(month));
  return `${month.slice(0, 8)}${String(date).padStart(2, "0")}`;
}

export interface CalendarProps {
  /** The chosen day, `YYYY-MM-DD`, or "" for none. */
  value: string;
  onChange: (day: string) => void;
  /** Days before `min` or after `max` are shown dimmed and cannot be chosen. */
  min?: string;
  max?: string;
  /** Shows "Clear" in the foot; leave out for a required field. */
  onClear?: () => void;
  /** Today in India unless given; the calendar renders in the browser only. */
  today?: string;
  /** Receives the day that holds the keyboard focus, for focus on opening. */
  focusRef?: Ref<HTMLButtonElement>;
}

/**
 * One month, Monday first. The title switches to a month-and-year chooser,
 * for dates decades away (a date of birth). Arrows move by day and week,
 * Page Up and Page Down by month, Home and End to the week's ends. Only
 * colours change, at motion level 1: nothing moves near a form.
 */
export function Calendar({
  value,
  onChange,
  min,
  max,
  onClear,
  today = todayIn("Asia/Kolkata"),
  focusRef,
}: CalendarProps) {
  const [focused, setFocused] = useState(() => clamp(value || today, min, max));
  const [month, setMonth] = useState(() => monthStart(focused));
  const [chooser, setChooser] = useState(false);
  const [year, setYear] = useState(() => Number(month.slice(0, 4)));
  const moved = useRef(false);
  const grid = useRef<HTMLDivElement>(null);
  const years = useRef<HTMLDivElement>(null);

  const outside = (day: string) =>
    Boolean((min && day < min) || (max && day > max));

  // Keyboard moves land focus on the new day once it is drawn.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    grid.current
      ?.querySelector<HTMLButtonElement>(`[data-day="${focused}"]`)
      ?.focus();
  }, [focused]);

  // The chooser opens with the shown year in the middle of its list.
  useEffect(() => {
    if (!chooser || !years.current) return;
    const list = years.current;
    const item = list.querySelector<HTMLElement>("[aria-pressed=true]");
    if (item) {
      list.scrollTop =
        item.offsetTop - list.clientHeight / 2 + item.offsetHeight / 2;
      item.focus({ preventScroll: true });
    }
  }, [chooser]);

  function showMonth(next: string) {
    setMonth(next);
    setFocused(clamp(sameDayIn(next, focused), min, max));
  }

  function onGridKey(event: KeyboardEvent) {
    const steps: Record<string, () => string> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () =>
        sameDayIn(addMonths(focused, event.shiftKey ? -12 : -1), focused),
      PageDown: () =>
        sameDayIn(addMonths(focused, event.shiftKey ? 12 : 1), focused),
      Home: () => weekStart(focused),
      End: () => addDays(weekStart(focused), 6),
    };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    const next = clamp(step(), min, max);
    moved.current = true;
    setFocused(next);
    setMonth(monthStart(next));
  }

  const firstYear = min
    ? Number(min.slice(0, 4))
    : Number(today.slice(0, 4)) - YEARS_BACK;
  const lastYear = max
    ? Number(max.slice(0, 4))
    : Number(today.slice(0, 4)) + YEARS_AHEAD;
  const yearList = Array.from(
    { length: Math.max(1, lastYear - firstYear + 1) },
    (_, index) => firstYear + index,
  );
  const monthOff = (index: number) => {
    const key = `${year}-${String(index + 1).padStart(2, "0")}`;
    return Boolean(
      (min && key < min.slice(0, 7)) || (max && key > max.slice(0, 7)),
    );
  };

  const title = formatMonth(month);
  const days = monthGrid(month);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={`${title}, ${chooser ? "show days" : "choose month and year"}`}
          aria-expanded={chooser}
          onClick={() => {
            setYear(Number(month.slice(0, 4)));
            setChooser(!chooser);
          }}
          className="flex h-11 items-center gap-1.5 rounded-sm px-2 text-title text-foreground transition-colors duration-150 ease-standard outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent"
        >
          {title}
          {chooser ? (
            <ChevronDown aria-hidden="true" className="size-4 text-accent" />
          ) : (
            <ChevronRight aria-hidden="true" className="size-4 text-accent" />
          )}
        </button>
        {chooser ? null : (
          <div className="flex items-center">
            <button
              type="button"
              aria-label="Previous month"
              disabled={Boolean(min && month <= monthStart(min))}
              onClick={() => showMonth(addMonths(month, -1))}
              className="flex size-11 items-center justify-center rounded-pill text-accent transition-colors duration-150 ease-standard outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:text-subtle disabled:hover:bg-transparent"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Next month"
              disabled={Boolean(max && month >= monthStart(max))}
              onClick={() => showMonth(addMonths(month, 1))}
              className="flex size-11 items-center justify-center rounded-pill text-accent transition-colors duration-150 ease-standard outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:text-subtle disabled:hover:bg-transparent"
            >
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
          </div>
        )}
      </div>

      {chooser ? (
        // Same height as the month, so the popover keeps its size.
        <div className="flex h-72 gap-3">
          <div
            ref={years}
            role="group"
            aria-label="Year"
            className="relative flex w-24 shrink-0 flex-col gap-0.5 overflow-y-auto rounded-md bg-surface p-1"
          >
            {yearList.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={item === year}
                onClick={() => setYear(item)}
                className={cn(
                  "h-11 shrink-0 rounded-sm text-body tabular-nums transition-colors duration-150 ease-standard outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  item === year
                    ? "bg-accent-fill font-semibold text-accent-foreground"
                    : "hover:bg-border/60",
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <div
            role="group"
            aria-label="Month"
            className="grid flex-1 grid-cols-3 content-start gap-2"
          >
            {MONTHS.map((item, index) => {
              const current =
                year === Number(month.slice(0, 4)) &&
                index === Number(month.slice(5, 7)) - 1;
              const off = monthOff(index);
              return (
                <button
                  key={item.long}
                  type="button"
                  aria-label={item.long}
                  aria-pressed={current}
                  disabled={off}
                  onClick={() => {
                    showMonth(
                      `${year}-${String(index + 1).padStart(2, "0")}-01`,
                    );
                    setChooser(false);
                  }}
                  className={cn(
                    "h-11 rounded-pill text-body-sm transition-colors duration-150 ease-standard outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    current
                      ? "bg-accent-fill font-semibold text-accent-foreground"
                      : "hover:bg-surface",
                    off &&
                      "cursor-not-allowed text-subtle hover:bg-transparent",
                  )}
                >
                  {item.short}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          ref={grid}
          role="grid"
          aria-label={title}
          onKeyDown={onGridKey}
          className="flex h-72 flex-col"
        >
          <div role="row" className="grid grid-cols-7">
            {WEEKDAYS.map(([short, long]) => (
              <span
                key={long}
                role="columnheader"
                aria-label={long}
                className="pb-1 text-center text-caption text-muted"
              >
                {short}
              </span>
            ))}
          </div>
          {Array.from({ length: 6 }, (_, row) => (
            <div key={row} role="row" className="grid grid-cols-7">
              {days.slice(row * 7, row * 7 + 7).map((day) => {
                if (day.slice(0, 7) !== month.slice(0, 7)) {
                  return <span key={day} role="gridcell" className="h-11" />;
                }
                const selected = day === value;
                const off = outside(day);
                const isToday = day === today;
                return (
                  <span
                    key={day}
                    role="gridcell"
                    aria-selected={selected}
                    className="flex justify-center"
                  >
                    <button
                      ref={day === focused ? focusRef : undefined}
                      type="button"
                      data-day={day}
                      tabIndex={day === focused ? 0 : -1}
                      aria-label={dayLabel(day)}
                      aria-disabled={off || undefined}
                      aria-current={isToday ? "date" : undefined}
                      onClick={() => {
                        setFocused(day);
                        if (!off) onChange(day);
                      }}
                      className={cn(
                        "flex size-11 items-center justify-center rounded-pill text-body tabular-nums",
                        "transition-colors duration-150 ease-standard outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        off
                          ? "cursor-not-allowed text-subtle"
                          : selected
                            ? "bg-accent-fill font-semibold text-accent-foreground hover:bg-accent-fill-hover"
                            : "hover:bg-surface",
                        isToday &&
                          !selected &&
                          !off &&
                          "font-semibold text-accent",
                      )}
                    >
                      {Number(day.slice(8))}
                    </button>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <Button
          variant="ghost"
          size="sm"
          disabled={outside(today)}
          onClick={() => onChange(today)}
        >
          Today
        </Button>
        {onClear ? (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
