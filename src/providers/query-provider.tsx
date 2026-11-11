"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "@/lib/api/errors";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Prices, availability and statuses must not be served stale.
        staleTime: 0,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          // Client errors will not succeed on retry.
          !(error instanceof ApiError && error.status < 500) &&
          failureCount < 2,
      },
      mutations: { retry: false },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
