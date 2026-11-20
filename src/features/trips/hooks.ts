import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";

export function useBooking(reference: string) {
  return useQuery({
    queryKey: queryKeys.booking(reference),
    queryFn: async () =>
      (
        await apiFetch<Schemas["BookingResponseDto"]>(
          `bookings/${encodeURIComponent(reference)}`,
        )
      ).data,
  });
}

export function useQuotes(reference: string) {
  return useQuery({
    queryKey: queryKeys.bookingQuotes(reference),
    queryFn: async () =>
      (
        await apiFetch<Schemas["QuoteResponseDto"][]>(
          `bookings/${encodeURIComponent(reference)}/quotes`,
        )
      ).data,
  });
}

export function useMessages(reference: string) {
  return useQuery({
    queryKey: queryKeys.bookingMessages(reference),
    queryFn: async () =>
      (
        await apiFetch<Schemas["BookingMessageDto"][]>(
          `bookings/${encodeURIComponent(reference)}/messages`,
        )
      ).data,
  });
}
