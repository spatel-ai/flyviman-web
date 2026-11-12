"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonClasses } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import {
  formatCalendarDay,
  formatTimeRange,
  todayIn,
  zoneName,
} from "@/lib/format/zoned";
import { useOperatorApproved } from "@/lib/operator";
import { cn } from "@/lib/utils";
import { ConflictsPanel } from "./conflicts-panel";
import { EntryDialog } from "./entry-dialog";
import { EntrySheet } from "./entry-sheet";
import { placeEntries, toEntries, type Entry } from "./entries";
import { ENTRY_LABELS, ENTRY_ORDER, ENTRY_TONES, TONE_CLASSES } from "./labels";
import { FLEET_ZONE, useCalendarRange } from "./range";
import { RangeControls } from "./range-controls";

type Fleet = Schemas["FleetCalendarResponseDto"];
type FleetAircraft = Fleet["aircraft"][number];

/**
 * Every aircraft as a row and every day as a column, with slots and blocks
 * as bars. Drawn in one zone (IST at launch, D-061); each aircraft's own
 * calendar uses its home base's zone.
 */
export function FleetTimeline() {
  const range = useCalendarRange(FLEET_ZONE, { grid: false });
  const approved = useOperatorApproved() === true;
  const fleet = useQuery({
    queryKey: queryKeys.fleetAvailability(range.from, range.to),
    queryFn: () =>
      apiFetch<Fleet>("operator/availability", {
        query: { from: range.from, to: range.to },
      }),
  });
  const [adding, setAdding] = useState<{
    aircraft: FleetAircraft;
    day: string;
  } | null>(null);
  const [viewing, setViewing] = useState<{
    aircraft: FleetAircraft;
    entry: Entry;
  } | null>(null);
  const [editing, setEditing] = useState<{
    aircraft: FleetAircraft;
    slot: Entry;
  } | null>(null);

  const today = todayIn(FLEET_ZONE);
  const data = fleet.data?.data;
  const entries = data ? toEntries(data.slots, data.blocks) : [];
  const registrations = new Map(
    (data?.aircraft ?? []).map((aircraft) => [
      aircraft.id,
      aircraft.registration,
    ]),
  );
  const zones = new Map(
    (data?.aircraft ?? []).map((aircraft) => [aircraft.id, FLEET_ZONE]),
  );

  return (
    <div className="mt-6 flex flex-col gap-4">
      <RangeControls range={range} />
      <p className="text-body-sm text-muted">
        Times in {zoneName(FLEET_ZONE)} ({FLEET_ZONE}). Customers are offered
        time only on an approved aircraft of an approved operator.
      </p>
      <ConflictsPanel registrations={registrations} zones={zones} />
      {fleet.isPending ? (
        <Skeleton className="h-64" />
      ) : fleet.isError ? (
        <LoadError
          what="the availability"
          error={fleet.error}
          onRetry={() => void fleet.refetch()}
        />
      ) : data!.aircraft.length === 0 ? (
        <EmptyState
          title="No aircraft yet"
          description="Add an aircraft to your fleet, then offer its time here."
          action={
            <Link href="/operator/aircraft" className={buttonClasses({})}>
              Go to fleet
            </Link>
          }
        />
      ) : (
        <>
          {data!.truncated ? (
            <p role="status" className="text-body-sm text-warning">
              This range holds more entries than can be shown at once. Open an
              aircraft&apos;s calendar to see all of its entries.
            </p>
          ) : null}
          <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised">
            <div
              className={cn(
                "flex flex-col",
                range.view === "week" ? "min-w-3xl" : "min-w-7xl",
              )}
              role="table"
              aria-label={`Fleet availability, ${range.label}`}
            >
              <div role="row" className="flex border-b border-border">
                <div
                  role="columnheader"
                  className="sticky left-0 z-10 w-36 shrink-0 bg-surface-raised px-3 py-2 text-body-sm font-medium"
                >
                  Aircraft
                </div>
                <div
                  className="grid flex-1"
                  style={{
                    gridTemplateColumns: `repeat(${range.days.length}, minmax(0, 1fr))`,
                  }}
                >
                  {range.days.map((day) => (
                    <div
                      key={day}
                      role="columnheader"
                      className={cn(
                        "truncate border-l border-border px-1 py-2 text-center text-caption",
                        day === today
                          ? "font-semibold text-foreground"
                          : "text-muted",
                      )}
                    >
                      {range.view === "week"
                        ? formatCalendarDay(day)
                        : Number(day.slice(8))}
                    </div>
                  ))}
                </div>
              </div>
              {data!.aircraft.map((aircraft) => (
                <FleetRow
                  key={aircraft.id}
                  aircraft={aircraft}
                  entries={entries.filter(
                    (entry) => entry.aircraftId === aircraft.id,
                  )}
                  days={range.days}
                  view={range.view}
                  date={range.anchor}
                  today={today}
                  onAdd={(day) => setAdding({ aircraft, day })}
                  onOpen={(entry) => setViewing({ aircraft, entry })}
                />
              ))}
            </div>
          </div>
          <Legend />
        </>
      )}
      {adding ? (
        <EntryDialog
          open
          onOpenChange={(open) => !open && setAdding(null)}
          aircraftId={adding.aircraft.id}
          registration={adding.aircraft.registration}
          zone={FLEET_ZONE}
          approved={approved}
          day={adding.day}
        />
      ) : null}
      {editing ? (
        <EntryDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          aircraftId={editing.aircraft.id}
          registration={editing.aircraft.registration}
          zone={FLEET_ZONE}
          approved={approved}
          slot={editing.slot}
        />
      ) : null}
      <EntrySheet
        entry={viewing?.entry ?? null}
        registration={viewing?.aircraft.registration ?? ""}
        zone={FLEET_ZONE}
        approved={approved}
        onOpenChange={(open) => !open && setViewing(null)}
        onEdit={(slot) => {
          if (viewing) setEditing({ aircraft: viewing.aircraft, slot });
          setViewing(null);
        }}
      />
    </div>
  );
}

