"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import type { Schemas } from "@/lib/api/types";
import {
  aircraftFieldErrors,
  type AircraftCreateField,
} from "./aircraft-create-schema";
import { HomeBaseField } from "./home-base-field";
import { CATEGORIES, wingFor } from "./categories";

export function AircraftForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [category, setCategory] = useState("LIGHT_JET");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<AircraftCreateField, string>>
  >({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    const problems = aircraftFieldErrors({
      registration: text("registration"),
      manufacturer: text("manufacturer"),
      model: text("model"),
      passengerCapacity: text("passengerCapacity"),
      rangeKm: text("rangeKm"),
      homeBaseId: text("homeBaseId"),
    });
    setFieldErrors(problems);
    if (Object.keys(problems).length > 0) {
      setError(null);
      // Take the user to the first field that needs attention.
      const first = Object.keys(problems)[0];
      event.currentTarget
        .querySelector<HTMLElement>(`[name="${first}"]:not([type=hidden])`)
        ?.focus();
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { data } = await apiFetch<Schemas["AircraftResponseDto"]>(
        "operator/aircraft",
        {
          method: "POST",
          body: {
            registration: String(form.get("registration")),
            manufacturer: String(form.get("manufacturer")),
            model: String(form.get("model")),
            category,
            wingType: wingFor(category),
            passengerCapacity: Number(form.get("passengerCapacity")),
            rangeKm: Number(form.get("rangeKm")),
            homeBaseId: String(form.get("homeBaseId")),
          },
        },
      );
      router.push(`/operator/aircraft/${data.id}`);
    } catch (failure) {
      setError(messageFor(failure));
      setPending(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void onSubmit(event)}
      className="flex max-w-lg flex-col gap-4"
    >
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
      <Input
        label="Registration"
        name="registration"
        required
        error={fieldErrors.registration}
      />
      <Input
        label="Manufacturer"
        name="manufacturer"
        required
        error={fieldErrors.manufacturer}
      />
      <Input label="Model" name="model" required error={fieldErrors.model} />
      <Select
        label="Category"
        options={CATEGORIES}
        value={category}
        onValueChange={setCategory}
      />
      <Input
        label="Passenger capacity"
        name="passengerCapacity"
        type="number"
        min={1}
        required
        error={fieldErrors.passengerCapacity}
      />
      <Input
        label="Range (km)"
        name="rangeKm"
        type="number"
        min={1}
        required
        error={fieldErrors.rangeKm}
      />
      <HomeBaseField error={fieldErrors.homeBaseId} />
      <Button type="submit" loading={pending}>
        Save and continue
      </Button>
    </form>
  );
}
