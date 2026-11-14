"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/format/date";
import { AddRuleDialog, ChangeRuleDialog } from "./rule-dialog";
import {
  appliesTo,
  canManage,
  describeConfig,
  listIsStale,
  ruleLabel,
  type PricingRule,
} from "./rules";

const PAGE_SIZE = 50;
type View = "current" | "history";

export function RulesList() {
  const router = useRouter();
  const params = useSearchParams();
  const view: View = params.get("view") === "history" ? "history" : "current";
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const [changing, setChanging] = useState<PricingRule | null>(null);
  const [ending, setEnding] = useState<PricingRule | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filter = { view, page };
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminPricingRules(filter),
    queryFn: () =>
      apiFetch<PricingRule[]>("admin/pricing-rules", {
        query: {
          active: view === "current" ? "true" : "false",
          page,
          pageSize: PAGE_SIZE,
        },
      }),
  });

  const end = useMutation({
    mutationFn: ({ rule, reason }: { rule: PricingRule; reason: string }) =>
      apiFetch<PricingRule>(`admin/pricing-rules/${rule.id}/deactivate`, {
        method: "POST",
        body: { reason },
      }),
    onSuccess: (_, { rule }) => {
      toast({
        title: `${ruleLabel(rule.type)} for ${appliesTo(rule).toLowerCase()} ended`,
        description: "The rule for all aircraft applies again.",
        tone: "success",
      });
      setEnding(null);
      void queryClient.invalidateQueries({
        queryKey: ["admin", "pricing-rules"],
      });
    },
    onError: (failure) => {
      toast({ title: messageFor(failure), tone: "danger" });
      if (listIsStale(failure)) {
        setEnding(null);
        void queryClient.invalidateQueries({
          queryKey: ["admin", "pricing-rules"],
        });
      }
    },
  });

  function show(next: { view: View; page: number }) {
    const search = new URLSearchParams();
    if (next.view === "history") search.set("view", "history");
    if (next.page > 1) search.set("page", String(next.page));
    const query = search.toString();
    router.replace(
      query ? `/admin/pricing/rules?${query}` : "/admin/pricing/rules",
      {
        scroll: false,
      },
    );
  }

  const rules = data?.data ?? [];
  const columns =
    view === "current"
      ? ["Rule", "Applies to", "Setting", "Version", "Since", ""]
      : ["Rule", "Applies to", "Setting", "Version", "From", "Until"];

  // Operations can reach the address but not the rules (finance only).
  if (isError && error instanceof ApiError && error.code === "FORBIDDEN") {
    return <ManagedByFinance />;
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Tabs
          value={view}
          onValueChange={(next) => show({ view: next as View, page: 1 })}
        >
          <TabsList aria-label="Which rules">
            <TabsTrigger value="current">In force</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
        </Tabs>
        <AddRuleDialog />
      </div>

      {isError ? (
        <LoadError
          what="the pricing rules"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : !isPending && rules.length === 0 ? (
        <EmptyState
          title="No pricing rules"
          description="Add commission and tax so that estimates can be priced."
        />
      ) : (
        <>
          <div aria-busy={isPending || undefined}>
            {isPending ? (
              <p role="status" className="sr-only">
                Loading pricing rules
              </p>
            ) : null}
            <Table>
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableHeaderCell key={column || "actions"}>
                      {column}
                    </TableHeaderCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {isPending
                  ? Array.from({ length: 6 }, (_, index) => (
                      <TableRow key={index}>
                        {columns.map((column) => (
                          <TableCell key={column || "actions"}>
                            <Skeleton className="h-5 w-24" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">
                          {ruleLabel(rule.type)}
                        </TableCell>
                        <TableCell>{appliesTo(rule)}</TableCell>
                        <TableCell className="tabular-nums">
                          {describeConfig(rule.type, rule.config)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {rule.version}
                        </TableCell>
                        <TableCell>{formatDateTime(rule.validFrom)}</TableCell>
                        {view === "current" && !canManage(rule) ? (
                          <TableCell className="text-body-sm text-muted">
                            Not managed here
                          </TableCell>
                        ) : view === "current" ? (
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="secondary"
                                className="h-10"
                                onClick={() => setChanging(rule)}
                                aria-label={`Change ${ruleLabel(rule.type).toLowerCase()} for ${appliesTo(rule).toLowerCase()}`}
                              >
                                Change
                              </Button>
                              {rule.scope === "CATEGORY" ? (
                                <Button
                                  variant="ghost"
                                  className="h-10"
                                  onClick={() => setEnding(rule)}
                                  aria-label={`End ${ruleLabel(rule.type).toLowerCase()} for ${appliesTo(rule).toLowerCase()}`}
                                >
                                  End
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        ) : (
                          <TableCell>
                            {rule.inForce
                              ? "In force"
                              : rule.validTo
                                ? formatDateTime(rule.validTo)
                                : "Ended"}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={data?.meta.total ?? 0}
            onPageChange={(next) => show({ view, page: next })}
          />
        </>
      )}

      <ChangeRuleDialog
        rule={changing}
        onOpenChange={(open) => {
          if (!open) setChanging(null);
        }}
      />
      <ConfirmDialog
        open={ending !== null}
        onOpenChange={(open) => {
          if (!open) setEnding(null);
        }}
        title={
          ending
            ? `End ${ruleLabel(ending.type).toLowerCase()} for ${appliesTo(ending).toLowerCase()}?`
            : "End rule?"
        }
        description="New estimates for this category will use the rule for all aircraft. Estimates already given are not changed."
        confirmLabel="End rule"
        destructive
        requireReason
        loading={end.isPending}
        onConfirm={(reason) => {
          if (ending) end.mutate({ rule: ending, reason: reason ?? "" });
        }}
      />
    </div>
  );
}

/**
 * What operations see at this address. The page picks it from the session
 * before anything loads (so finance controls never flash); the list falls
 * back to it if the API still says FORBIDDEN, for a role changed mid-visit.
 */
export function ManagedByFinance() {
  return (
    <p className="mt-6 max-w-reading text-body text-muted">
      Pricing rules are managed by finance. You can see how any estimate was
      worked out under Price calculations.
    </p>
  );
}
