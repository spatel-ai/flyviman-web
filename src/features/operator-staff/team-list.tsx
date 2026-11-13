"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { CAPABILITY_LABELS } from "@/lib/operator-access";
import { EditAccessForm, InviteForm } from "./staff-form";

type StaffMember = Schemas["StaffMemberDto"];

type RowAction = "suspend" | "reinstate" | "resend" | "remove";

const ACTIONS: Record<
  RowAction,
  {
    label: string;
    title: string;
    description: (who: string) => string;
    confirmLabel: string;
    destructive: boolean;
    requireReason: boolean;
    done: string;
  }
> = {
  suspend: {
    label: "Suspend",
    title: "Suspend this staff member?",
    description: (who) =>
      `${who} is signed out at once and cannot sign in until you reinstate them.`,
    confirmLabel: "Suspend",
    destructive: true,
    requireReason: true,
    done: "Staff member suspended",
  },
  reinstate: {
    label: "Reinstate",
    title: "Reinstate this staff member?",
    description: (who) =>
      `${who} can sign in again, with the access they had before.`,
    confirmLabel: "Reinstate",
    destructive: false,
    requireReason: false,
    done: "Staff member reinstated",
  },
  resend: {
    label: "Resend invitation",
    title: "Send the invitation again?",
    description: (who) =>
      `${who} receives a new link, valid for 72 hours, with the access shown here.`,
    confirmLabel: "Send again",
    destructive: false,
    requireReason: false,
    done: "Invitation sent again",
  },
  remove: {
    label: "Remove",
    title: "Remove this staff member?",
    description: (who) =>
      `${who} loses access at once and leaves your team. You can invite them again later.`,
    confirmLabel: "Remove",
    destructive: true,
    requireReason: true,
    done: "Staff member removed",
  },
};

/**
 * What can be done to a row, in the order the buttons appear. A suspension
 * by Flyviman cannot be lifted by the operator (D-070), and invitations can
 * be sent only while the organisation is approved.
 */
export function rowActions(
  member: Pick<StaffMember, "status" | "suspendedBy">,
  approved: boolean,
): RowAction[] {
  switch (member.status) {
    case "INVITED":
      return approved ? ["resend", "remove"] : ["remove"];
    case "ACTIVE":
      return ["suspend", "remove"];
    case "SUSPENDED":
      return member.suspendedBy === "PLATFORM"
        ? ["remove"]
        : ["reinstate", "remove"];
  }
}

function aircraftSummary(member: StaffMember): string {
  if (member.allAircraft) return "All aircraft";
  const count = member.aircraftIds.length;
  return count === 1 ? "1 aircraft" : `${count} aircraft`;
}

const COLUMNS = [
  "Email",
  "Permissions",
  "Aircraft",
  "Status",
  "Last sign-in",
  "Actions",
];

