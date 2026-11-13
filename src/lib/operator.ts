"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import type { OperatorAccess } from "@/lib/operator-access";

/** The organisation in brief and the caller's access (D-070). */
type Me = Schemas["OperatorMeResponseDto"];

function useOperatorProfile() {
  return useQuery({
    queryKey: queryKeys.operatorMe,
    queryFn: () => apiFetch<Me>("operator/me"),
  });
}

/**
 * Whether the operator may add to its fleet. A suspended operator still sees
 * the fleet and can ground an aircraft, but the API refuses additions
 * (D-058), so the pages do not offer them. Undefined while loading.
 */
export function useOperatorApproved(): boolean | undefined {
  const profile = useOperatorProfile();
  return profile.data ? profile.data.data.status === "APPROVED" : undefined;
}

/**
 * What the signed-in user may do in the organisation (D-049, D-068).
 * Undefined while loading; the helpers in lib/operator-access treat that as
 * "nothing", so actions appear only once permissions are known.
 */
export function useOperatorAccess(): OperatorAccess | undefined {
  return useOperatorProfile().data?.data.access;
}
