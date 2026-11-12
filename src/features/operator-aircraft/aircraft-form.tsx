"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import type { Schemas } from "@/lib/api/types";
import { HomeBaseField } from "./home-base-field";
import { CATEGORIES, wingFor } from "./categories";

export function AircraftForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [category, setCategory] = useState("LIGHT_JET");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!form.get("homeBaseId")) {
      setError("Choose the aircraft's home base.");
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
      onSubmit={(event) => void onSubmit(event)}
      className="flex max-w-lg flex-col gap-4"
    >
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
      <Input label="Registration" name="registration" required />
      <Input label="Manufacturer" name="manufacturer" required />
      <Input label="Model" name="model" required />
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
      />
      <Input label="Range (km)" name="rangeKm" type="number" min={1} required />
      <HomeBaseField />
      <Button type="submit" loading={pending}>
        Save and continue
      </Button>
    </form>
  );
}
