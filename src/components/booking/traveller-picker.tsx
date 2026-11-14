"use client";

import { Minus, Plus, Users } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldTile } from "./field-tile";
import { ResponsivePicker } from "./responsive-picker";

const MIN = 1;
const MAX = 50;

/** How many people fly: a stepper from 1 to 50. */
export function TravellerPicker({
  value,
  onChange,
  error,
}: {
  value: number;
  onChange: (count: number) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const heading = useRef<HTMLSpanElement>(null);
  const label = `${value} passenger${value === 1 ? "" : "s"}`;
  return (
    <ResponsivePicker
      open={open}
      onOpenChange={setOpen}
      title="Travellers"
      width="sm"
      // Beside the field, over Departure: below it would cover Search.
      side="left"
      room={240}
      initialFocus={heading}
      trigger={
        <FieldTile
          label="Travellers"
          icon={Users}
          value={label}
          placeholder="Add travellers"
          // One count for everyone, as the API takes it; there is no separate
          // child count, so the hint must not suggest one.
          hint="Including children"
          error={error}
        />
      }
    >
      {/* Label above, controls below: side by side, the hint wrapped onto
          three lines in a panel narrow enough to sit beside its field. */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          {/* Focused on opening, so no control looks pressed (a ring only
              for the keyboard). */}
          <span
            ref={heading}
            tabIndex={-1}
            className="text-body font-medium outline-none"
          >
            Passengers
          </span>
          <span className="text-body-sm text-muted">
            Everyone on board, including children
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              aria-label="One fewer passenger"
              disabled={value <= MIN}
              onClick={() => onChange(Math.max(MIN, value - 1))}
              className="size-11 px-0"
            >
              <Minus aria-hidden="true" className="size-4" />
            </Button>
            <output
              aria-live="polite"
              aria-label="Passengers"
              className="w-10 text-center text-title tabular-nums"
            >
              {value}
            </output>
            <Button
              variant="secondary"
              aria-label="One more passenger"
              disabled={value >= MAX}
              onClick={() => onChange(Math.min(MAX, value + 1))}
              className="size-11 px-0"
            >
              <Plus aria-hidden="true" className="size-4" />
            </Button>
          </div>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </div>
      </div>
    </ResponsivePicker>
  );
}
