"use client";

import { Clock } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent, type Ref } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { PickerField, type PickerInputProps } from "./picker-field";

const pad = (number: number) => String(number).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, index) => pad(index));
/** Minutes are offered in five-minute steps. */
const MINUTES = Array.from({ length: 12 }, (_, index) => pad(index * 5));

/**
 * A time field, 24-hour `HH:mm`: the input's look, opening two scrolling
 * columns, hours and minutes in five-minute steps. A time already set off
 * the step (07:07) is kept and offered as one more minute. `<Input
 * type="time">` renders this.
 */
export function TimeField(props: PickerInputProps) {
  return (
    <PickerField
      {...props}
      kind="time"
      icon={Clock}
      placeholder="Choose time"
      format={(value) => value.slice(0, 5)}
      width="sm"
      invalidMessage={() => "Choose a time."}
    >
      {({ value, choose, close, initialFocus }) => {
        const [hour = "", minute = ""] = value ? value.split(":") : [];
        const minutes =
          minute && !MINUTES.includes(minute)
            ? [...MINUTES, minute].sort()
            : MINUTES;
        return (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-2">
              <Column
                label="Hours"
                items={HOURS}
                selected={hour}
                focusRef={initialFocus}
                onPick={(next) => choose(`${next}:${minute || "00"}`)}
              />
              <span aria-hidden="true" className="text-title text-muted">
                :
              </span>
              <Column
                label="Minutes"
                items={minutes}
                selected={minute}
                onPick={(next) => choose(`${hour || "00"}:${next}`)}
              />
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
              {props.required ? (
                <span />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => choose("", true)}
                >
                  Clear
                </Button>
              )}
              <Button size="sm" onClick={close}>
                Done
              </Button>
            </div>
          </div>
        );
      }}
    </PickerField>
  );
}

/**
 * One scrolling column of choices. Up and Down, Home and End move between
 * them; the chosen one starts in the middle of the column.
 */
function Column({
  label,
  items,
  selected,
  onPick,
  focusRef,
}: {
  label: string;
  items: string[];
  selected: string;
  onPick: (item: string) => void;
  focusRef?: Ref<HTMLButtonElement>;
}) {
  const list = useRef<HTMLDivElement>(null);
  const roving = items.includes(selected) ? selected : items[0];

  // Scroll the column itself, never the page.
  useEffect(() => {
    const column = list.current;
    const item = column?.querySelector<HTMLElement>(`[data-item="${roving}"]`);
    if (!column || !item) return;
    column.scrollTop =
      item.offsetTop - column.clientHeight / 2 + item.offsetHeight / 2;
    // Only on opening: later picks leave the column where the visitor put it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    const at = items.indexOf(
      (document.activeElement as HTMLElement | null)?.dataset.item ?? roving,
    );
    const next = {
      ArrowUp: at - 1,
      ArrowDown: at + 1,
      Home: 0,
      End: items.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = items[Math.max(0, Math.min(items.length - 1, next))];
    list.current
      ?.querySelector<HTMLElement>(`[data-item="${target}"]`)
      ?.focus();
  }

  return (
    <div
      ref={list}
      role="listbox"
      aria-label={label}
      onKeyDown={onKey}
      className="relative flex h-56 w-20 flex-col gap-0.5 overflow-y-auto rounded-md bg-surface p-1"
    >
      {items.map((item) => (
        <button
          key={item}
          ref={item === roving ? focusRef : undefined}
          type="button"
          role="option"
          data-item={item}
          aria-selected={item === selected}
          tabIndex={item === roving ? 0 : -1}
          onClick={() => onPick(item)}
          className={cn(
            "h-11 shrink-0 rounded-sm text-body tabular-nums transition-colors duration-150 ease-standard outline-none focus-visible:ring-2 focus-visible:ring-accent",
            item === selected
              ? "bg-accent-fill font-semibold text-accent-foreground"
              : "hover:bg-border/60",
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