function FleetRow({
  aircraft,
  entries,
  days,
  view,
  date,
  today,
  onAdd,
  onOpen,
}: {
  aircraft: FleetAircraft;
  entries: Entry[];
  days: string[];
  view: "week" | "month";
  date: string;
  today: string;
  onAdd: (day: string) => void;
  onOpen: (entry: Entry) => void;
}) {
  const { placed, lanes } = placeEntries(
    entries,
    days[0],
    days.length,
    FLEET_ZONE,
  );
  return (
    <div role="row" className="flex border-b border-border last:border-b-0">
      <div
        role="rowheader"
        className="sticky left-0 z-10 flex w-36 shrink-0 flex-col gap-1 bg-surface-raised px-3 py-2"
      >
        <Link
          href={`/operator/availability/${aircraft.id}?view=${view}&date=${date}`}
          className="font-medium text-accent hover:underline"
        >
          {aircraft.registration}
        </Link>
        <StatusBadge
          kind="availability"
          status={aircraft.availabilityStatus}
          className="self-start"
        />
        {aircraft.listingStatus === "APPROVED" ? null : (
          <StatusBadge
            kind="aircraft"
            status={aircraft.listingStatus}
            className="self-start"
          />
        )}
      </div>
      <div
        role="cell"
        className="relative grid flex-1 gap-y-1 py-1"
        style={{
          gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${lanes}, minmax(2rem, auto)) 1.5rem`,
        }}
      >
        {/* Day lines and today's tint, behind the bars. */}
        {days.map((day, column) => (
          <div
            key={`line-${day}`}
            aria-hidden="true"
            className={cn(
              "border-l border-border",
              day === today ? "bg-accent/4" : undefined,
            )}
            style={{ gridColumn: column + 1, gridRow: `1 / span ${lanes + 1}` }}
          />
        ))}
        {/* A strip of add buttons below the bars, so a busy day stays addable. */}
        {days.map((day, column) => (
          <button
            key={day}
            type="button"
            onClick={() => onAdd(day)}
            aria-label={`Add to ${aircraft.registration} on ${formatCalendarDay(day)}`}
            className="relative z-1 mx-0.5 rounded-sm text-caption text-muted transition-colors duration-150 hover:bg-accent/6 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
            style={{ gridColumn: column + 1, gridRow: lanes + 1 }}
          >
            +
          </button>
        ))}
        {placed.map(({ entry, startColumn, endColumn, lane }) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onOpen(entry)}
            title={`${ENTRY_LABELS[entry.type]}, ${formatTimeRange(entry.startsAt, entry.endsAt, FLEET_ZONE)}`}
            aria-label={`${aircraft.registration}: ${ENTRY_LABELS[entry.type]}, ${formatTimeRange(entry.startsAt, entry.endsAt, FLEET_ZONE)}`}
            className={cn(
              "relative z-1 mx-0.5 truncate rounded-sm px-2 text-left text-caption font-medium",
              TONE_CLASSES[ENTRY_TONES[entry.type]],
            )}
            style={{
              gridColumn: `${startColumn + 1} / ${endColumn + 2}`,
              gridRow: lane + 1,
            }}
          >
            {ENTRY_LABELS[entry.type]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Every entry type with its colour, so colour is never the only key. */
export function Legend() {
  return (
    <ul aria-label="Legend" className="flex flex-wrap gap-2 text-caption">
      {ENTRY_ORDER.map((type) => (
        <li
          key={type}
          className={cn(
            "rounded-sm px-2 py-0.5 font-medium",
            TONE_CLASSES[ENTRY_TONES[type]],
          )}
        >
          {ENTRY_LABELS[type]}
        </li>
      ))}
    </ul>
  );
}
