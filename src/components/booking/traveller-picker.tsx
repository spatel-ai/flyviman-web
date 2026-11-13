"use client";

import { Minus, Plus, Users } from "lucide-react";
import { useState } from "react";
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
  const label = `${value} passenger${value === 1 ? "" : "s"}`;
  return (
    <ResponsivePicker
      open={open}
      onOpenChange={setOpen}
      title="Travellers"
      width="sm"
      trigger={
        <FieldTile
          label="Travellers"
          icon={Users}
          value={label}
          placeholder="Add travellers"
          hint="Adults and children"
          error={error}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-body font-medium">Passengers</span>
            <span className="text-body-sm text-muted">Everyone on board</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              aria-label="One fewer passenger"
              disabled={value <= MIN}
              onClick={() => onChange(Math.max(MIN, value - 1))}
            >
              <Minus aria-hidden="true" className="size-4" />
            </Button>
            <output
              aria-live="polite"
              aria-label="Passengers"
              className="w-8 text-center text-title tabular-nums"
            >
              {value}
            </output>
            <Button
              variant="secondary"
              size="sm"
              aria-label="One more passenger"
              disabled={value >= MAX}
              onClick={() => onChange(Math.min(MAX, value + 1))}
            >
              <Plus aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => setOpen(false)}>Done</Button>
        </div>
      </div>
    </ResponsivePicker>
  );
}
