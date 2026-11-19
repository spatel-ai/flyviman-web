"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Me } from "@/lib/api/types";

/** The signed-in user, used only to hide actions their role cannot take. */
export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => apiFetch<Me>("me").then((result) => result.data),
  });
}
