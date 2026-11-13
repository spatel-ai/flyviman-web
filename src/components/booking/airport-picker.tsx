"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { Building2, Plane, Search } from "lucide-react";
import { useDeferredValue, useId, useState } from "react";
import { POPULAR_LOCATIONS } from "@/content/search";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { FieldTile } from "./field-tile";
import { ResponsivePicker } from "./responsive-picker";

type Location = Schemas["LocationResponseDto"];

const code = (location: Location) => location.iata ?? location.icao ?? "";
const place = (location: Location) => location.city ?? location.name;

async function byCode(term: string): Promise<Location | null> {
  const { data } = await apiFetch<Location[]>("locations", {
    query: { q: term, pageSize: 1 },
  });
  const first = data[0];
  return first && (first.iata === term || first.icao === term) ? first : null;
}

/**
 * Where from or to: a tile showing the city large and the code and airport
 * small, opening a picker with popular airports before anything is typed
 * and live results after. Keyboard: arrows move, Enter chooses, Escape
 * closes.
 */
export function AirportPicker({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (locationId: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const query = useDeferredValue(term.trim());

  const chosen = useQuery({
    queryKey: queryKeys.location(value),
    queryFn: () => apiFetch<Location>(`locations/${encodeURIComponent(value)}`),
    enabled: Boolean(value),
    staleTime: Infinity,
  });
  const popular = useQueries({
    queries: POPULAR_LOCATIONS.map((popularCode) => ({
      queryKey: queryKeys.locationByCode(popularCode),
      queryFn: () => byCode(popularCode),
      enabled: open,
      staleTime: Infinity,
    })),
  });
  const results = useQuery({
    queryKey: queryKeys.locationSearch(query),
    queryFn: () =>
      apiFetch<Location[]>("locations", { query: { q: query, pageSize: 8 } }),
    enabled: open && query.length >= 2,
  });

  const searching = query.length >= 2;
  const options: Location[] = searching
    ? (results.data?.data ?? [])
    : popular.flatMap((entry) => (entry.data ? [entry.data] : []));
  const current = chosen.data?.data;

  function choose(location: Location) {
    onChange(location.id);
    setOpen(false);
    setTerm("");
    setActive(0);
  }

  return (
    <ResponsivePicker
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTerm("");
      }}
      title={`${label}: choose an airport or heliport`}
      room={440}
      trigger={
        <FieldTile
          label={label}
          value={current ? place(current) : undefined}
          placeholder="Choose airport"
          hint={
            current
              ? `${code(current)} · ${current.name}`
              : "City, airport or code"
          }
          error={error}
        />
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-sm bg-surface px-3">
          <Search aria-hidden="true" className="size-4 text-muted" />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={
              options[active] ? `${listId}-${options[active].id}` : undefined
            }
            aria-label={`Search ${label.toLowerCase()} airports`}
            placeholder="City, airport or code"
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((index) => Math.min(index + 1, options.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter" && options[active]) {
                event.preventDefault();
                choose(options[active]);
              }
            }}
            className="h-11 w-full bg-transparent text-body outline-none placeholder:text-subtle"
          />
        </div>
        <p className="text-caption font-medium tracking-wide text-muted uppercase">
          {searching ? "Results" : "Popular"}
        </p>
        <ul
          id={listId}
          role="listbox"
          aria-label={searching ? "Results" : "Popular airports"}
          className="flex max-h-72 flex-col overflow-y-auto"
        >
          {options.map((location, index) => {
            const Icon = location.type === "HELIPORT" ? Building2 : Plane;
            return (
              <li
                key={location.id}
                id={`${listId}-${location.id}`}
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(location)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5",
                  index === active && "bg-surface",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-medium">
                    {place(location)}
                  </span>
                  <span className="truncate text-body-sm text-muted">
                    {location.name}
                  </span>
                </span>
                <span className="text-body-sm font-medium text-muted tabular-nums">
                  {code(location)}
                </span>
              </li>
            );
          })}
          {searching && results.isSuccess && options.length === 0 ? (
            <li className="px-3 py-2.5 text-body-sm text-muted">
              No airport or heliport matches “{query}”.
            </li>
          ) : null}
        </ul>
      </div>
    </ResponsivePicker>
  );
}
