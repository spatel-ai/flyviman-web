"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TruncatedCell,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Role, Schemas } from "@/lib/api/types";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { CAPABILITY_LABELS } from "@/lib/operator-access";
import { filterRoutes, type RoleFilter } from "./route-filter";

type Matrix = Schemas["RoleMatrixResponseDto"];

function roleLabel(role: string): string {
  return Object.hasOwn(ROLE_LABELS, role) ? ROLE_LABELS[role as Role] : role;
}

function capabilityLabel(capability: string): string {
  return Object.hasOwn(CAPABILITY_LABELS, capability)
    ? CAPABILITY_LABELS[capability as keyof typeof CAPABILITY_LABELS]
    : capability;
}

/** The role matrix as the API enforces it, read-only. */
export function RoleMatrixView() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminRoles,
    queryFn: () => apiFetch<Matrix>("admin/roles"),
  });

  if (isError) {
    return (
      <div className="mt-8">
        <LoadError
          what="the roles"
          error={error}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }
  if (isPending) {
    return (
      <div className="mt-8 flex flex-col gap-4" aria-busy>
        <p role="status" className="sr-only">
          Loading roles
        </p>
        <Skeleton className="h-40" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const matrix = data.data;
  return (
    <div className="mt-8 flex flex-col gap-12">
      <section aria-labelledby="roles-heading">
        <h2 id="roles-heading" className="text-h3">
          Roles
        </h2>
        <p className="mt-2 max-w-reading text-body-sm text-muted">
          Each account has one role. Change an internal account&rsquo;s role on
          the{" "}
          <Link
            href="/admin/users"
            className="text-accent underline-offset-4 hover:underline"
          >
            Users
          </Link>{" "}
          page.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {matrix.roles.map((role) => (
            <div key={role.role} className="rounded-lg bg-surface p-4">
              <dt className="flex flex-wrap items-center gap-2 font-medium">
                {roleLabel(role.role)}
                <Badge tone={role.internal ? "info" : "neutral"}>
                  {role.internal ? "Flyviman staff" : "External"}
                </Badge>
              </dt>
              <dd className="mt-1 text-body-sm text-muted">
                {role.description}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="capabilities-heading">
        <h2 id="capabilities-heading" className="text-h3">
          Operator staff capabilities
        </h2>
        <p className="mt-2 max-w-reading text-body-sm text-muted">
          Operator administrators give these to their staff, for the aircraft
          they assign. Administrators hold them all.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {matrix.capabilities.map((capability) => (
            <div
              key={capability.capability}
              className="rounded-lg bg-surface p-4"
            >
              <dt className="font-medium">
                {capabilityLabel(capability.capability)}
              </dt>
              <dd className="mt-1 text-body-sm text-muted">
                {capability.description}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <RouteTable routes={matrix.routes} roles={matrix.roles} />
    </div>
  );
}

function RouteTable({
  routes,
  roles,
}: {
  routes: Matrix["routes"];
  roles: Matrix["roles"];
}) {
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [search, setSearch] = useState("");
  const shown = filterRoutes(routes, role, search);
  const options = [
    { value: "ALL", label: "All roles" },
    ...roles.map((entry) => ({
      value: entry.role,
      label: roleLabel(entry.role),
    })),
  ];

  return (
    <section aria-labelledby="routes-heading">
      <h2 id="routes-heading" className="text-h3">
        Access by route
      </h2>
      <p className="mt-2 max-w-reading text-body-sm text-muted">
        Read from the checks the API runs on every request, so it is always
        current. Some routes narrow further by record or field: for example,
        operations see a price calculation without the operator&rsquo;s figures,
        and operator staff only their assigned aircraft.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Select
          label="Role"
          options={options}
          value={role}
          onValueChange={(value) => setRole(value as RoleFilter)}
          className="h-10 w-56 max-w-full"
        />
        <Input
          label="Search routes"
          type="search"
          maxLength={100}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-10 w-64 max-w-full"
        />
      </div>
      <p className="mt-3 text-caption text-muted" aria-live="polite">
        {shown.length} of {routes.length} routes
      </p>
      {shown.length === 0 ? (
        <EmptyState
          title="No routes match"
          description="Choose another role or change the search."
        />
      ) : (
        <Table containerClassName="mt-3 max-h-screen">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Route</TableHeaderCell>
              <TableHeaderCell>What it does</TableHeaderCell>
              <TableHeaderCell>Who may call it</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shown.map((route) => (
              <TableRow key={`${route.method} ${route.path}`}>
                <TruncatedCell
                  className="max-w-80 whitespace-nowrap"
                  title={`${route.method} ${route.path}`}
                >
                  <span className="font-medium">{route.method}</span>{" "}
                  <code className="text-caption">{route.path}</code>
                </TruncatedCell>
                <TruncatedCell
                  className="w-1/4 max-w-0 min-w-32 whitespace-nowrap"
                  title={route.summary ?? "—"}
                >
                  {route.summary ?? <span className="text-muted">—</span>}
                </TruncatedCell>
                <TableCell className="w-[60%] min-w-72 py-2">
                  <div className="flex flex-wrap gap-1">
                    {route.public ? (
                      <Badge tone="success">Anyone</Badge>
                    ) : route.roles.length === 0 ? (
                      <Badge tone="danger">Nobody</Badge>
                    ) : (
                      route.roles.map((allowed) => (
                        <Badge key={allowed}>{roleLabel(allowed)}</Badge>
                      ))
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
