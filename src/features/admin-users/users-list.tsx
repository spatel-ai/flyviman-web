"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/format/date";
import { AddStaffDialog } from "./add-staff-dialog";
import {
  isFiltered,
  PAGE_SIZE,
  parseUserFilter,
  ROLE_OPTIONS,
  SEARCH_MAX_LENGTH,
  serialiseUserFilter,
  STATUS_OPTIONS,
  userListQuery,
  type RoleFilter,
  type UserFilter,
  type UserStatusFilter,
} from "./filters";
import { InlineError } from "./inline-error";
import {
  canManageUsers,
  ROW_ACTIONS,
  rowAction,
  type UserRowAction,
} from "./row-action";
import { useMe } from "./use-me";

type AdminUser = Schemas["AdminUserResponseDto"];

// Every user list query sits under this prefix.
const USER_QUERIES = queryKeys.adminUsers({}).slice(0, 2);

const COLUMNS = ["Email / phone", "Role", "Status", "Last sign-in", "Created"];

function statusErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "USER_INVALID_TRANSITION":
        return "This user's status has already changed. The list now shows the latest.";
      case "NOT_FOUND":
        return "This user no longer exists.";
      case "FORBIDDEN":
        return "Your role cannot do this.";
      case "VALIDATION_ERROR":
        return "Give a reason of between 3 and 500 characters.";
    }
  }
  return messageFor(error);
}

export function UsersList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const filter = parseUserFilter(useSearchParams());
  const viewer = useMe().data;
  const manages = canManageUsers(viewer);

  const [target, setTarget] = useState<{
    user: AdminUser;
    action: UserRowAction;
  } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminUsers(filter),
    queryFn: () =>
      apiFetch<AdminUser[]>("admin/users", { query: userListQuery(filter) }),
  });

  const change = useMutation({
    mutationFn: ({
      user,
      action,
      reason,
    }: {
      user: AdminUser;
      action: UserRowAction;
      reason: string;
    }) =>
      apiFetch<AdminUser>(`admin/users/${user.id}/status`, {
        method: "PATCH",
        body: { status: ROW_ACTIONS[action].status, reason },
      }),
    onSuccess: (_result, { action }) => {
      void queryClient.invalidateQueries({ queryKey: USER_QUERIES });
      setTarget(null);
      toast({ title: ROW_ACTIONS[action].done, tone: "success" });
    },
    onError: (failure) => {
      setTarget(null);
      setProblem(statusErrorMessage(failure));
      void queryClient.invalidateQueries({ queryKey: USER_QUERIES });
    },
  });

  // The view lives in the URL, so it can be shared and returned to.
  function show(next: UserFilter) {
    const search = serialiseUserFilter(next);
    router.replace(search ? `/admin/users?${search}` : "/admin/users", {
      scroll: false,
    });
  }

  const users = data?.data ?? [];
  const columns = manages ? [...COLUMNS, "Actions"] : COLUMNS;
  const presentation = target ? ROW_ACTIONS[target.action] : null;

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <SearchForm
            // Starts again from the URL when the view changes elsewhere.
            key={filter.q}
            initial={filter.q}
            onSearch={(q) => show({ ...filter, q, page: 1 })}
          />
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={filter.role}
            onValueChange={(role) =>
              show({ ...filter, role: role as RoleFilter, page: 1 })
            }
            className="h-10 w-56 max-w-full"
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={filter.status}
            onValueChange={(status) =>
              show({ ...filter, status: status as UserStatusFilter, page: 1 })
            }
            className="h-10 w-48 max-w-full"
          />
        </div>
        {manages ? <AddStaffDialog /> : null}
      </div>

      {problem ? (
        <p role="alert" className="text-body-sm text-danger">
          {problem}
        </p>
      ) : null}

      {isError ? (
        <InlineError
          message={messageFor(error)}
          onRetry={() => void refetch()}
        />
      ) : !isPending && users.length === 0 ? (
        <EmptyState
          title={
            isFiltered(filter) ? "No users match these filters" : "No users yet"
          }
          description={
            isFiltered(filter)
              ? "Change the role, status or search to see more."
              : "Accounts appear here as people register."
          }
          action={
            isFiltered(filter) ? (
              <Button
                variant="secondary"
                className="h-10"
                onClick={() =>
                  show({ role: "ALL", status: "ALL", q: "", page: 1 })
                }
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div aria-busy={isPending || undefined}>
            {isPending ? (
              <p role="status" className="sr-only">
                Loading users
              </p>
            ) : null}
            <Table>
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableHeaderCell key={column}>{column}</TableHeaderCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {isPending
                  ? [0, 1, 2, 3, 4].map((row) => (
                      <TableRow key={row}>
                        {columns.map((column) => (
                          <TableCell key={column}>
                            <Skeleton className="h-5 w-24" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : users.map((user) => {
                      const action = rowAction(user, viewer);
                      const who = user.email ?? user.phone ?? "this user";
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <p className="font-medium">
                              {user.email ?? user.phone ?? "No contact details"}
                            </p>
                            {user.email && user.phone ? (
                              <p className="text-caption text-muted">
                                {user.phone}
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {Object.hasOwn(ROLE_LABELS, user.role)
                              ? ROLE_LABELS[user.role]
                              : user.role}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <StatusBadge kind="user" status={user.status} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {user.lastLoginAt ? (
                              formatDateTime(user.lastLoginAt)
                            ) : (
                              <span className="text-muted">Never</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDateTime(user.createdAt)}
                          </TableCell>
                          {manages ? (
                            <TableCell>
                              {action ? (
                                <Button
                                  variant="secondary"
                                  className="h-10"
                                  aria-label={`${ROW_ACTIONS[action].label} ${who}`}
                                  onClick={() => {
                                    setProblem(null);
                                    setTarget({ user, action });
                                  }}
                                >
                                  {ROW_ACTIONS[action].label}
                                </Button>
                              ) : null}
                            </TableCell>
                          ) : null}
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </div>
          {isPending ? null : (
            <Pagination
              page={filter.page}
              pageSize={data.meta.pageSize ?? PAGE_SIZE}
              total={data.meta.total ?? 0}
              onPageChange={(page) => show({ ...filter, page })}
            />
          )}
        </>
      )}

      {target && presentation ? (
        <ConfirmDialog
          open
          onOpenChange={(next) => {
            if (!next && !change.isPending) setTarget(null);
          }}
          title={presentation.title}
          description={presentation.description(
            target.user.email ?? target.user.phone ?? "This user",
          )}
          confirmLabel={presentation.confirmLabel}
          destructive={presentation.destructive}
          requireReason
          loading={change.isPending}
          onConfirm={(reason) =>
            change.mutate({ ...target, reason: reason ?? "" })
          }
        />
      ) : null}
    </div>
  );
}

function SearchForm({
  initial,
  onSearch,
}: {
  initial: string;
  onSearch: (q: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <form
      role="search"
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim());
      }}
    >
      <Input
        label="Search by email or phone"
        type="search"
        maxLength={SEARCH_MAX_LENGTH}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="h-10 w-64 max-w-full"
      />
      <Button type="submit" variant="secondary" className="h-10">
        Search
      </Button>
    </form>
  );
}
