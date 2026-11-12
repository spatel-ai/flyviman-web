"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LoadError } from "@/components/shared/load-error";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import {
  formatCalendarDay,
  formatTimeRange,
  todayIn,
  utcToLocal,
  zoneName,
} from "@/lib/format/zoned";
import { useOperatorApproved } from "@/lib/operator";
import { cn } from "@/lib/utils";
import { EntryDialog } from "./entry-dialog";
import { EntrySheet } from "./entry-sheet";
import { entriesOnDay, toEntries, type Entry } from "./entries";
import { Legend } from "./fleet-timeline";
import { ENTRY_LABELS, ENTRY_TONES, TONE_CLASSES } from "./labels";
import { FLEET_ZONE, useCalendarRange } from "./range";
import { RangeControls } from "./range-controls";

type Aircraft = Schemas["AircraftResponseDto"];
type Calendar = Schemas["CalendarResponseDto"];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** Chips a month cell shows before "+n more". */
const CHIPS_PER_DAY = 3;

/** One aircraft's month or week, in its home base's local time. */
export function AircraftCalendar({ id }: { id: string }) {
  const base = `operator/aircraft/${encodeURIComponent(id)}`;
  const aircraft = useQuery({
    queryKey: queryKeys.operatorAircraftDetail(id),
    queryFn: () => apiFetch<Aircraft>(base),
  });
  if (aircraft.isPending) return <Skeleton className="mt-6 h-96" />;
  if (aircraft.isError) {
    return (
      <LoadError
        what="this aircraft"
        error={aircraft.error}
        onRetry={() => void aircraft.refetch()}
      />
    );
  }
  return <CalendarFor aircraft={aircraft.data.data} />;
}

