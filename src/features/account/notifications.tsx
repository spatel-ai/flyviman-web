"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { useUnreadCount } from "@/lib/api/notifications";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { cn } from "@/lib/utils";

type Notification = Schemas["NotificationResponseDto"];
const PAGE_SIZE = 20;

export function Notifications() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const notifications = useQuery({
    queryKey: queryKeys.notifications(page),
    queryFn: () =>
      apiFetch<Notification[]>("me/notifications", {
        query: { page, pageSize: PAGE_SIZE },
      }),
  });

  const markRead = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`me/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsAll }),
  });

  const markAll = useMutation({
    mutationFn: () => apiFetch("me/notifications/read-all", { method: "POST" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsAll }),
  });
  const unreadTotal = useUnreadCount();

  if (notifications.isPending) {
    return (
      <div
        role="status"
        aria-label="Loading your notifications"
        className="flex flex-col gap-3"
      >
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }
  if (notifications.isError) {
    return (
      <LoadError
        what="your notifications"
        error={notifications.error}
        onRetry={() => void notifications.refetch()}
      />
    );
  }

  const { data, meta } = notifications.data;
  if (data.length === 0) {
    return (
      <EmptyState
        title="No notifications yet"
        description="Updates about your account and bookings will appear here."
      />
    );
  }

  return (
    <>
      {unreadTotal > 0 ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-body-sm text-muted">{unreadTotal} unread</p>
          <Button
            variant="secondary"
            size="sm"
            loading={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all as read
          </Button>
        </div>
      ) : null}
      <ul aria-label="Notifications" className="flex flex-col gap-3">
        {data.map((notification) => {
          const unread = notification.readAt === null;
          return (
            <li
              key={notification.id}
              className={cn(
                "flex flex-col gap-2 rounded-md border border-border/60 p-4 sm:flex-row sm:items-start sm:justify-between",
                unread ? "bg-surface-raised" : "bg-surface",
              )}
            >
              <div>
                <h2 className="text-title">
                  {notification.title}
                  {unread ? (
                    <span className="ml-2 text-caption font-medium text-accent">
                      New
                    </span>
                  ) : null}
                </h2>
                <p className="text-body-sm text-muted">{notification.body}</p>
                <p className="mt-1 text-caption text-subtle">
                  {formatDateTime(notification.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {notification.href ? (
                  <Link
                    href={notification.href}
                    className="text-body-sm font-medium text-accent hover:underline"
                  >
                    View
                  </Link>
                ) : null}
                {unread ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={
                      markRead.isPending &&
                      markRead.variables === notification.id
                    }
                    onClick={() => markRead.mutate(notification.id)}
                  >
                    Mark as read
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {(meta.total ?? 0) > PAGE_SIZE ? (
        <Pagination
          className="mt-6"
          page={page}
          pageSize={PAGE_SIZE}
          total={meta.total ?? 0}
          onPageChange={setPage}
        />
      ) : null}
    </>
  );
}
