"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Me } from "@/lib/api/types";

/**
 * The signed-in user: to hide actions their role cannot take, and to fill
 * the gateway's checkout form with the customer's own details.
 */
export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => apiFetch<Me>("me").then((result) => result.data),
  });
}