function CalendarFor({ aircraft }: { aircraft: Aircraft }) {
  const zone = aircraft.homeBase?.timeZone ?? FLEET_ZONE;
  const range = useCalendarRange(zone, { grid: true });
  const approvedState = useOperatorApproved();
  const approved = approvedState === true;
  const zoneNote = aircraft.homeBase
    ? "the aircraft's home base time"
    : "because no home base is set";
  const router = useRouter();
  const pathname = usePathname();
  const calendar = useQuery({
    queryKey: queryKeys.aircraftAvailability(aircraft.id, range.from, range.to),
    queryFn: () =>
      apiFetch<Calendar>(
        `operator/aircraft/${encodeURIComponent(aircraft.id)}/availability`,
        { query: { from: range.from, to: range.to } },
      ),
  });
  const [addingOn, setAddingOn] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Entry | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);
  const today = todayIn(zone);
  const entries = calendar.data
    ? toEntries(calendar.data.data.slots, calendar.data.data.blocks)
    : [];
  const month = range.anchor.slice(0, 7);

  function openWeek(day: string) {
    router.replace(`${pathname}?view=week&date=${day}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/operator/availability"
          className="text-body-sm text-accent hover:underline"
        >
          Availability
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-h2">{aircraft.registration}</h1>
          <StatusBadge kind="aircraft" status={aircraft.listingStatus} />
          <StatusBadge
            kind="availability"
            status={aircraft.availabilityStatus}
          />
        </div>
        <p className="mt-2 text-muted">
          {aircraft.manufacturer} {aircraft.model}
          {aircraft.homeBase ? ` · based at ${aircraft.homeBase.name}` : ""} ·
          times in {zoneName(zone)} ({zone}).{" "}
          <Link
            href={`/operator/aircraft/${aircraft.id}`}
            className="text-accent hover:underline"
          >
            Aircraft details
          </Link>
        </p>
        {aircraft.listingStatus === "APPROVED" ? null : (
          <p className="mt-2 text-body-sm text-muted">
            Customers are offered this time only once operations approve the
            aircraft.
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangeControls range={range} />
        <Button
          onClick={() => setAddingOn(range.anchor)}
          disabled={approvedState === undefined}
        >
          Add entry
        </Button>
      </div>
      {calendar.isPending || approvedState === undefined ? (
        <Skeleton className="h-96" />
      ) : calendar.isError ? (
        <LoadError
          what="the calendar"
          error={calendar.error}
          onRetry={() => void calendar.refetch()}
        />
      ) : range.view === "month" ? (
        <MonthGrid
          days={range.days}
          month={month}
          today={today}
          zone={zone}
          entries={entries}
          registration={aircraft.registration}
          onAdd={setAddingOn}
          onOpen={setViewing}
          onMore={openWeek}
        />
      ) : (
        <WeekList
          days={range.days}
          today={today}
          zone={zone}
          entries={entries}
          registration={aircraft.registration}
          onAdd={setAddingOn}
          onOpen={setViewing}
        />
      )}
      <Legend />
      {addingOn ? (
        <EntryDialog
          open
          onOpenChange={(open) => !open && setAddingOn(null)}
          aircraftId={aircraft.id}
          registration={aircraft.registration}
          zone={zone}
          zoneNote={zoneNote}
          approved={approved}
          day={addingOn}
        />
      ) : null}
      {editing ? (
        <EntryDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          aircraftId={aircraft.id}
          registration={aircraft.registration}
          zone={zone}
          zoneNote={zoneNote}
          approved={approved}
          slot={editing}
        />
      ) : null}
      <EntrySheet
        entry={viewing}
        registration={aircraft.registration}
        zone={zone}
        approved={approved}
        onOpenChange={(open) => !open && setViewing(null)}
        onEdit={(slot) => {
          setViewing(null);
          setEditing(slot);
        }}
      />
    </div>
  );
}

interface DayProps {
  today: string;
  zone: string;
  entries: Entry[];
  registration: string;
  onAdd: (day: string) => void;
  onOpen: (entry: Entry) => void;
}

function EntryChip({
  entry,
  zone,
  registration,
  onOpen,
}: {
  entry: Entry;
  zone: string;
  registration: string;
  onOpen: (entry: Entry) => void;
}) {
  const when = formatTimeRange(entry.startsAt, entry.endsAt, zone);
  return (
    <button
      type="button"
      onClick={() => onOpen(entry)}
      aria-label={`${registration}: ${ENTRY_LABELS[entry.type]}, ${when}`}
      title={`${ENTRY_LABELS[entry.type]}, ${when}`}
      className={cn(
        "w-full truncate rounded-sm px-1.5 py-0.5 text-left text-caption font-medium",
        TONE_CLASSES[ENTRY_TONES[entry.type]],
      )}
    >
      {utcToLocal(entry.startsAt, zone).time} {ENTRY_LABELS[entry.type]}
    </button>
  );
}

function MonthGrid({
  days,
  month,
  onMore,
  ...props
}: DayProps & {
  days: string[];
  month: string;
  onMore: (day: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised">
      <div role="table" aria-label="Month" className="min-w-2xl">
        <div role="row" className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              role="columnheader"
              className="px-2 py-2 text-center text-caption text-muted"
            >
              {weekday}
            </div>
          ))}
        </div>
        {Array.from({ length: days.length / 7 }, (_, week) => (
          <div
            key={week}
            role="row"
            className="grid grid-cols-7 border-b border-border last:border-b-0"
          >
            {days.slice(week * 7, week * 7 + 7).map((day) => {
              const onDay = entriesOnDay(props.entries, day, props.zone);
              const outside = !day.startsWith(month);
              return (
                <div
                  key={day}
                  role="cell"
                  className={cn(
                    "flex min-h-28 flex-col gap-1 border-l border-border p-1.5 first:border-l-0",
                    outside ? "bg-surface" : undefined,
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-caption",
                        day === props.today
                          ? "rounded-pill bg-accent px-1.5 font-semibold text-accent-foreground"
                          : outside
                            ? "text-muted"
                            : "text-foreground",
                      )}
                    >
                      {Number(day.slice(8))}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5"
                      onClick={() => props.onAdd(day)}
                      aria-label={`Add on ${formatCalendarDay(day)}`}
                    >
                      +
                    </Button>
                  </div>
                  {onDay.slice(0, CHIPS_PER_DAY).map((entry) => (
                    <EntryChip
                      key={entry.id}
                      entry={entry}
                      zone={props.zone}
                      registration={props.registration}
                      onOpen={props.onOpen}
                    />
                  ))}
                  {onDay.length > CHIPS_PER_DAY ? (
                    <button
                      type="button"
                      onClick={() => onMore(day)}
                      className="text-left text-caption text-accent hover:underline"
                    >
                      +{onDay.length - CHIPS_PER_DAY} more
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekList({ days, ...props }: DayProps & { days: string[] }) {
  return (
    <ol className="grid gap-3 lg:grid-cols-7">
      {days.map((day) => {
        const onDay = entriesOnDay(props.entries, day, props.zone);
        return (
          <li
            key={day}
            aria-label={formatCalendarDay(day)}
            className="flex flex-col gap-2 rounded-lg border border-border bg-surface-raised p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h2
                className={cn(
                  "text-body-sm font-medium",
                  day === props.today ? "text-accent" : undefined,
                )}
              >
                {formatCalendarDay(day)}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => props.onAdd(day)}
                aria-label={`Add on ${formatCalendarDay(day)}`}
              >
                +
              </Button>
            </div>
            {onDay.length === 0 ? (
              <p className="text-caption text-muted">Nothing set</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {onDay.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => props.onOpen(entry)}
                      className={cn(
                        "w-full rounded-sm px-2 py-1 text-left text-caption",
                        TONE_CLASSES[ENTRY_TONES[entry.type]],
                      )}
                    >
                      <span className="block font-medium">
                        {ENTRY_LABELS[entry.type]}
                      </span>
                      <span className="block">
                        {formatTimeRange(
                          entry.startsAt,
                          entry.endsAt,
                          props.zone,
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
