"use client";

import { Minus, Plus, Users } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CABINS, travellersLabel } from "@/features/scheduled-search/logic";
import type { Cabin } from "@/features/scheduled-search/types";
import { cn } from "@/lib/utils";
import { FieldTile } from "./field-tile";
import { ResponsivePicker } from "./responsive-picker";

export interface Passengers {
  adults: number;
  children: number;
  infants: number;
}

/** Airlines seat nine on one booking; an infant needs an adult's lap. */
const MAX_SEATED = 9;

function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col">
        <span className="text-body font-medium">{label}</span>
        <span className="text-body-sm text-muted">{hint}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="secondary"
          aria-label={`One fewer ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="size-11 px-0"
        >
          <Minus aria-hidden="true" className="size-4" />
        </Button>
        <output
          aria-live="polite"
          aria-label={label}
          className="w-8 text-center text-title tabular-nums"
        >
          {value}
        </output>
        <Button
          variant="secondary"
          aria-label={`One more ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="size-11 px-0"
        >
          <Plus aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/** Adults, children and infants, and the cabin, in one tile and one picker. */
export function ScheduledTravellerPicker({
  passengers,
  cabin,
  onChange,
}: {
  passengers: Passengers;
  cabin: Cabin;
  onChange: (next: { passengers: Passengers; cabin: Cabin }) => void;
}) {
  const [open, setOpen] = useState(false);
  const heading = useRef<HTMLSpanElement>(null);
  const cabinLabel = CABINS.find((c) => c.value === cabin)?.label ?? cabin;
  const set = (patch: Partial<Passengers>) =>
    onChange({ passengers: { ...passengers, ...patch }, cabin });
  return (
    <ResponsivePicker
      open={open}
      onOpenChange={setOpen}
      title="Travellers and cabin"
      width="sm"
      side="left"
      room={420}
      initialFocus={heading}
      trigger={
        <FieldTile
          label="Travellers"
          icon={Users}
          value={travellersLabel(passengers)}
          placeholder="Add travellers"
          hint={cabinLabel}
          phoneSuffix={`· ${cabinLabel}`}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <span
          ref={heading}
          tabIndex={-1}
          className="text-body font-medium outline-none"
        >
          Travellers
        </span>
        <Stepper
          label="Adults"
          hint="12 years and over"
          value={passengers.adults}
          min={1}
          max={MAX_SEATED - passengers.children}
          onChange={(adults) =>
            set({ adults, infants: Math.min(passengers.infants, adults) })
          }
        />
        <Stepper
          label="Children"
          hint="2 to 11 years"
          value={passengers.children}
          min={0}
          max={MAX_SEATED - passengers.adults}
          onChange={(children) => set({ children })}
        />
        <Stepper
          label="Infants"
          hint="Under 2, on an adult's lap"
          value={passengers.infants}
          min={0}
          max={passengers.adults}
          onChange={(infants) => set({ infants })}
        />
        <div
          role="radiogroup"
          aria-label="Cabin"
          className="flex flex-wrap gap-1.5"
        >
          {CABINS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={cabin === option.value}
              onClick={() => onChange({ passengers, cabin: option.value })}
              className={cn(
                "h-11 rounded-pill border px-3 text-body-sm transition-colors duration-150 ease-standard",
                cabin === option.value
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <Button onClick={() => setOpen(false)} className="self-end">
          Done
        </Button>
      </div>
    </ResponsivePicker>
  );
}
