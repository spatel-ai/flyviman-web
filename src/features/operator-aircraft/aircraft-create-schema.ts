import { z } from "zod";

/** Limits match the API's `CreateAircraftDto`. */
export const aircraftCreateSchema = z.object({
  registration: z
    .string()
    .trim()
    .min(2, "Enter the registration, for example VT-ABC.")
    .max(20, "Use 20 characters or fewer."),
  manufacturer: z
    .string()
    .trim()
    .min(1, "Enter the manufacturer.")
    .max(100, "Use 100 characters or fewer."),
  model: z
    .string()
    .trim()
    .min(1, "Enter the model.")
    .max(100, "Use 100 characters or fewer."),
  passengerCapacity: z
    .number({ error: "Enter the number of passengers." })
    .int("Use a whole number.")
    .min(1, "At least 1 passenger.")
    .max(100, "At most 100 passengers."),
  rangeKm: z
    .number({ error: "Enter the range in kilometres." })
    .int("Use a whole number.")
    .min(1, "At least 1 km.")
    .max(20_000, "At most 20,000 km."),
  homeBaseId: z.string().min(1, "Choose the aircraft's home base."),
});

export type AircraftCreateField = keyof z.infer<typeof aircraftCreateSchema>;

/** The text typed into each field. Empty number fields become NaN-free `undefined`. */
export function aircraftFieldErrors(raw: {
  registration: string;
  manufacturer: string;
  model: string;
  passengerCapacity: string;
  rangeKm: string;
  homeBaseId: string;
}): Partial<Record<AircraftCreateField, string>> {
  const asNumber = (text: string) =>
    text.trim() === "" ? undefined : Number(text);
  const result = aircraftCreateSchema.safeParse({
    ...raw,
    passengerCapacity: asNumber(raw.passengerCapacity),
    rangeKm: asNumber(raw.rangeKm),
  });
  if (result.success) return {};
  const errors: Partial<Record<AircraftCreateField, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as AircraftCreateField;
    errors[field] ??= issue.message;
  }
  return errors;
}
