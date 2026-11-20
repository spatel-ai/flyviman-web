"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { LocationField } from "@/components/shared/location-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { applyApiError } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import {
  PROMOTION_ALIASES,
  PROMOTION_FIELDS,
  promotionSchema,
  toPromotionBody,
  type Promotion,
  type PromotionFormInput,
  type PromotionFormValues,
} from "./schema";

const KIND_OPTIONS = [
  { value: "PERCENT", label: "A percentage off" },
  { value: "FIXED", label: "A fixed amount off" },
];

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "Charter and helicopter" },
  { value: "PRIVATE_CHARTER", label: "Charter only" },
  { value: "HELICOPTER", label: "Helicopter only" },
];

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
}

export function NewPromotionDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-10">New promotion</Button>
      </DialogTrigger>
      <DialogContent
        title="New promotion code"
        description="Customers enter the code on a trip. Flyviman funds the discount, so the operator is paid the same; it never takes more than Flyviman earns on the trip. A promotion cannot be edited once created, only ended."
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
      >
        {open ? <PromotionForm onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function PromotionForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PromotionFormInput, unknown, PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      code: "",
      name: "",
      kind: "PERCENT",
      value: "",
      category: "ALL",
      originId: "",
      destinationId: "",
      startsOn: today(),
      endsOn: "",
      maxUses: "",
      maxUsesPerCustomer: "1",
      reason: "",
    },
  });
  const kind = useWatch({ control, name: "kind" });

  async function onSubmit(values: PromotionFormValues) {
    setFormError(null);
    try {
      const created = await apiFetch<Promotion>("admin/promotions", {
        method: "POST",
        body: toPromotionBody(values),
      });
      toast({
        title: `Promotion ${created.data.code} created`,
        tone: "success",
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.adminPromotionsAll,
      });
      onDone();
    } catch (error) {
      setFormError(
        applyApiError(error, setError, PROMOTION_FIELDS, PROMOTION_ALIASES),
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
      <Input
        label="Code"
        hint="What customers type, for example WINTER10. Letters, digits and dashes."
        autoComplete="off"
        className="h-10 uppercase"
        error={errors.code?.message}
        {...register("code")}
      />
      <Input
        label="Name"
        hint="Shown to the customer on the discount line."
        className="h-10"
        error={errors.name?.message}
        {...register("name")}
      />
      <Controller
        control={control}
        name="kind"
        render={({ field }) => (
          <Select
            label="Discount"
            options={KIND_OPTIONS}
            name={field.name}
            value={field.value}
            onValueChange={field.onChange}
            className="h-10"
          />
        )}
      />
      <Input
        label={kind === "PERCENT" ? "Percentage off" : "Amount off (₹)"}
        hint={
          kind === "PERCENT"
            ? "Of the price before tax, up to two decimals."
            : "In rupees, for example 5000."
        }
        inputMode="decimal"
        className="h-10"
        error={errors.value?.message}
        {...register("value")}
      />
      <Controller
        control={control}
        name="category"
        render={({ field }) => (
          <Select
            label="Applies to"
            options={CATEGORY_OPTIONS}
            name={field.name}
            value={field.value}
            onValueChange={field.onChange}
            className="h-10"
          />
        )}
      />
      <fieldset className="flex flex-col gap-3">
        <legend className="text-body-sm font-medium">
          Route (optional, either direction)
        </legend>
        <Controller
          control={control}
          name="originId"
          render={({ field }) => (
            <LocationField
              label="From"
              searchLabel="Find the first place"
              value={field.value}
              onChange={field.onChange}
              error={errors.originId?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="destinationId"
          render={({ field }) => (
            <LocationField
              label="To"
              searchLabel="Find the second place"
              value={field.value}
              onChange={field.onChange}
              error={errors.destinationId?.message}
            />
          )}
        />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="First day"
          type="date"
          className="h-10"
          error={errors.startsOn?.message}
          {...register("startsOn")}
        />
        <Input
          label="Last day"
          type="date"
          hint="Ends at midnight, India time."
          className="h-10"
          error={errors.endsOn?.message}
          {...register("endsOn")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Uses in all"
          hint="Empty: no limit."
          inputMode="numeric"
          className="h-10"
          error={errors.maxUses?.message}
          {...register("maxUses")}
        />
        <Input
          label="Uses per customer"
          hint="Empty: no limit."
          inputMode="numeric"
          className="h-10"
          error={errors.maxUsesPerCustomer?.message}
          {...register("maxUsesPerCustomer")}
        />
      </div>
      <Textarea
        label="Reason"
        hint="Kept in the audit record."
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
          Create promotion
        </Button>
      </DialogFooter>
    </form>
  );
}
