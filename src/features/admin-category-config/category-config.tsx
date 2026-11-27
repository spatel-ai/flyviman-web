"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { EmptyState } from "@/components/shared/empty-state";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ConfirmDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { applyApiError } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/format/date";
import {
  bookingModeLabel,
  bookingModeOptions,
  categoryConfigSchema,
  categoryLabel,
  changeBody,
  depositText,
  DEPOSIT_MAX,
  formDefaults,
  isDisabling,
  PAYMENT_MODEL_OPTIONS,
  paymentModelLabel,
  REASON_MAX,
  type CategoryConfig,
  type CategoryConfigChange,
  type CategoryConfigInput,
  type CategoryConfigValues,
} from "./schema";

const KEY = queryKeys.adminCategoryConfig;
const COLUMNS = [
  "Category",
  "Region",
  "Offered",
  "Booking",
  "Payment",
  "Deposit",
  "Changed",
  "",
];
const FIELDS = [
  "isEnabled",
  "bookingMode",
  "paymentModel",
  "depositPercent",
  "reason",
] as const;

/** Category configuration per region; super administrators change it. */
export function CategoryConfigView({ canEdit }: { canEdit: boolean }) {
  const [editing, setEditing] = useState<CategoryConfig | null>(null);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: KEY,
    queryFn: () => apiFetch<CategoryConfig[]>("admin/category-config"),
  });
  const rows = data?.data ?? [];

  return (
    <div className="mt-6 flex flex-col gap-6">
      {!canEdit ? (
        <p className="text-body-sm text-muted">
          Super administrators change this configuration. You can see what is in
          force.
        </p>
      ) : null}
      {isError ? (
        <LoadError
          what="the category configuration"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : !isPending && rows.length === 0 ? (
        <EmptyState
          title="No categories configured"
          description="Every category is switched off until it has a configuration row."
        />
      ) : (
        <div aria-busy={isPending || undefined}>
          {isPending ? (
            <p role="status" className="sr-only">
              Loading category configuration
            </p>
          ) : null}
          <Table>
            <TableHead>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHeaderCell key={column || "actions"}>
                    {column}
                  </TableHeaderCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isPending
                ? Array.from({ length: 5 }, (_, index) => (
                    <TableRow key={index}>
                      {COLUMNS.map((column) => (
                        <TableCell key={column || "actions"}>
                          <Skeleton className="h-5 w-20" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {categoryLabel(row.category)}
                      </TableCell>
                      <TableCell>{row.region}</TableCell>
                      <TableCell>
                        {row.isEnabled ? (
                          <Badge tone="success">Offered</Badge>
                        ) : (
                          <Badge tone="neutral">Switched off</Badge>
                        )}
                      </TableCell>
                      <TableCell>{bookingModeLabel(row.bookingMode)}</TableCell>
                      <TableCell>
                        {paymentModelLabel(row.paymentModel)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {depositText(row.paymentModel, row.depositPercent)}
                      </TableCell>
                      <TableCell>{formatDateTime(row.updatedAt)}</TableCell>
                      <TableCell>
                        {canEdit ? (
                          <Button
                            variant="secondary"
                            className="h-10"
                            onClick={() => setEditing(row)}
                            aria-label={`Change ${categoryLabel(row.category).toLowerCase()} in ${row.region}`}
                          >
                            Change
                          </Button>
                        ) : (
                          <span className="text-body-sm text-muted">
                            Read only
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
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
        <DialogContent
          title={
            editing
              ? `Change ${categoryLabel(editing.category).toLowerCase()} (${editing.region})`
              : "Change category"
          }
          description="New bookings and requests use the new booking mode and payment model; those already made keep theirs. The change and its reason are kept in the audit log."
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        >
          {editing ? (
            <ConfigForm row={editing} onDone={() => setEditing(null)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConfigForm({
  row,
  onDone,
}: {
  row: CategoryConfig;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<CategoryConfigChange | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CategoryConfigInput, unknown, CategoryConfigValues>({
    resolver: zodResolver(categoryConfigSchema),
    defaultValues: formDefaults(row),
  });
  const name = categoryLabel(row.category);

  async function send(body: CategoryConfigChange) {
    setFormError(null);
    setSaving(true);
    try {
      await apiFetch<CategoryConfig>(`admin/category-config/${row.id}`, {
        method: "PATCH",
        body,
      });
      void queryClient.invalidateQueries({ queryKey: KEY });
      toast({ title: `${name} configuration changed`, tone: "success" });
      onDone();
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.code === "CATEGORY_CONFIG_CHANGED" || error.code === "NOT_FOUND")
      ) {
        // Changed or gone meanwhile: show the latest list, edit again from it.
        void queryClient.invalidateQueries({ queryKey: KEY });
      }
      setFormError(applyApiError(error, setError, FIELDS));
    } finally {
      setSaving(false);
      setConfirming(null);
    }
  }

  function onSubmit(values: CategoryConfigValues) {
    const body = changeBody(row, values);
    if (!body) {
      setFormError("Nothing has changed. Change a setting first.");
      return;
    }
    if (isDisabling(row, values)) {
      setConfirming(body);
      return;
    }
    void send(body);
  }

  return (
    <>
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        className="flex flex-col gap-4"
      >
        <FormAlert message={formError} />
        <Controller
          control={control}
          name="isEnabled"
          render={({ field }) => (
            <Checkbox
              label={`Offer ${name.toLowerCase()}`}
              hint="Switched off, it is hidden from search and takes no new bookings or requests."
              name={field.name}
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              error={errors.isEnabled?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="bookingMode"
          render={({ field }) => (
            <Select
              label="Booking"
              hint={
                row.category === "AIR_AMBULANCE"
                  ? "Air ambulance is always a request, verified by operations and the operator."
                  : "Operators may override this for their own aircraft."
              }
              placeholder="Choose how it is booked"
              options={bookingModeOptions(row.category)}
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              className="h-10"
              error={errors.bookingMode?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="paymentModel"
          render={({ field }) => (
            <Select
              label="Payment model"
              hint="Operators may override this for their own aircraft."
              placeholder="Choose a payment model"
              options={PAYMENT_MODEL_OPTIONS}
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              className="h-10"
              error={errors.paymentModel?.message}
            />
          )}
        />
        <Input
          label="Deposit under model C (%)"
          hint="Whole percent. Read when a payment is due, so it also applies to model C bookings not yet paid."
          inputMode="numeric"
          maxLength={String(DEPOSIT_MAX).length}
          className="h-10"
          error={errors.depositPercent?.message}
          {...register("depositPercent")}
        />
        <Textarea
          label="Reason"
          hint="Kept in the audit log."
          rows={3}
          maxLength={REASON_MAX}
          error={errors.reason?.message}
          {...register("reason")}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" className="h-10">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" className="h-10" loading={saving}>
            Save
          </Button>
        </DialogFooter>
      </form>
      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title={`Switch off ${name.toLowerCase()}?`}
        description={`${name} disappears from search and takes no new bookings or requests until it is switched on again. Bookings and requests already made carry on.`}
        confirmLabel="Switch off"
        destructive
        loading={saving}
        onConfirm={() => {
          if (confirming) void send(confirming);
        }}
      />
    </>
  );
}
