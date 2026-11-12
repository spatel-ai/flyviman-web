"use client";

import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";

type Location = Schemas["LocationResponseDto"];

function describe(location: Location): string {
  const code = location.iata ?? location.icao;
  const place = [location.city, code].filter(Boolean).join(", ");
  return place ? `${location.name} (${place})` : location.name;
}

export interface LocationFieldProps {
  /** Label of the choice, for example "Home base". */
  label: string;
  /** Label of the search box, for example "Find the home base". */
  searchLabel: string;
  value: string;
  onChange: (locationId: string) => void;
  error?: string;
}

/**
 * Finds an active airport or heliport by name, city or code and reports the
 * chosen location's id. The current choice is named and kept until another
 * is picked, so typing a search never clears it.
 */
export function LocationField({
  label,
  searchLabel,
  value,
  onChange,
  error,
}: LocationFieldProps) {
  const [term, setTerm] = useState("");
  const query = useDeferredValue(term.trim());
  const results = useQuery({
    queryKey: queryKeys.locationSearch(query),
    queryFn: () =>
      apiFetch<Location[]>("locations", { query: { q: query, pageSize: 8 } }),
    enabled: query.length >= 2,
  });
  const current = useQuery({
    queryKey: queryKeys.location(value),
    queryFn: () => apiFetch<Location>(`locations/${encodeURIComponent(value)}`),
    enabled: Boolean(value),
  });
  const options = (results.data?.data ?? []).map((location) => ({
    value: location.id,
    label: describe(location),
  }));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-body-sm" aria-live="polite">
        <span className="text-muted">{label}: </span>
        {value
          ? current.data
            ? describe(current.data.data)
            : "…"
          : "none chosen"}
      </p>
      <Input
        label={searchLabel}
        hint="Type an airport or heliport name, city or code, for example BOM."
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        autoComplete="off"
        error={query.length < 2 ? error : undefined}
      />
      {query.length >= 2 ? (
        options.length > 0 ? (
          <Select
            label={label}
            placeholder="Choose a location"
            options={options}
            value={
              options.some((option) => option.value === value) ? value : ""
            }
            onValueChange={onChange}
            error={error}
          />
        ) : results.isPending ? null : (
          <p className="text-body-sm text-muted">No location matches.</p>
        )
      ) : null}
    </div>
  );
}
