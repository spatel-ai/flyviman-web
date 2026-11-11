"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { applyApiError } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import { FormAlert } from "@/components/shared/form-alert";
import { hasCode, onboardingMessage } from "./messages";
import {
  canSubmit,
  COMPANY_DETAILS_FIELDS,
  companyDetailsSchema,
  SERVICE_CATEGORIES,
  toFormValues,
  toUpdateBody,
  type CompanyDetailsValues,
  type OperatorProfile,
} from "./schema";

const LOCKED_HINT = "Locked after approval. Contact support to change it.";

const LEGEND = "mb-4 text-body font-medium text-foreground";
const GRID = "grid gap-4 sm:grid-cols-2";

export function CompanyDetailsForm({ profile }: { profile: OperatorProfile }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const categoriesId = useId();
  const [formError, setFormError] = useState<string | null>(null);

  const underReview = profile.status === "PENDING_REVIEW";
  const identityLocked =
    profile.status === "APPROVED" || profile.status === "SUSPENDED";
  const lockedHint = identityLocked ? LOCKED_HINT : undefined;

  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompanyDetailsValues>({
    resolver: zodResolver(companyDetailsSchema),
    defaultValues: toFormValues(profile),
  });

  async function onSubmit(values: CompanyDetailsValues) {
    setFormError(null);
    try {
      const { data } = await apiFetch<OperatorProfile>("operator/profile", {
        method: "PATCH",
        body: toUpdateBody(values, { identityLocked }),
      });
      queryClient.setQueryData(queryKeys.operatorProfile, data);
      reset(toFormValues(data));
      toast({ title: "Details saved", tone: "success" });
      if (data.status !== profile.status) router.refresh();
    } catch (error) {
      if (
        hasCode(error, "OPERATOR_UNDER_REVIEW") ||
        hasCode(error, "OPERATOR_FIELD_LOCKED")
      ) {
        // The status moved on since this page loaded: show it as it is now.
        setFormError(onboardingMessage(error));
        void queryClient.invalidateQueries({
          queryKey: queryKeys.operatorProfile,
        });
        router.refresh();
        return;
      }
      setFormError(applyApiError(error, setError, COMPANY_DETAILS_FIELDS));
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-6"
    >
      <FormAlert message={formError} />
      <fieldset
        disabled={underReview}
        className="flex min-w-0 flex-col gap-8 disabled:opacity-80"
      >
        <fieldset className="min-w-0">
          <legend className={LEGEND}>Company</legend>
          <div className={GRID}>
            <Input
              label="Legal name"
              autoComplete="organization"
              disabled={identityLocked}
              hint={lockedHint}
              error={errors.legalName?.message}
              {...register("legalName")}
            />
            <Input
              label="Trading name (optional)"
              disabled={identityLocked}
              hint={lockedHint}
              error={errors.tradingName?.message}
              {...register("tradingName")}
            />
            <Input
              label="Registration number"
              disabled={identityLocked}
              hint={lockedHint ?? "Your company identification number (CIN)."}
              error={errors.registrationNumber?.message}
              {...register("registrationNumber")}
            />
            <Input
              label="GSTIN"
              disabled={identityLocked}
              hint={lockedHint}
              error={errors.taxNumber?.message}
              {...register("taxNumber")}
            />
          </div>
        </fieldset>

        <fieldset className="min-w-0">
          <legend className={LEGEND}>Contact</legend>
          <div className={GRID}>
            <Input
              label="Contact name"
              autoComplete="name"
              error={errors.contactName?.message}
              {...register("contactName")}
            />
            <Input
              label="Contact email"
              type="email"
              inputMode="email"
              autoComplete="email"
              error={errors.contactEmail?.message}
              {...register("contactEmail")}
            />
            <Input
              label="Contact phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              hint="International format, for example +919876543210."
              error={errors.contactPhone?.message}
              {...register("contactPhone")}
            />
          </div>
        </fieldset>

        <fieldset className="min-w-0">
          <legend className={LEGEND}>Business address</legend>
          <div className={GRID}>
            <Input
              label="Address line 1"
              autoComplete="address-line1"
              error={errors.businessAddress?.line1?.message}
              {...register("businessAddress.line1")}
            />
            <Input
              label="Address line 2 (optional)"
              autoComplete="address-line2"
              error={errors.businessAddress?.line2?.message}
              {...register("businessAddress.line2")}
            />
            <Input
              label="City"
              autoComplete="address-level2"
              error={errors.businessAddress?.city?.message}
              {...register("businessAddress.city")}
            />
            <Input
              label="State"
              autoComplete="address-level1"
              error={errors.businessAddress?.state?.message}
              {...register("businessAddress.state")}
            />
            <Input
              label="Postal code"
              autoComplete="postal-code"
              error={errors.businessAddress?.postalCode?.message}
              {...register("businessAddress.postalCode")}
            />
            <Input
              label="Country code"
              autoComplete="country"
              autoCapitalize="characters"
              maxLength={2}
              hint="Two letters, for example IN."
              error={errors.businessAddress?.country?.message}
              {...register("businessAddress.country")}
            />
          </div>
        </fieldset>

        <fieldset
          className="min-w-0"
          aria-describedby={
            errors.serviceCategories ? `${categoriesId}-error` : undefined
          }
        >
          <legend className={LEGEND}>Services you offer</legend>
          <Controller
            control={control}
            name="serviceCategories"
            render={({ field }) => (
              <div className="grid gap-x-4 sm:grid-cols-2">
                {SERVICE_CATEGORIES.map((category) => (
                  <Checkbox
                    key={category.value}
                    label={category.label}
                    name={field.name}
                    value={category.value}
                    checked={field.value.includes(category.value)}
                    disabled={identityLocked}
                    onBlur={field.onBlur}
                    onCheckedChange={(checked) =>
                      field.onChange(
                        checked === true
                          ? [...field.value, category.value]
                          : field.value.filter(
                              (value) => value !== category.value,
                            ),
                      )
                    }
                  />
                ))}
              </div>
            )}
          />
          {errors.serviceCategories?.message ? (
            <p
              id={`${categoriesId}-error`}
              role="alert"
              className="mt-1.5 text-caption text-danger"
            >
              {errors.serviceCategories.message}
            </p>
          ) : null}
          <div className="mt-4">
            <Input
              label="Operating regions"
              hint="Separate regions with commas, for example Maharashtra, Goa."
              error={errors.operatingRegions?.message}
              {...register("operatingRegions")}
            />
          </div>
        </fieldset>
      </fieldset>

      {underReview ? null : (
        <div>
          <Button
            type="submit"
            // One primary action per view: Submit for review takes it once
            // the application is complete.
            variant={canSubmit(profile) ? "secondary" : "primary"}
            loading={isSubmitting}
          >
            Save details
          </Button>
        </div>
      )}
    </form>
  );
}
