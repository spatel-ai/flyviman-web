"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadError } from "@/components/shared/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { RestrictionsEditor } from "./restrictions-editor";
import type {
  OperatorRestrictionsBody,
  OperatorRestrictionsResponse,
  Restrictions,
} from "./schema";

/**
 * Restrictions for the whole organisation, on the pricing page. They apply
 * to every aircraft alongside the aircraft's own. Each save is audited.
 */
export function OperatorRestrictions() {
  const queryClient = useQueryClient();
  const restrictions = useQuery({
    queryKey: queryKeys.operatorRestrictions,
    queryFn: () =>
      apiFetch<OperatorRestrictionsResponse>("operator/restrictions"),
  });

  async function save(next: Restrictions | null) {
    const body: OperatorRestrictionsBody = { restrictions: next };
    const { data } = await apiFetch<OperatorRestrictionsResponse>(
      "operator/restrictions",
      { method: "PUT", body },
    );
    queryClient.setQueryData(queryKeys.operatorRestrictions, { data });
    return data.restrictions;
  }

  return (
    <section
      aria-labelledby="operator-restrictions"
      className="mt-10 flex flex-col gap-4"
    >
      <h2 id="operator-restrictions" className="text-h3">
        Restrictions
      </h2>
      {restrictions.isPending ? (
        <Skeleton className="h-64" />
      ) : restrictions.isError ? (
        <LoadError
          what="your restrictions"
          error={restrictions.error}
          onRetry={() => void restrictions.refetch()}
        />
      ) : (
        <RestrictionsEditor
          initial={restrictions.data.data.restrictions}
          save={save}
          scope="every aircraft of your organisation"
        />
      )}
    </section>
  );
}