export function TeamList({ approved }: { approved: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [target, setTarget] = useState<{
    member: StaffMember;
    action: RowAction;
  } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.operatorStaff,
    queryFn: () => apiFetch<StaffMember[]>("operator/staff"),
  });

  const act = useMutation({
    mutationFn: ({
      member,
      action,
      reason,
    }: {
      member: StaffMember;
      action: RowAction;
      reason?: string;
    }) => {
      switch (action) {
        case "suspend":
          return apiFetch(`operator/staff/${member.id}`, {
            method: "PATCH",
            body: { status: "SUSPENDED", reason },
          });
        case "reinstate":
          return apiFetch(`operator/staff/${member.id}`, {
            method: "PATCH",
            body: { status: "ACTIVE" },
          });
        case "resend":
          return apiFetch("operator/staff", {
            method: "POST",
            body: {
              email: member.email,
              capabilities: member.capabilities,
              allAircraft: member.allAircraft,
              aircraftIds: member.aircraftIds,
            },
          });
        case "remove":
          return apiFetch(`operator/staff/${member.id}`, {
            method: "DELETE",
            body: { reason },
          });
      }
    },
    onSuccess: (_result, { action }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.operatorStaff });
      setTarget(null);
      toast({ title: ACTIONS[action].done, tone: "success" });
    },
    onError: (failure) => {
      setTarget(null);
      setProblem(messageFor(failure));
      void queryClient.invalidateQueries({ queryKey: queryKeys.operatorStaff });
    },
  });

  const staff = data?.data ?? [];
  const presentation = target ? ACTIONS[target.action] : null;

  const invite = approved ? (
    <Dialog open={inviting} onOpenChange={setInviting}>
      <DialogTrigger asChild>
        <Button className="h-10">Invite a staff member</Button>
      </DialogTrigger>
      <DialogContent
        title="Invite a staff member"
        description="They receive an email link to choose a password. They see only the aircraft you assign."
      >
        {/* Mounted only while open, so the form starts empty each time. */}
        <InviteForm onDone={() => setInviting(false)} />
      </DialogContent>
    </Dialog>
  ) : (
    <p className="text-body-sm text-muted">
      You can invite staff while your organisation is approved.
    </p>
  );

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {invite}
      </div>

      {problem ? (
        <p role="alert" className="text-body-sm text-danger">
          {problem}
        </p>
      ) : null}

      {isError ? (
        <LoadError
          what="your team"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : !isPending && staff.length === 0 ? (
        <EmptyState
          title="No staff yet"
          description="Invite the people who look after your aircraft and their availability."
        />
      ) : (
        <div aria-busy={isPending || undefined}>
          {isPending ? (
            <p role="status" className="sr-only">
              Loading your team
            </p>
          ) : null}
          <Table>
            <TableHead>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHeaderCell key={column}>{column}</TableHeaderCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isPending
                ? [0, 1, 2].map((row) => (
                    <TableRow key={row}>
                      {COLUMNS.map((column) => (
                        <TableCell key={column}>
                          <Skeleton className="h-5 w-24" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : staff.map((member) => {
                    const who = member.email ?? "This staff member";
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.email ?? "No email"}
                        </TableCell>
                        <TableCell>
                          {member.capabilities
                            .map((capability) => CAPABILITY_LABELS[capability])
                            .join(", ")}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {aircraftSummary(member)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <StatusBadge kind="staff" status={member.status} />
                          {member.status === "SUSPENDED" &&
                          member.suspendedBy === "PLATFORM" ? (
                            <p className="mt-1 text-caption text-muted">
                              By Flyviman
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {member.lastLoginAt ? (
                            formatDateTime(member.lastLoginAt)
                          ) : (
                            <span className="text-muted">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              className="h-10"
                              aria-label={`Edit access for ${who}`}
                              onClick={() => {
                                setProblem(null);
                                setEditing(member);
                              }}
                            >
                              Edit access
                            </Button>
                            {rowActions(member, approved).map((action) => (
                              <Button
                                key={action}
                                variant="secondary"
                                className="h-10"
                                aria-label={`${ACTIONS[action].label} ${who}`}
                                onClick={() => {
                                  setProblem(null);
                                  setTarget({ member, action });
                                }}
                              >
                                {ACTIONS[action].label}
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        {editing ? (
          <DialogContent
            title="Edit access"
            description={`What ${editing.email ?? "this staff member"} may do. Changes apply on their next action.`}
          >
            <EditAccessForm member={editing} onDone={() => setEditing(null)} />
          </DialogContent>
        ) : null}
      </Dialog>

      {target && presentation ? (
        <ConfirmDialog
          open
          onOpenChange={(next) => {
            if (!next && !act.isPending) setTarget(null);
          }}
          title={presentation.title}
          description={presentation.description(
            target.member.email ?? "This staff member",
          )}
          confirmLabel={presentation.confirmLabel}
          destructive={presentation.destructive}
          requireReason={presentation.requireReason}
          loading={act.isPending}
          onConfirm={(reason) => act.mutate({ ...target, reason })}
        />
      ) : null}
    </div>
  );
}
