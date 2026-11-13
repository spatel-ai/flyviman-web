"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  Ambulance,
  ArrowLeftRight,
  Fan,
  Plane,
  Search,
  TicketsPlane,
  Timer,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/button-classes";
import {
  CHARTER_CATEGORIES,
  searchSchema,
  toSearchBody,
  type SearchOutput,
  type SearchValues,
} from "@/features/search/schema";
import { apiFetch } from "@/lib/api/client";
import { applyApiError } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { AirportPicker } from "./airport-picker";
import { FareCalendar } from "./fare-calendar";
import { TravellerPicker } from "./traveller-picker";

type SearchResponse = Schemas["SearchResponseDto"];

export type Service =
  "charter" | "helicopter" | "empty-legs" | "flights" | "air-ambulance";

const SERVICES: {
  id: Service;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
}[] = [
  { id: "charter", label: "Private jet", icon: Plane },
  { id: "helicopter", label: "Helicopter", icon: Fan },
  { id: "empty-legs", label: "Empty legs", icon: Timer, soon: true },
  { id: "flights", label: "Flights", icon: TicketsPlane, soon: true },
  { id: "air-ambulance", label: "Air ambulance", icon: Ambulance },
];

const FIELDS = ["originId", "destinationId", "passengerCount"] as const;

export interface WidgetInitial {
  service?: Service;
  originId?: string;
  destinationId?: string;
  date?: string;
  time?: string;
  passengerCount?: number;
  category?: string;
}

/**
 * The search card: service tabs, then From, To, Departure and Travellers as
 * large tiles, and one primary action. Charter and helicopter search now;
 * empty legs and scheduled flights are marked as coming; air ambulance is a
 * request, never a search (business rule 7).
 */
