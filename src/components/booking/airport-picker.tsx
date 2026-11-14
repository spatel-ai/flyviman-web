"use client";

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Plane, Search } from "lucide-react";
import { useDeferredValue, useId, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { POPULAR_LOCATIONS } from "@/content/search";
import { apiFetch, type ApiResult } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { FieldTile } from "./field-tile";
import { ResponsivePicker } from "./responsive-picker";

type Location = Schemas["LocationResponseDto"];

const code = (location: Location) => location.iata ?? location.icao ?? "";
const place = (location: Location) => location.city ?? location.name;

/**
 * One row of the list. Popular rows come from the content module and know
 * their location only once its lookup has answered; result rows always do.
 */
interface Option {
  key: string;
  city: string;
  name: string;
  code: string;
  heliport: boolean;
  location: Location | null;
}

const fromLocation = (location: Location): Option => ({
  key: location.id,
  city: place(location),
  name: location.name,
  code: code(location),
  heliport: location.type === "HELIPORT",
  location,
});

const UNREACHABLE =
  "We couldn't reach the server. Check your connection and try again.";

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
  /** The popular code being looked up after a click, if any. */
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const listId = useId();
  const query = useDeferredValue(term.trim());
  const queryClient = useQueryClient();

  const chosen = useQuery({
    queryKey: queryKeys.location(value),
    queryFn: () => apiFetch<Location>(`locations/${encodeURIComponent(value)}`),
    enabled: Boolean(value),
    staleTime: Infinity,
  });
  // Popular airports are drawn from content at once; these lookups only find
  // each one's id in the background, so a click is usually instant.
  const lookups = useQueries({
    queries: POPULAR_LOCATIONS.map((entry) => ({
      queryKey: queryKeys.locationByCode(entry.code),
      queryFn: () => byCode(entry.code),
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
  const options: Option[] = searching
    ? (results.data?.data ?? []).map(fromLocation)
    : POPULAR_LOCATIONS.map((entry, index) => ({
        key: entry.code,
        city: entry.city,
        name: entry.name,
        code: entry.code,
        heliport: false,
        location: lookups[index]?.data ?? null,
      }));
  const current = chosen.data?.data;

  function apply(location: Location) {
    // The tile shows the choice at once, without a second request.
    queryClient.setQueryData<ApiResult<Location>>(
      queryKeys.location(location.id),
      { data: location, meta: { requestId: null } },
    );
    onChange(location.id);
    setOpen(false);
    setTerm("");
    setActive(0);
    setFailure(null);
  }

  async function choose(option: Option) {
    if (pending) return;
    setFailure(null);
    if (option.location) {
      apply(option.location);
      return;
    }
    // A popular airport clicked before its lookup answered: look it up now.
    setPending(option.code);
    try {
      const location = await queryClient.fetchQuery({
        queryKey: queryKeys.locationByCode(option.code),
        queryFn: () => byCode(option.code),
        staleTime: Infinity,
      });
      if (location) apply(location);
      else setFailure(`${option.code} is not available right now.`);
    } catch {
      setFailure(UNREACHABLE);
    } finally {
      setPending(null);
    }
  }

  return (
    <ResponsivePicker
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setTerm("");
          setFailure(null);
        }
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
        {/* One focus ring around icon and text together (the input draws none). */}
        <div className="flex items-center gap-2 rounded-sm bg-surface px-3 focus-within:ring-2 focus-within:ring-accent">
          <Search aria-hidden="true" className="size-4 text-muted" />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={
              options[active] ? `${listId}-${options[active].key}` : undefined
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
                void choose(options[active]);
              }
            }}
            className="h-11 w-full bg-transparent text-body outline-none placeholder:text-subtle"
          />
        </div>
        {failure ? (
          <p role="alert" className="text-body-sm text-danger">
            {failure}
          </p>
        ) : null}
        <p className="text-caption font-medium tracking-wide text-muted uppercase">
          {searching ? "Results" : "Popular"}
        </p>
        {searching && results.isPending ? (
          <div aria-busy="true" className="flex flex-col gap-1">
            <p role="status" className="sr-only">
              Searching airports
            </p>
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3 px-3 py-2.5">
                <Skeleton className="size-4" />
                <span className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </span>
              </div>
            ))}
          </div>
        ) : searching && results.isError ? (
          <div role="alert" className="flex flex-col items-start gap-2 px-3">
            <p className="text-body-sm text-danger">{UNREACHABLE}</p>
            <button
              type="button"
              onClick={() => void results.refetch()}
              className="text-body-sm font-medium text-accent hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <ul
            id={listId}
            role="listbox"
            aria-label={searching ? "Results" : "Popular airports"}
            aria-busy={pending ? true : undefined}
            className="flex max-h-72 flex-col overflow-y-auto"
          >
            {options.map((option, index) => {
              const Icon = option.heliport ? Building2 : Plane;
              const loading = pending === option.code && !option.location;
              return (
                <li
                  key={option.key}
                  id={`${listId}-${option.key}`}
                  role="option"
                  aria-selected={index === active}
                  aria-disabled={pending && !loading ? true : undefined}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => void choose(option)}
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
                      {option.city}
                    </span>
                    <span className="truncate text-body-sm text-muted">
                      {option.name}
                    </span>
                  </span>
                  {loading ? (
                    <Loader2
                      aria-label="Choosing"
                      className="size-4 animate-spin text-muted"
                    />
                  ) : (
                    <span className="text-body-sm font-medium text-muted tabular-nums">
                      {option.code}
                    </span>
                  )}
                </li>
              );
            })}
            {searching && results.isSuccess && options.length === 0 ? (
              <li className="px-3 py-2.5 text-body-sm text-muted">
                No airport or heliport matches “{query}”.
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </ResponsivePicker>
  );
}
