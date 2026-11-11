"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";

/**
 * Whether the operator may add to its fleet. A suspended operator still sees
 * the fleet and can ground an aircraft, but the API refuses additions
 * (D-058), so the pages do not offer them. Undefined while loading.
 */
export function useOperatorApproved(): boolean | undefined {
  const profile = useQuery({
    queryKey: queryKeys.operatorProfile,
    queryFn: () =>
      apiFetch<Schemas["OperatorProfileResponseDto"]>("operator/profile"),
  });
  return profile.data ? profile.data.data.status === "APPROVED" : undefined;
}
