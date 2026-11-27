"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

/** "Notifications, 3 unread": the name of an entry that carries the count. */
export function unreadLabel(label: string, unread: number): string {
  return unread > 0 ? `${label}, ${unread} unread` : label;
}

/**
 * How many in-app notifications the caller has not read. Fetched on load and
 * when the window regains focus, at most once a minute; marking one read
 * refreshes it (the key sits under `notificationsAll`). A failure shows no
 * indicator rather than an error: the page itself says when it cannot load.
 */
export function useUnreadCount(): number {
  const query = useQuery({
    queryKey: queryKeys.notificationsUnread,
    queryFn: () =>
      apiFetch<{ unread: number }>("me/notifications/unread-count"),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
  return query.data?.data.unread ?? 0;
}
