"use client";

import { roleLabel } from "@/lib/format/labels";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { diffJson, showValue, type ChangeKind } from "./diff";
import { isRestricted } from "./restricted";

export type AuditLog = Schemas["AuditLogResponseDto"];

const KIND_LABELS: Record<ChangeKind, string> = {
  added: "Added",
  removed: "Removed",
  changed: "Changed",
  same: "Unchanged",
};

const KIND_TONES: Record<
  ChangeKind,
  "success" | "danger" | "warning" | "neutral"
> = {
  added: "success",
  removed: "danger",
  changed: "warning",
  same: "neutral",
};

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-caption text-muted">{label}</dt>
      <dd className="mt-0.5 text-body-sm break-words">{value ?? "None"}</dd>
    </div>
  );
}

function Restricted() {
  return (
    <p className="rounded-md bg-surface p-4 text-body-sm text-muted">
      <span className="font-medium text-foreground">
        Hidden: finance record.
      </span>{" "}
      The contents of pricing, payment, refund and settlement changes are
      visible to finance and super administrators only.
    </p>
  );
}

/** One audit record: who, what, when, and the change as a readable diff. */
export function AuditDetailSheet({
  log,
  onOpenChange,
}: {
  log: AuditLog | null;
  onOpenChange: (open: boolean) => void;
}) {
  const restricted = log ? isRestricted(log) : false;
  // The API nulls passenger and medical fields this role may not read and
  // flags the row (S2-g); say so rather than leave the values looking blank.
  const partlyHidden = log ? log.restricted && !restricted : false;
  const changes = log ? diffJson(log.before, log.after) : [];

  return (
    <Sheet open={log !== null} onOpenChange={onOpenChange}>
      {log ? (
        <SheetContent
          title="Audit record"
          description={log.action}
          className="md:max-w-xl"
        >
          <dl className="grid grid-cols-2 gap-4">
            <Field label="When" value={formatDateTime(log.createdAt)} />
            <Field
              label="Actor role"
              value={log.actorRole ? roleLabel(log.actorRole) : "System"}
            />
            <Field label="Actor ID" value={log.actorId} />
            <Field label="Entity" value={log.entityType} />
            <Field label="Entity ID" value={log.entityId} />
            <Field label="IP address" value={log.ipAddress} />
            <Field label="Request ID" value={log.requestId} />
          </dl>

          <section
            aria-labelledby="audit-reason"
            className="flex flex-col gap-2"
          >
            <h3 id="audit-reason" className="text-body-sm font-medium">
              Reason
            </h3>
            {restricted ? (
              <Restricted />
            ) : (
              <p className="text-body-sm">{log.reason ?? "None given"}</p>
            )}
          </section>

          <section
            aria-labelledby="audit-changes"
            className="flex flex-col gap-2"
          >
            <h3 id="audit-changes" className="text-body-sm font-medium">
              Change
            </h3>
            {partlyHidden ? (
              <p className="text-caption text-muted">
                Some details are hidden for your role.
              </p>
            ) : null}
            {restricted ? (
              <Restricted />
            ) : changes.length === 0 ? (
              <p className="text-body-sm text-muted">
                No before or after values were recorded.
              </p>
            ) : (
              <ul className="flex flex-col gap-2" data-testid="audit-diff">
                {changes.map((change) => (
                  <li
                    key={change.path}
                    className="rounded-md border border-border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-caption break-all">
                        {change.path}
                      </code>
                      <Badge tone={KIND_TONES[change.kind]}>
                        {KIND_LABELS[change.kind]}
                      </Badge>
                    </div>
                    {change.kind === "same" ? (
                      <p className="mt-1 text-body-sm break-words text-muted">
                        {showValue(change.after)}
                      </p>
                    ) : (
                      <div className="mt-1 flex flex-col gap-0.5 text-body-sm break-words">
                        {change.kind !== "added" ? (
                          <p className="text-danger">
                            <span className="sr-only">Before: </span>
                            <span aria-hidden="true">- </span>
                            {showValue(change.before)}
                          </p>
                        ) : null}
                        {change.kind !== "removed" ? (
                          <p className="text-success">
                            <span className="sr-only">After: </span>
                            <span aria-hidden="true">+ </span>
                            {showValue(change.after)}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
