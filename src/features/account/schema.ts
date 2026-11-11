import { z } from "zod";
import type { Schemas } from "@/lib/api/types";

/** Stands for "nothing chosen" in a select, which cannot hold an empty value. */
export const NONE = "NONE";

const name = (label: string) =>
  z.string().trim().min(1, `Enter the ${label}.`).max(100);
const optionalDate = z
  .string()
  .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), {
    message: "Enter a valid date.",
  });
const pastDate = optionalDate.refine(
  (value) => value === "" || new Date(value) <= new Date(),
  { message: "This date cannot be in the future." },
);

export const profileSchema = z.object({
  firstName: name("first name"),
  lastName: name("last name"),
  dateOfBirth: pastDate,
  nationality: z.string(),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const GENDERS = [
  { value: "UNSPECIFIED", label: "Prefer not to say" },
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "OTHER", label: "Other" },
] as const;

export const DOCUMENT_TYPES = [
  { value: NONE, label: "No document" },
  { value: "PASSPORT", label: "Passport" },
  { value: "AADHAAR", label: "Aadhaar" },
  { value: "DRIVING_LICENCE", label: "Driving licence" },
  { value: "VOTER_ID", label: "Voter ID" },
  { value: "OTHER", label: "Other" },
] as const;

export const passengerSchema = z
  .object({
    firstName: name("first name"),
    lastName: name("last name"),
    dateOfBirth: pastDate,
    gender: z.enum(["UNSPECIFIED", "FEMALE", "MALE", "OTHER"]),
    nationality: z.string(),
    documentType: z.string(),
    documentNumber: z
      .string()
      .trim()
      .regex(
        /^$|^[A-Za-z0-9 -]{4,30}$/,
        "Use 4 to 30 letters, digits, spaces or hyphens.",
      ),
    documentExpiry: optionalDate,
    specialAssistance: z.string().trim().max(500),
  })
  .refine(
    (values) => values.documentType === NONE || values.documentNumber !== "",
    { path: ["documentNumber"], message: "Enter the document number." },
  );
export type PassengerValues = z.infer<typeof passengerSchema>;

type Passenger = Schemas["PassengerResponseDto"];
type PassengerBody = Schemas["CreatePassengerDto"];

const orNull = (value: string) => (value.trim() === "" ? null : value.trim());
const choice = (value: string) =>
  value === NONE || value === "" ? null : value;

export function toProfileBody(values: ProfileValues): Schemas["UpdateMeDto"] {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    dateOfBirth: orNull(values.dateOfBirth),
    nationality: choice(values.nationality),
  };
}

/** No document type means no document: its number and expiry are cleared too. */
export function toPassengerBody(values: PassengerValues): PassengerBody {
  const documentType = choice(
    values.documentType,
  ) as PassengerBody["documentType"];
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    dateOfBirth: orNull(values.dateOfBirth),
    gender: values.gender,
    nationality: choice(values.nationality),
    documentType,
    documentNumber: documentType ? orNull(values.documentNumber) : null,
    documentExpiry: documentType ? orNull(values.documentExpiry) : null,
    specialAssistance: orNull(values.specialAssistance),
  };
}

export const EMPTY_PASSENGER: PassengerValues = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "UNSPECIFIED",
  nationality: NONE,
  documentType: NONE,
  documentNumber: "",
  documentExpiry: "",
  specialAssistance: "",
};

export function toPassengerValues(passenger: Passenger): PassengerValues {
  return {
    firstName: passenger.firstName,
    lastName: passenger.lastName,
    dateOfBirth: passenger.dateOfBirth ?? "",
    gender: passenger.gender,
    nationality: passenger.nationality ?? NONE,
    documentType: passenger.documentType ?? NONE,
    documentNumber: passenger.documentNumber ?? "",
    documentExpiry: passenger.documentExpiry ?? "",
    specialAssistance: passenger.specialAssistance ?? "",
  };
}

/** Shows only the last four characters of an identity document number. */
export function maskDocumentNumber(value: string): string {
  const visible = value.slice(-4);
  return `${"•".repeat(Math.max(value.length - 4, 0))}${visible}`;
}
