import { z } from "zod";
import type { Schemas } from "@/lib/api/types";
import {
  MOBILITY_OPTIONS,
  type PatientMobility,
} from "@/lib/air-ambulance/labels";
import { localToUtc } from "@/lib/format/zoned";

const MOBILITIES = MOBILITY_OPTIONS.map((option) => option.value);

/**
 * The air ambulance request form (W4-6). Limits are the API's
 * (`CreateAirAmbulanceRequestDto`): change both together.
 */

/** The preferred time is entered in India time, as the operations desk works. */
export const REQUEST_ZONE = "Asia/Kolkata";

/** Medical documents one request may hold (the API's limit). */
export const MAX_DOCUMENTS = 10;

// International format, as the API expects: a plus, then 8 to 15 digits.
const PHONE = /^\+[1-9]\d{7,14}$/;
const PHONE_MESSAGE =
  "Enter the number with its country code, for example +919876543210.";

/** Control or text-direction characters; line breaks allowed where `lines`. */
function hasHiddenCharacter(text: string, lines: boolean): boolean {
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (lines && (code === 0x09 || code === 0x0a || code === 0x0d)) continue;
    if (
      code < 0x20 ||
      code === 0x7f ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2066 && code <= 0x2069) ||
      code === 0x200e ||
      code === 0x200f
    ) {
      return true;
    }
  }
  return false;
}

const HIDDEN = "Remove hidden formatting characters from this text.";

function text(max: number, { required = false, lines = true } = {}) {
  return z
    .string()
    .trim()
    .max(max, `Keep this under ${max.toLocaleString("en-IN")} characters.`)
    .refine((value) => !required || value !== "", {
      message: "This is required.",
    })
    .refine((value) => !hasHiddenCharacter(value, lines), { message: HIDDEN });
}

const phone = (required: boolean) =>
  z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s-]/g, ""))
    .refine(
      (value) =>
        required ? PHONE.test(value) : value === "" || PHONE.test(value),
      {
        message: PHONE_MESSAGE,
      },
    );

const count = (min: number, max: number) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max,
      { message: `Enter a whole number from ${min} to ${max}.` },
    );

export const requestSchema = z
  .object({
    contactName: text(120, { required: true, lines: false }),
    contactPhone: phone(true),
    contactEmail: z
      .string()
      .trim()
      .max(254)
      .refine((value) => value === "" || z.email().safeParse(value).success, {
        message: "Enter a valid email address.",
      }),
    emergencyContactName: text(120, { lines: false }),
    emergencyContactPhone: phone(false),
    originLocationId: z
      .string()
      .min(1, "Choose the airport or helipad nearest the patient."),
    destinationLocationId: z
      .string()
      .min(1, "Choose the airport or helipad nearest the receiving facility."),
    pickupAddress: text(300),
    destinationFacility: text(200),
    preferredDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the preferred date."),
    preferredTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Choose the preferred time."),
    patientCount: count(1, 4),
    accompanyingPersons: count(0, 6),
    patientCondition: text(2000, { required: true }),
    mobility: z
      .string()
      .refine((value) => MOBILITIES.includes(value as PatientMobility), {
        message: "Choose how the patient moves.",
      })
      .transform((value) => value as PatientMobility),
    stretcherRequired: z.boolean(),
    oxygenRequired: z.boolean(),
    medicalStaffRequired: text(1000),
    equipmentRequired: text(1000),
    specialisedCare: text(1000),
    notes: text(2000),
  })
  .refine(
    (values) =>
      values.originLocationId === "" ||
      values.originLocationId !== values.destinationLocationId,
    {
      path: ["destinationLocationId"],
      message: "The destination must differ from the origin.",
    },
  );

export type RequestValues = z.input<typeof requestSchema>;
export type RequestOutput = z.output<typeof requestSchema>;

export const EMPTY_REQUEST: RequestValues = {
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  originLocationId: "",
  destinationLocationId: "",
  pickupAddress: "",
  destinationFacility: "",
  preferredDate: "",
  preferredTime: "",
  patientCount: "1",
  accompanyingPersons: "0",
  patientCondition: "",
  mobility: "",
  stretcherRequired: false,
  oxygenRequired: false,
  medicalStaffRequired: "",
  equipmentRequired: "",
  specialisedCare: "",
  notes: "",
};

/** Optional text left empty is left out, never sent as "". */
function optional(value: string): string | undefined {
  return value === "" ? undefined : value;
}

/** The request body for `POST /air-ambulance/requests`. */
export function toRequestBody(
  values: RequestOutput,
): Schemas["CreateAirAmbulanceRequestDto"] {
  return {
    contactName: values.contactName,
    contactPhone: values.contactPhone,
    contactEmail: optional(values.contactEmail),
    emergencyContactName: optional(values.emergencyContactName),
    emergencyContactPhone: optional(values.emergencyContactPhone),
    originLocationId: values.originLocationId,
    destinationLocationId: values.destinationLocationId,
    pickupAddress: optional(values.pickupAddress),
    destinationFacility: optional(values.destinationFacility),
    preferredAt: localToUtc(
      values.preferredDate,
      values.preferredTime,
      REQUEST_ZONE,
    ),
    patientCount: Number(values.patientCount),
    accompanyingPersons: Number(values.accompanyingPersons),
    medical: {
      patientCondition: values.patientCondition,
      mobility: values.mobility,
      stretcherRequired: values.stretcherRequired,
      oxygenRequired: values.oxygenRequired,
      medicalStaffRequired: optional(values.medicalStaffRequired),
      equipmentRequired: optional(values.equipmentRequired),
      specialisedCare: optional(values.specialisedCare),
      notes: optional(values.notes),
    },
  };
}

/** The form's field names, for placing the API's field errors. */
export const REQUEST_FIELDS = [
  "contactName",
  "contactPhone",
  "contactEmail",
  "emergencyContactName",
  "emergencyContactPhone",
  "originLocationId",
  "destinationLocationId",
  "pickupAddress",
  "destinationFacility",
  "preferredDate",
  "patientCount",
  "accompanyingPersons",
  "patientCondition",
  "mobility",
  "medicalStaffRequired",
  "equipmentRequired",
  "specialisedCare",
  "notes",
] as const;

/** API field names that differ from the form's. */
export const REQUEST_ALIASES = {
  preferredAt: "preferredDate",
  "medical.patientCondition": "patientCondition",
  "medical.mobility": "mobility",
  "medical.medicalStaffRequired": "medicalStaffRequired",
  "medical.equipmentRequired": "equipmentRequired",
  "medical.specialisedCare": "specialisedCare",
  "medical.notes": "notes",
} as const;
