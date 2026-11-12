"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CalendarRange, View } from "./range";

/** Week or month, the range shown, and moving through time. */
export function RangeControls({ range }: { range: CalendarRange }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Tabs
        value={range.view}
        onValueChange={(value) => range.setView(value as View)}
      >
        <TabsList aria-label="Calendar view">
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={range.previous}
          aria-label={
            range.view === "week" ? "Previous week" : "Previous month"
          }
        >
          ‹
        </Button>
        <p
          className="min-w-40 text-center text-body-sm font-medium"
          aria-live="polite"
        >
          {range.label}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={range.next}
          aria-label={range.view === "week" ? "Next week" : "Next month"}
        >
          ›
        </Button>
      </div>
      <Button variant="secondary" size="sm" onClick={range.today}>
        Today
      </Button>
    </div>
  );
}
