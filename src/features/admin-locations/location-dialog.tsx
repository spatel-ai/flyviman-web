"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { applyApiError } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { CATEGORY_OPTIONS, TYPE_OPTIONS } from "./labels";
import {
  locationSchema,
  paiseToRupees,
  rupeesToPaise,
  toCreateBody,
  toUpdateBody,
  type ChargeRow,
  type LocationInput,
  type LocationValues,
} from "./schema";

type Location = Schemas["AdminLocationResponseDto"];

const NIGHT_OPTIONS = [
  { value: "unknown", label: "Unknown" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const FIELD_PATHS = [
  "type",
  "name",
  "iata",
  "icao",
  "city",
  "state",
  "country",
  "latitude",
  "longitude",
  "timeZone",
  "runwayLengthM",
  "nightOperations",
  "helicopterApproved",
  "isActive",
] as const;

type Category = LocationValues["chargeCategory"];
/** Amounts as typed, per aircraft category; blank means no charge set. */
type ChargeDraft = { landing: string; parking: string; handling: string };
const BLANK: ChargeDraft = { landing: "", parking: "", handling: "" };
const AMOUNT_FIELDS = [
  "landingRupees",
  "parkingRupees",
  "handlingRupees",
] as const;

function storedDrafts(
  location?: Location,
): Partial<Record<Category, ChargeDraft>> {
  const drafts: Partial<Record<Category, ChargeDraft>> = {};
  for (const row of location?.charges?.categories ?? []) {
    drafts[row.category] = {
      landing: paiseToRupees(row.landingMinor),
      parking: paiseToRupees(row.parkingMinor),
      handling: paiseToRupees(row.handlingMinor),
    };
  }
  return drafts;
}

/** Draft rows for every category except the one on screen. */
function otherRows(
  drafts: Partial<Record<Category, ChargeDraft>>,
  onScreen: Category,
): ChargeRow[] {
  const rows: ChargeRow[] = [];
  for (const [category, draft] of Object.entries(drafts) as [
    Category,
    ChargeDraft,
  ][]) {
    if (category === onScreen) continue;
    const landing = rupeesToPaise(draft.landing);
    const parking = rupeesToPaise(draft.parking);
    const handling = rupeesToPaise(draft.handling);
    // Drafts are validated before the category changes; skip blank rows.
    if (landing == null && parking == null && handling == null) continue;
    rows.push({
      category,
      landingMinor: landing ?? 0,
      parkingMinor: parking ?? 0,
      handlingMinor: handling ?? 0,
    });
  }
  return rows;
}

function defaults(location?: Location): LocationInput {
  const charge = location?.charges?.categories[0];
  return {
    type: location?.type ?? "LANDING_SITE",
    name: location?.name ?? "",
    iata: location?.iata ?? "",
    icao: location?.icao ?? "",
    city: location?.city ?? "",
    state: location?.state ?? "",
    country: location?.country ?? "IN",
    latitude: location?.latitude ?? "",
    longitude: location?.longitude ?? "",
    timeZone: location?.timeZone ?? "Asia/Kolkata",
    runwayLengthM: location?.capabilities.runwayLengthM ?? "",
    nightOperations:
      location?.capabilities.nightOperations === true
        ? "yes"
        : location?.capabilities.nightOperations === false
          ? "no"
          : "unknown",
    helicopterApproved: location?.capabilities.helicopterApproved ?? true,
    isActive: location?.isActive ?? true,
    hasCharges: Boolean(charge),
    chargeCategory: charge?.category ?? "HELICOPTER",
    landingRupees: charge ? paiseToRupees(charge.landingMinor) : "",
    parkingRupees: charge ? paiseToRupees(charge.parkingMinor) : "",
    handlingRupees: charge ? paiseToRupees(charge.handlingMinor) : "",
  };
}

export function AddLocationDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-10">Add location</Button>
      </DialogTrigger>
      <DialogContent
        title="Add location"
        description="Airports, heliports and landing sites that search and pricing can use."
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
      >
        {open ? <LocationForm onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

export function EditLocationDialog({
  location,
  open,
  onOpenChange,
}: {
  location: Location | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Edit location"
        description={location?.name}
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
      >
        {open && location ? (
          <LocationForm
            location={location}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function LocationForm({
  location,
  onDone,
}: {
  location?: Location;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const editing = Boolean(location);
  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<LocationInput, unknown, LocationValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: defaults(location),
  });
  const hasCharges = useWatch({ control, name: "hasCharges" });
  // Every category's amounts, so switching category neither copies one
  // category's figures to another nor loses what was typed.
  const [drafts, setDrafts] = useState(() => storedDrafts(location));

  async function switchCategory(next: Category) {
    const current = getValues("chargeCategory");
    if (next === current) return;
    if (!(await trigger([...AMOUNT_FIELDS]))) return;
    const [landing, parking, handling] = getValues([...AMOUNT_FIELDS]);
    setDrafts((previous) => ({
      ...previous,
      [current]: {
        landing: String(landing ?? ""),
        parking: String(parking ?? ""),
        handling: String(handling ?? ""),
      },
    }));
    const draft = drafts[next] ?? BLANK;
    setValue("chargeCategory", next);
    setValue("landingRupees", draft.landing);
    setValue("parkingRupees", draft.parking);
    setValue("handlingRupees", draft.handling);
  }

  async function onSubmit(values: LocationValues) {
    setFormError(null);
    try {
      if (editing && location) {
        await apiFetch<Location>(`admin/locations/${location.id}`, {
          method: "PATCH",
          body: toUpdateBody(
            values,
            otherRows(drafts, values.chargeCategory),
            location.charges,
          ),
        });
        toast({ title: "Location updated", tone: "success" });
      } else {
        await apiFetch<Location>("admin/locations", {
          method: "POST",
          body: toCreateBody(values, otherRows(drafts, values.chargeCategory)),
        });
        toast({ title: "Location added", tone: "success" });
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.adminLocations({}).slice(0, 2),
      });
      onDone();
    } catch (error) {
      if (error instanceof ApiError && error.code === "LOCATION_CODE_IN_USE") {
        for (const detail of error.details) {
          if (detail.field === "iata" || detail.field === "icao") {
            setError(detail.field, {
              type: "server",
              message: "Another location already has this code.",
            });
          }
        }
        return;
      }
      setFormError(applyApiError(error, setError, FIELD_PATHS));
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      {formError ? (
        <p
          role="alert"
          className="rounded-sm bg-danger/12 px-3.5 py-2.5 text-body-sm text-danger"
        >
          {formError}
        </p>
      ) : null}

      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <Select
            label="Type"
            options={TYPE_OPTIONS}
            name={field.name}
            value={field.value}
            onValueChange={field.onChange}
            className="h-10"
            error={errors.type?.message}
          />
        )}
      />
      <Input
        label="Name"
        className="h-10"
        error={errors.name?.message}
        {...register("name")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="IATA code"
          hint="Optional. Three letters."
          className="h-10"
          error={errors.iata?.message}
          {...register("iata")}
        />
        <Input
          label="ICAO code"
          hint="Optional. Four letters."
          className="h-10"
          error={errors.icao?.message}
          {...register("icao")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="City"
          className="h-10"
          error={errors.city?.message}
          {...register("city")}
        />
        <Input
          label="State"
          className="h-10"
          error={errors.state?.message}
          {...register("state")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Country"
          hint="ISO two-letter code."
          className="h-10"
          error={errors.country?.message}
          {...register("country")}
        />
        <Input
          label="Time zone"
          hint="IANA name, for example Asia/Kolkata."
          className="h-10"
          error={errors.timeZone?.message}
          {...register("timeZone")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Latitude"
          type="number"
          step="any"
          className="h-10"
          error={errors.latitude?.message}
          {...register("latitude")}
        />
        <Input
          label="Longitude"
          type="number"
          step="any"
          className="h-10"
          error={errors.longitude?.message}
          {...register("longitude")}
        />
      </div>

      <fieldset className="flex flex-col gap-4 border-t border-border pt-4">
        <legend className="text-title">Capabilities</legend>
        <Input
          label="Runway length (metres)"
          hint="Leave blank when unknown or for heliports."
          type="number"
          className="h-10"
          error={errors.runwayLengthM?.message}
          {...register("runwayLengthM")}
        />
        <Controller
          control={control}
          name="nightOperations"
          render={({ field }) => (
            <Select
              label="Night operations"
              options={NIGHT_OPTIONS}
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              className="h-10"
              error={errors.nightOperations?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="helicopterApproved"
          render={({ field }) => (
            <Checkbox
              label="Helicopters may use this location"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              name={field.name}
            />
          )}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-border pt-4">
        <legend className="text-title">Charges</legend>
        <Controller
          control={control}
          name="hasCharges"
          render={({ field }) => (
            <Checkbox
              label="Set default landing, parking and handling charges"
              hint="Leave an amount blank when it is not set. Unticking removes the charges for every aircraft category."
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              name={field.name}
            />
          )}
        />
        {hasCharges ? (
          <>
            <Controller
              control={control}
              name="chargeCategory"
              render={({ field }) => (
                <Select
                  label="Aircraft category"
                  options={CATEGORY_OPTIONS}
                  name={field.name}
                  value={field.value}
                  onValueChange={(category) =>
                    void switchCategory(category as Category)
                  }
                  className="h-10"
                  error={errors.chargeCategory?.message}
                />
              )}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Landing (₹)"
                inputMode="decimal"
                className="h-10"
                error={errors.landingRupees?.message}
                {...register("landingRupees")}
              />
              <Input
                label="Parking (₹)"
                inputMode="decimal"
                className="h-10"
                error={errors.parkingRupees?.message}
                {...register("parkingRupees")}
              />
              <Input
                label="Handling (₹)"
                inputMode="decimal"
                className="h-10"
                error={errors.handlingRupees?.message}
                {...register("handlingRupees")}
              />
            </div>
          </>
        ) : null}
      </fieldset>

      {editing ? (
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <Checkbox
              label="Active (shown in search and bookable)"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              name={field.name}
            />
          )}
        />
      ) : null}

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary" className="h-10">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" className="h-10" loading={isSubmitting}>
          {editing ? "Save changes" : "Add location"}
        </Button>
      </DialogFooter>
    </form>
  );
}
