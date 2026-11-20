"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { EmptyState } from "@/components/shared/empty-state";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { Button } from "@/components/ui/button";
import {
  ConfirmDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { applyApiError, messageFor } from "@/lib/api/messages";
import type { AircraftCategory } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import {
  appliesTo,
  CATEGORY_OPTIONS,
  listIsStale,
  type PricingRule,
  type RuleScope,
} from "@/lib/pricing-rules";
import {
  describeLimits,
  fromMatchingConfig,
  matchingLimitsSchema,
  toMatchingConfig,
  type MatchingLimitsValues,
} from "./schema";

const KEY = ["admin", "pricing-rules", "matching-limits"] as const;
type View = "current" | "history";

const FIELDS = [
  "reason",
  "config.minLegKm",
  "config.maxLegKm",
  "config.minRunwayM",
  "config.minimumNoticeMinutes",
  "config.landingSites",
] as const;
const ALIASES = {
  "config.minLegKm": "minLegKm",
  "config.maxLegKm": "maxLegKm",
  "config.minRunwayM": "minRunwayM",
  "config.minimumNoticeMinutes": "minimumNoticeMinutes",
  "config.landingSites": "landingSites",
} as const;

const SCOPE_OPTIONS = [
  { value: "PLATFORM", label: "All aircraft" },
  { value: "CATEGORY", label: "One aircraft category" },
];
const LANDING_OPTIONS = [
  { value: "UNSET", label: "No limit" },
  { value: "ALLOWED", label: "Landing sites allowed" },
  { value: "NOT_ALLOWED", label: "Landing sites not allowed" },
];

/** Limits on which trips an aircraft is offered for; finance reads only. */
export function MatchingLimits({ canEdit }: { canEdit: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const view: View = params.get("view") === "history" ? "history" : "current";
  const [changing, setChanging] = useState<PricingRule | null>(null);
  const [ending, setEnding] = useState<PricingRule | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: [...KEY, view],
    queryFn: () =>
      apiFetch<PricingRule[]>("admin/pricing-rules", {
        query: {
          type: "MATCHING_LIMITS",
          active: view === "current" ? "true" : "false",
          pageSize: 100,
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
        title: `Limits for ${appliesTo(rule).toLowerCase()} ended`,
        tone: "success",
      });
      setEnding(null);
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
    onError: (failure) => {
      toast({ title: messageFor(failure), tone: "danger" });
      if (listIsStale(failure)) {
        setEnding(null);
        void queryClient.invalidateQueries({ queryKey: KEY });
      }
    },
  });

  const rules = data?.data ?? [];
  const columns =
    view === "current"
      ? ["Applies to", "Limits", "Version", "Since", ""]
      : ["Applies to", "Limits", "Version", "From", "Until"];

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Tabs
          value={view}
          onValueChange={(next) =>
            router.replace(
              next === "history"
                ? "/admin/matching-limits?view=history"
                : "/admin/matching-limits",
              { scroll: false },
            )
          }
        >
          <TabsList aria-label="Which limits">
            <TabsTrigger value="current">In force</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
        </Tabs>
        {canEdit ? <LimitsDialog /> : null}
      </div>
      {!canEdit ? (
        <p className="text-body-sm text-muted">
          Operations manage these limits. You can see what is in force and how
          it changed.
        </p>
      ) : null}

      {isError ? (
        <LoadError
          what="the matching limits"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : !isPending && rules.length === 0 ? (
        <EmptyState
          title="No matching limits"
          description="Every approved aircraft is offered for every trip it can fly."
        />
      ) : (
        <div aria-busy={isPending || undefined}>
          {isPending ? (
            <p role="status" className="sr-only">
              Loading matching limits
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
                ? Array.from({ length: 3 }, (_, index) => (
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
                        {appliesTo(rule)}
                      </TableCell>
                      <TableCell>{describeLimits(rule.config)}</TableCell>
                      <TableCell className="tabular-nums">
                        {rule.version}
                      </TableCell>
                      <TableCell>{formatDateTime(rule.validFrom)}</TableCell>
                      {view === "history" ? (
                        <TableCell>
                          {rule.inForce
                            ? "In force"
                            : rule.validTo
                              ? formatDateTime(rule.validTo)
                              : "Ended"}
                        </TableCell>
                      ) : canEdit && rule.editable ? (
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              className="h-10"
                              onClick={() => setChanging(rule)}
                              aria-label={`Change limits for ${appliesTo(rule).toLowerCase()}`}
                            >
                              Change
                            </Button>
                            {rule.scope === "CATEGORY" ? (
                              <Button
                                variant="ghost"
                                className="h-10"
                                onClick={() => setEnding(rule)}
                                aria-label={`End limits for ${appliesTo(rule).toLowerCase()}`}
                              >
                                End
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      ) : (
                        <TableCell className="text-body-sm text-muted">
                          Read only
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={changing !== null}
        onOpenChange={(open) => {
          if (!open) setChanging(null);
        }}
      >
        <DialogContent
          title={
            changing
              ? `Change limits for ${appliesTo(changing).toLowerCase()}`
              : "Change limits"
          }
          description={
            changing
              ? `Now: ${describeLimits(changing.config)}. Saving creates version ${changing.version + 1}.`
              : undefined
          }
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        >
          {changing ? (
            <LimitsForm rule={changing} onDone={() => setChanging(null)} />
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={ending !== null}
        onOpenChange={(open) => {
          if (!open) setEnding(null);
        }}
        title={
          ending
            ? `End limits for ${appliesTo(ending).toLowerCase()}?`
            : "End limits?"
        }
        description="This category is offered by the limits for all aircraft alone."
        confirmLabel="End limits"
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

function LimitsDialog() {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<RuleScope>("PLATFORM");
  const [category, setCategory] = useState<AircraftCategory>("LIGHT_JET");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-10">Add limits</Button>
      </DialogTrigger>
      <DialogContent
        title="Add matching limits"
        description="Takes effect at once. The limits for all aircraft and for a category both apply; the stricter wins."
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
      >
        {open ? (
          <div className="flex flex-col gap-4">
            <Select
              label="Applies to"
              options={SCOPE_OPTIONS}
              value={scope}
              onValueChange={(value) => setScope(value as RuleScope)}
              className="h-10"
            />
            {scope === "CATEGORY" ? (
              <Select
                label="Aircraft category"
                options={CATEGORY_OPTIONS}
                value={category}
                onValueChange={(value) =>
                  setCategory(value as AircraftCategory)
                }
                className="h-10"
              />
            ) : null}
            <LimitsForm
              target={{
                scope,
                scopeRef: scope === "CATEGORY" ? category : null,
              }}
              onDone={() => setOpen(false)}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function LimitsForm({
  rule,
  target,
  onDone,
}: {
  rule?: PricingRule;
  target?: { scope: RuleScope; scopeRef: string | null };
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MatchingLimitsValues>({
    resolver: zodResolver(matchingLimitsSchema),
    defaultValues: { ...fromMatchingConfig(rule?.config), reason: "" },
  });

  async function onSubmit(values: MatchingLimitsValues) {
    setFormError(null);
    const body = { config: toMatchingConfig(values), reason: values.reason };
    try {
      if (rule) {
        await apiFetch<PricingRule>(`admin/pricing-rules/${rule.id}`, {
          method: "PATCH",
          body,
        });
        toast({ title: "Matching limits changed", tone: "success" });
      } else if (target) {
        await apiFetch<PricingRule>("admin/pricing-rules", {
          method: "POST",
          body: { type: "MATCHING_LIMITS", ...target, ...body },
        });
        toast({ title: "Matching limits added", tone: "success" });
      }
      void queryClient.invalidateQueries({ queryKey: KEY });
      onDone();
    } catch (error) {
      if (listIsStale(error)) {
        void queryClient.invalidateQueries({ queryKey: KEY });
      }
      setFormError(
        applyApiError(error, setError, FIELDS as never, ALIASES as never),
      );
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      <FormAlert message={formError} />
      <p className="text-body-sm text-muted">
        Leave a field empty for no limit.
      </p>
      <Input
        label="Shortest leg (km)"
        inputMode="numeric"
        className="h-10"
        error={errors.minLegKm?.message}
        {...register("minLegKm")}
      />
      <Input
        label="Longest leg (km)"
        inputMode="numeric"
        className="h-10"
        error={errors.maxLegKm?.message}
        {...register("maxLegKm")}
      />
      <Input
        label="Shortest runway (metres)"
        inputMode="numeric"
        className="h-10"
        error={errors.minRunwayM?.message}
        {...register("minRunwayM")}
      />
      <Input
        label="Minimum notice (minutes)"
        hint="Up to 10,080 (7 days)."
        inputMode="numeric"
        className="h-10"
        error={errors.minimumNoticeMinutes?.message}
        {...register("minimumNoticeMinutes")}
      />
      <Controller
        control={control}
        name="landingSites"
        render={({ field }) => (
          <Select
            label="Landing sites"
            options={LANDING_OPTIONS}
            name={field.name}
            value={field.value || "UNSET"}
            onValueChange={(value) =>
              field.onChange(value === "UNSET" ? "" : value)
            }
            className="h-10"
            error={errors.landingSites?.message}
          />
        )}
      />
      <Textarea
        label="Reason"
        hint="Kept in the audit record with the change."
        rows={2}
        error={errors.reason?.message}
        {...register("reason")}
      />
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary" className="h-10">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" className="h-10" loading={isSubmitting}>
          {rule ? "Save new version" : "Add limits"}
        </Button>
      </DialogFooter>
    </form>
  );
}
