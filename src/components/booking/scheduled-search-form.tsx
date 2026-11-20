"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import type {
  Cabin,
  ScheduledSearchBody,
  ScheduledSearchResponse,
} from "@/features/scheduled-search/types";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";
import { AirportPicker } from "./airport-picker";
import { FareCalendar } from "./fare-calendar";
import {
  ScheduledTravellerPicker,
  type Passengers,
} from "./scheduled-traveller-picker";
import { useToday } from "./use-today";

type TripType = "ONE_WAY" | "ROUND_TRIP";

/**
 * The scheduled-flights search: From, To, dates (a day, not a time),
 * travellers and cabin. Fares come back as live fares from the airlines
 * (business rule 1) and are shown on /search/scheduled/[searchId].
 */
export function ScheduledSearchForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const today = useToday();
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [tripType, setTripType] = useState<TripType>("ONE_WAY");
  const [passengers, setPassengers] = useState<Passengers>({
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [cabin, setCabin] = useState<Cabin>("ECONOMY");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const roundTrip = tripType === "ROUND_TRIP";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!originId) next.origin = "Choose where you are flying from.";
    if (!destinationId) next.destination = "Choose where you are flying to.";
    if (originId && originId === destinationId)
      next.destination = "From and To must be different.";
    if (!departureDate) next.departure = "Choose a departure date.";
    else if (today && departureDate < today)
      next.departure = "The departure date cannot be in the past.";
    if (roundTrip && !returnDate) next.return = "Choose a return date.";
    else if (roundTrip && returnDate < departureDate)
      next.return = "The return cannot be before the departure.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    setFormError(null);
    const body: ScheduledSearchBody = {
      originId,
      destinationId,
      departureDate,
      ...(roundTrip ? { returnDate } : {}),
      passengers,
      cabin,
    };
    try {
      const { data } = await apiFetch<ScheduledSearchResponse>(
        "search/scheduled",
        { method: "POST", body },
      );
      queryClient.setQueryData(queryKeys.scheduledSearch(data.searchId), {
        data,
      });
      router.push(`/search/scheduled/${data.searchId}`);
    } catch (error) {
      setFormError(messageFor(error));
      setBusy(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void onSubmit(event)}
      className="flex flex-col gap-4"
    >
      <FormAlert message={formError} />
      <div
        className={cn(
          "grid grid-cols-2 gap-2 lg:items-stretch [&>*]:min-w-0",
          roundTrip
            ? "lg:grid-cols-[1fr_auto_1fr_1fr_1fr_1fr]"
            : "lg:grid-cols-[1fr_auto_1fr_1fr_1fr]",
        )}
      >
        <div className="relative col-span-2 grid overflow-hidden rounded-md bg-surface max-sm:[&>*:last-child_[data-field-tile]]:border-t max-sm:[&>*:last-child_[data-field-tile]]:border-border sm:grid-cols-2 sm:items-stretch sm:gap-2 sm:overflow-visible sm:bg-transparent lg:contents max-sm:[&_[data-field-tile]]:rounded-none max-sm:[&_[data-field-tile]]:bg-transparent max-sm:[&_[data-field-tile]]:pr-16 [&>*]:min-w-0">
          <AirportPicker
            label="From"
            value={originId}
            onChange={setOriginId}
            error={errors.origin}
          />
          <div className="absolute top-1/2 right-3 z-10 flex -translate-y-1/2 items-center justify-center sm:right-auto sm:left-1/2 sm:-translate-x-1/2 lg:static lg:translate-x-0 lg:translate-y-0">
            <button
              type="button"
              aria-label="Swap from and to"
              onClick={() => {
                setOriginId(destinationId);
                setDestinationId(originId);
              }}
              className="relative z-10 flex size-11 items-center justify-center rounded-pill border border-foreground/12 bg-surface text-accent shadow-sm transition-colors duration-150 ease-standard hover:bg-border/60 lg:-mx-5 sm:bg-surface-raised"
            >
              <ArrowLeftRight
                aria-hidden="true"
                className="size-4 rotate-90 sm:rotate-0"
              />
            </button>
          </div>
          <AirportPicker
            label="To"
            value={destinationId}
            onChange={setDestinationId}
            error={errors.destination}
          />
        </div>
        <FareCalendar
          dateOnly
          date={departureDate}
          time=""
          onTimeChange={() => {}}
          error={errors.departure}
          onDateChange={(next) => {
            setDepartureDate(next);
            if (returnDate && returnDate < next) setReturnDate("");
          }}
        />
        {roundTrip ? (
          <FareCalendar
            dateOnly
            label="Return"
            date={returnDate}
            time=""
            onTimeChange={() => {}}
            minDate={departureDate || undefined}
            error={errors.return}
            onDateChange={setReturnDate}
          />
        ) : null}
        <ScheduledTravellerPicker
          passengers={passengers}
          cabin={cabin}
          onChange={(next) => {
            setPassengers(next.passengers);
            setCabin(next.cabin);
          }}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div
          role="radiogroup"
          aria-label="Trip type"
          className="flex shrink-0 gap-0.5 self-start rounded-pill bg-surface p-0.5"
        >
          {(
            [
              ["ONE_WAY", "One way"],
              ["ROUND_TRIP", "Round trip"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={tripType === value}
              onClick={() => setTripType(value)}
              className={cn(
                "h-10 sm:h-8 rounded-pill px-3 text-body-sm transition-colors duration-150 ease-standard outline-none focus-visible:ring-2 focus-visible:ring-accent",
                tripType === value
                  ? "bg-accent-fill text-accent-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Button
          type="submit"
          size="lg"
          loading={busy}
          className="w-full sm:w-auto sm:min-w-48"
        >
          <Search aria-hidden="true" className="size-4" />
          Search flights
        </Button>
      </div>
    </form>
  );
}
