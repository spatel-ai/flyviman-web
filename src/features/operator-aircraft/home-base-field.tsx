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

/**
 * Finds an active airport or heliport by name, city or code and submits its
 * id as `homeBaseId`. Replaces typing a raw location id.
 */
export function HomeBaseField() {
  const [term, setTerm] = useState("");
  const [chosen, setChosen] = useState("");
  const query = useDeferredValue(term.trim());
  const results = useQuery({
    queryKey: queryKeys.locationSearch(query),
    queryFn: () =>
      apiFetch<Location[]>("locations", { query: { q: query, pageSize: 8 } }),
    enabled: query.length >= 2,
  });
  const options = (results.data?.data ?? []).map((location) => ({
    value: location.id,
    label: describe(location),
  }));

  return (
    <div className="flex flex-col gap-3">
      <Input
        label="Find the home base"
        hint="Type an airport or heliport name, city or code, for example BOM."
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          setChosen("");
        }}
        autoComplete="off"
      />
      <input type="hidden" name="homeBaseId" value={chosen} />
      {query.length >= 2 ? (
        options.length > 0 ? (
          <Select
            label="Home base"
            placeholder="Choose a location"
            options={options}
            value={chosen}
            onValueChange={setChosen}
          />
        ) : results.isPending ? null : (
          <p className="text-body-sm text-muted">No location matches.</p>
        )
      ) : null}
    </div>
  );
}
