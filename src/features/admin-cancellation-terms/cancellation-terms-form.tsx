"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { applyApiError } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import {
  noticeLabel,
  tierLines,
  type CancellationTierTable,
} from "@/lib/cancellation-tiers";
import { formatDateTime } from "@/lib/format/date";
import {
  MAX_TIERS,
  TIER_FIELDS,
  tiersSchema,
  type TiersFormInput,
  type TiersFormValues,
} from "./schema";

const KEY = queryKeys.adminCancellationTerms;
const PATH = "admin/cancellation-terms";

const STALE_MESSAGE =
  "Someone changed the cancellation tiers since you opened them. The latest tiers are now shown: make your change again.";

/**
 * Flyviman's cancellation tier table (D-172), one for every operator, for
 * finance and super administrators. A change is a new version for booking
 * requests made from then on; requests already made keep their terms.
 */
export function CancellationTerms() {
  // Kept here, outside the form, so it survives the form's remount when the
  // reloaded tiers carry a new version.
  const [stale, setStale] = useState(false);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: KEY,
    queryFn: () => apiFetch<CancellationTierTable>(PATH),
  });

  return (
    <section
      aria-labelledby="cancellation-terms-heading"
      className="mt-12 flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <h2 id="cancellation-terms-heading" className="text-h3">
          Cancellation terms
        </h2>
        <p className="max-w-reading text-body text-muted">
          One table for every operator, shown with every search result and kept
          on each booking request as it was shown. A change applies to requests
          made from now on.
        </p>
      </div>
      {isPending ? (
        <Skeleton className="h-64" />
      ) : isError ? (
        <LoadError
          what="the cancellation terms"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : (
        <TiersForm
          key={data.data.version}
          current={data.data}
          stale={stale}
          onStale={setStale}
        />
      )}
    </section>
  );
}

function draftOf(current: CancellationTierTable): TiersFormInput {
  return {
    tiers: current.tiers.map((tier) => ({
      minHoursBeforeDeparture: String(tier.minHoursBeforeDeparture),
      chargePercent: String(tier.chargePercent),
    })),
    reason: "",
  };
}

function TiersForm({
  current,
  stale,
  onStale,
}: {
  current: CancellationTierTable;
  /** The last save was refused as stale and the tiers reloaded. */
  stale: boolean;
  onStale: (stale: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<TiersFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<TiersFormInput, unknown, TiersFormValues>({
    resolver: zodResolver(tiersSchema) as unknown as Resolver<
      TiersFormInput,
      unknown,
      TiersFormValues
    >,
    defaultValues: draftOf(current),
  });
  const { fields, append, remove } = useFieldArray({ control, name: "tiers" });

  async function save(values: TiersFormValues) {
    setSaving(true);
    setFormError(null);
    onStale(false);
    try {
      const saved = await apiFetch<CancellationTierTable>(PATH, {
        method: "PUT",
        body: {
          tiers: values.tiers,
          baseVersion: current.version,
          reason: values.reason,
        },
      });
      toast({
        title:
          saved.data.version === current.version
            ? "No change: the tiers are the same"
            : `Cancellation terms changed (version ${saved.data.version})`,
        tone: "success",
      });
      setPending(null);
      void queryClient.invalidateQueries({ queryKey: KEY });
    } catch (failure) {
      setPending(null);
      if (
        failure instanceof ApiError &&
        failure.code === "PRICING_RULE_NOT_CURRENT"
      ) {
        onStale(true);
        void queryClient.invalidateQueries({ queryKey: KEY });
      } else {
        setFormError(applyApiError(failure, setError, TIER_FIELDS as never));
      }
    } finally {
      setSaving(false);
    }
  }

  const tierErrors = errors.tiers as
    (Record<string, { message?: string }> | undefined)[] | undefined;

  return (
    <div className="flex flex-col gap-6 rounded-xl bg-surface p-6">
      <div className="flex flex-col gap-2">
        <p className="text-body-sm text-muted">
          Version {current.version}, in force since{" "}
          {formatDateTime(current.validFrom)}
        </p>
        <ul className="flex flex-col gap-1 text-body">
          {tierLines(current.tiers).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <form
        noValidate
        aria-label="Change the cancellation tiers"
        onSubmit={(event) =>
          void handleSubmit((values) => {
            setFormError(null);
            setPending(values);
          })(event)
        }
        className="flex flex-col gap-4"
      >
        <FormAlert message={stale ? STALE_MESSAGE : formError} />
        <p className="text-body-sm text-muted">
          Longest notice first. A tier applies from its hours before departure,
          so a boundary falls in the cheaper tier. The last tier starts at 0
          hours and covers no-shows.
        </p>
        <ol className="flex flex-col gap-4">
          {fields.map((field, index) => (
            <li
              key={field.id}
              className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[1fr_1fr_auto]"
            >
              <Input
                label={`Tier ${index + 1}: hours before departure, at least`}
                inputMode="numeric"
                className="h-10"
                error={tierErrors?.[index]?.minHoursBeforeDeparture?.message}
                {...register(`tiers.${index}.minHoursBeforeDeparture`)}
              />
              <Input
                label={`Tier ${index + 1}: charge, % of the price`}
                inputMode="numeric"
                className="h-10"
                error={tierErrors?.[index]?.chargePercent?.message}
                {...register(`tiers.${index}.chargePercent`)}
              />
              <Button
                variant="danger"
                className="h-10 sm:mt-7"
                disabled={fields.length === 1}
                onClick={() => remove(index)}
                aria-label={`Remove tier ${index + 1}`}
              >
                Remove
              </Button>
            </li>
          ))}
        </ol>
        {errors.tiers?.root?.message || errors.tiers?.message ? (
          <p role="alert" className="text-body-sm text-danger">
            {errors.tiers?.root?.message ?? errors.tiers?.message}
          </p>
        ) : null}
        <div>
          <Button
            variant="secondary"
            className="h-10"
            disabled={fields.length >= MAX_TIERS}
            onClick={() =>
              append({ minHoursBeforeDeparture: "", chargePercent: "" })
            }
          >
            Add tier
          </Button>
        </div>
        <Textarea
          label="Reason"
          hint="Kept in the audit record with the change."
          rows={2}
          error={errors.reason?.message}
          {...register("reason")}
        />
        <div>
          <Button type="submit" className="h-10">
            Review change
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !saving) setPending(null);
        }}
        title="Change the cancellation terms?"
        description={
          pending
            ? `New booking requests will be made on these terms: ${pending.tiers
                .map(
                  (tier, index) =>
                    `${noticeLabel(pending.tiers, index)}, ${tier.chargePercent}%`,
                )
                .join(
                  "; ",
                )}. Requests already made keep the terms they were shown.`
            : ""
        }
        confirmLabel={`Save version ${current.version + 1}`}
        loading={saving}
        onConfirm={() => {
          if (pending) void save(pending);
        }}
      />
    </div>
  );
}
