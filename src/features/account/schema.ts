import { z } from "zod";
import type { Schemas } from "@/lib/api/types";
import {
  choice,
  name,
  orNull,
  pastDate,
} from "@/components/shared/passenger-schema";

export {
  DOCUMENT_TYPES,
  EMPTY_PASSENGER,
  GENDERS,
  NONE,
  passengerSchema,
  toPassengerBody,
  toPassengerValues,
  type PassengerValues,
} from "@/components/shared/passenger-schema";

export const profileSchema = z.object({
  firstName: name("first name"),
  lastName: name("last name"),
  dateOfBirth: pastDate,
  nationality: z.string(),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export function toProfileBody(values: ProfileValues): Schemas["UpdateMeDto"] {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    dateOfBirth: orNull(values.dateOfBirth),
    nationality: choice(values.nationality),
  };
}

/** Confirms "delete my account" with the current password (email accounts). */
export const erasePasswordSchema = z.object({
  password: z.string().min(1, "Enter your password.").max(200),
});
export type ErasePasswordValues = z.infer<typeof erasePasswordSchema>;

/** Confirms it with a code (accounts registered with a mobile number). */
export const eraseCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the six-digit code."),
});
export type EraseCodeValues = z.infer<typeof eraseCodeSchema>;

/** Shows only the last four characters of an identity document number. */
export function maskDocumentNumber(value: string): string {
  const visible = value.slice(-4);
  return `${"•".repeat(Math.max(value.length - 4, 0))}${visible}`;
}
