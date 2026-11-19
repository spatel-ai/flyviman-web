"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { RestrictionsEditor } from "@/features/restrictions/restrictions-editor";
import type { Restrictions } from "@/features/restrictions/schema";

type Aircraft = Schemas["AircraftResponseDto"];

/**
 * This aircraft's own restrictions, on top of the organisation's. Saved with
 * the aircraft's details, so the listing rules for editing apply.
 */
export function AircraftRestrictions({
  base,
  aircraftId,
  restrictions,
}: {
  base: string;
  aircraftId: string;
  restrictions: Restrictions | null | undefined;
}) {
  const queryClient = useQueryClient();

  async function save(next: Restrictions | null) {
    const { data } = await apiFetch<Aircraft>(base, {
      method: "PATCH",
      body: { restrictions: next },
    });
    queryClient.setQueryData(queryKeys.operatorAircraftDetail(aircraftId), {
      data,
    });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.operatorAircraft,
    });
    return data.restrictions ?? null;
  }

  return (
    <section
      aria-labelledby="aircraft-restrictions"
      className="flex flex-col gap-4"
    >
      <h2 id="aircraft-restrictions" className="text-title">
        Restrictions
      </h2>
      <RestrictionsEditor
        // Remount on a refetch so the form starts from what is stored.
        key={JSON.stringify(restrictions ?? null)}
        initial={restrictions ?? null}
        save={save}
        scope="this aircraft"
      />
    </section>
  );
}