export function SearchWidget({
  initial = {},
  compact = false,
}: {
  initial?: WidgetInitial;
  /** Tighter spacing, for the results page. */
  compact?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [service, setService] = useState<Service>(initial.service ?? "charter");
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SearchValues, unknown, SearchOutput>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      kind: initial.service === "helicopter" ? "helicopter" : "charter",
      originId: initial.originId ?? "",
      destinationId: initial.destinationId ?? "",
      date: initial.date ?? "",
      time: initial.time ?? "10:00",
      passengerCount: String(initial.passengerCount ?? 2),
      category: initial.category ?? "ANY",
    },
  });
  const [originId, destinationId, passengerCount, category, kind] = useWatch({
    control,
    name: ["originId", "destinationId", "passengerCount", "category", "kind"],
  });

  function chooseService(next: Service) {
    setService(next);
    if (next === "charter" || next === "helicopter") setValue("kind", next);
  }

  async function onSubmit(values: SearchOutput) {
    setFormError(null);
    try {
      const { data } = await apiFetch<SearchResponse>(`search/${values.kind}`, {
        method: "POST",
        body: toSearchBody(values),
      });
      queryClient.setQueryData(queryKeys.search(data.searchId), { data });
      router.push(`/search/${data.searchId}`);
    } catch (error) {
      setFormError(
        applyApiError(error, setError, FIELDS) ??
          "The search could not be run. Check the details and try again.",
      );
    }
  }

  const searchable = service === "charter" || service === "helicopter";

  return (
    <div
      className={cn(
        "rounded-xl bg-surface-raised shadow-lg",
        compact ? "p-4" : "p-4 md:p-6",
      )}
    >
      <div
        role="tablist"
        aria-label="What would you like to fly?"
        className="-mx-1 flex gap-1 overflow-x-auto pb-1"
      >
        {SERVICES.map(({ id, label, icon: Icon, soon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={service === id}
            onClick={() => chooseService(id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-pill px-4 py-2 text-body-sm font-medium",
              "transition-colors duration-150 ease-standard outline-none focus-visible:ring-2 focus-visible:ring-accent",
              service === id
                ? "bg-accent-fill text-accent-foreground"
                : "text-muted hover:bg-surface hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
            {soon ? (
              <span className="rounded-pill bg-surface px-2 text-micro text-muted">
                Soon
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        aria-label={SERVICES.find((s) => s.id === service)?.label}
        className="mt-4"
      >
        {service === "air-ambulance" ? (
          <div className="flex flex-col items-start gap-3 rounded-md bg-surface p-5">
            <p className="text-title">
              In an emergency, call 112 or your local emergency services first.
            </p>
            <p className="text-body text-muted">
              An air ambulance is arranged on request: our operations team and
              the operator verify every mission before it is confirmed.
            </p>
            <Link
              href="/contact?topic=MEDICAL_CHARTER#enquiry"
              className={buttonClasses({ variant: "secondary" })}
            >
              Request an air ambulance
            </Link>
          </div>
        ) : !searchable ? (
          <div className="flex flex-col items-start gap-3 rounded-md bg-surface p-5">
            <p className="text-title">
              {service === "empty-legs"
                ? "Empty legs are coming soon"
                : "Scheduled flights are coming soon"}
            </p>
            <p className="text-body text-muted">
              Tell us your trip and our team will find you options in the
              meantime.
            </p>
            <Link
              href="/contact?topic=PRIVATE_CHARTER#enquiry"
              className={buttonClasses({ variant: "secondary" })}
            >
              Send an enquiry
            </Link>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(event) => void handleSubmit(onSubmit)(event)}
            className="flex flex-col gap-4"
          >
            <FormAlert message={formError} />
            <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr_1fr_1fr] md:items-stretch [&>*]:min-w-0">
              <Controller
                control={control}
                name="originId"
                render={({ field }) => (
                  <AirportPicker
                    label="From"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.originId?.message}
                  />
                )}
              />
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  aria-label="Swap From and To"
                  onClick={() => {
                    const { originId: from, destinationId: to } = getValues();
                    setValue("originId", to);
                    setValue("destinationId", from);
                  }}
                  className="flex size-10 items-center justify-center rounded-pill bg-surface text-accent shadow-sm transition-colors duration-150 ease-standard hover:bg-border/60 md:-mx-4 md:size-9 md:bg-surface-raised"
                >
                  <ArrowLeftRight
                    aria-hidden="true"
                    className="size-4 max-md:rotate-90"
                  />
                </button>
              </div>
              <Controller
                control={control}
                name="destinationId"
                render={({ field }) => (
                  <AirportPicker
                    label="To"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.destinationId?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <Controller
                    control={control}
                    name="time"
                    render={({ field: timeField }) => (
                      <FareCalendar
                        date={field.value}
                        time={timeField.value}
                        onDateChange={field.onChange}
                        onTimeChange={timeField.onChange}
                        error={errors.date?.message}
                        route={{
                          kind,
                          originId,
                          destinationId,
                          passengerCount: Number(passengerCount),
                          aircraftCategory:
                            category !== "ANY" ? category : undefined,
                        }}
                      />
                    )}
                  />
                )}
              />
              <Controller
                control={control}
                name="passengerCount"
                render={({ field }) => (
                  <TravellerPicker
                    value={Number(field.value)}
                    onChange={(count) => field.onChange(String(count))}
                    error={errors.passengerCount?.message}
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {kind === "charter" ? (
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <div
                      role="radiogroup"
                      aria-label="Aircraft"
                      className="flex flex-wrap gap-1.5"
                    >
                      {CHARTER_CATEGORIES.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={field.value === option.value}
                          onClick={() => field.onChange(option.value)}
                          className={cn(
                            "h-9 rounded-pill border px-3 text-body-sm transition-colors duration-150 ease-standard",
                            field.value === option.value
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-border text-muted hover:text-foreground",
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                />
              ) : (
                <span />
              )}
              <Button
                type="submit"
                size="lg"
                loading={isSubmitting}
                className="md:min-w-48"
              >
                <Search aria-hidden="true" className="size-4" />
                Search
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
