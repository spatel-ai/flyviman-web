import {
  OPERATOR_DOCUMENT_TYPES,
  operatorDocumentLabel,
} from "@/lib/format/documents";
import { z } from "zod";
import type { Schemas } from "@/lib/api/types";

export type OperatorProfile = Schemas["OperatorProfileResponseDto"];
export type OperatorDocument = Schemas["OperatorDocumentResponseDto"];
export type UpdateOperatorProfileBody = Schemas["UpdateOperatorProfileDto"];

// --- Options ---------------------------------------------------------------

export const SERVICE_CATEGORIES = [
  { value: "PRIVATE_CHARTER", label: "Private charter" },
  { value: "HELICOPTER", label: "Helicopter" },
  { value: "EMPTY_LEG", label: "Empty legs" },
  { value: "AIR_AMBULANCE", label: "Air ambulance" },
] as const;

export type OperatorCategory = (typeof SERVICE_CATEGORIES)[number]["value"];

const CATEGORY_VALUES = SERVICE_CATEGORIES.map((category) => category.value);

export const DOCUMENT_TYPES = OPERATOR_DOCUMENT_TYPES;

export type DocumentType = (typeof DOCUMENT_TYPES)[number]["value"];

/** The wording for a document type; an unknown type is shown as it is. */
export const documentTypeLabel = operatorDocumentLabel;

// --- Company details -------------------------------------------------------

/** The same pattern the API checks (E.164). */
const E164 = /^\+[1-9]\d{7,14}$/;
const POSTAL_CODE = /^[A-Za-z0-9 -]{3,12}$/;
const COUNTRY = /^[A-Za-z]{2}$/;

export const MAX_REGIONS = 50;
const MAX_REGION_LENGTH = 100;

const ADDRESS_PARTS = [
  "line1",
  "line2",
  "city",
  "state",
  "postalCode",
] as const;

const addressSchema = z.object({
  line1: z.string().trim().max(200, "Use 200 characters or fewer."),
  line2: z.string().trim().max(200, "Use 200 characters or fewer."),
  city: z.string().trim().max(100, "Use 100 characters or fewer."),
  state: z.string().trim().max(100, "Use 100 characters or fewer."),
  postalCode: z.string().trim(),
  country: z.string().trim(),
});

type AddressValues = z.infer<typeof addressSchema>;

/** Nothing typed in the address yet. The country has a default, so it does not count. */
function addressIsEmpty(address: AddressValues): boolean {
  return ADDRESS_PARTS.every((part) => address[part].trim() === "");
}

/**
 * Splits the comma-separated regions field: trimmed, blanks dropped,
 * duplicates removed without regard to case (the first spelling is kept).
 */
export function parseRegions(text: string): string[] {
  const seen = new Set<string>();
  const regions: string[] = [];
  for (const part of text.split(",")) {
    const region = part.trim().replace(/\s+/g, " ");
    const key = region.toLowerCase();
    if (!region || seen.has(key)) continue;
    seen.add(key);
    regions.push(region);
  }
  return regions;
}

/**
 * The company details form. It can be saved as a draft, so the registration
 * number, address and categories may be empty here; the API reports what is
 * still needed before submitting in `profile.missing`. An address is either
 * left empty or filled in completely.
 */
export const companyDetailsSchema = z
  .object({
    legalName: z
      .string()
      .trim()
      .min(2, "Enter the registered company name.")
      .max(200, "Use 200 characters or fewer."),
    tradingName: z.string().trim().max(200, "Use 200 characters or fewer."),
    registrationNumber: z
      .string()
      .trim()
      .max(50, "Use 50 characters or fewer."),
    taxNumber: z.string().trim().max(50, "Use 50 characters or fewer."),
    contactName: z
      .string()
      .trim()
      .min(2, "Enter the contact person's name.")
      .max(200, "Use 200 characters or fewer."),
    contactEmail: z.email("Enter a valid email address.").max(254),
    contactPhone: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || E164.test(value),
        "Use the international format, for example +919876543210.",
      ),
    businessAddress: addressSchema,
    serviceCategories: z.array(z.enum(CATEGORY_VALUES)),
    operatingRegions: z.string(),
  })
  .superRefine((values, context) => {
    const address = values.businessAddress;
    if (!addressIsEmpty(address)) {
      const required = [
        ["line1", "Enter the first line of the address."],
        ["city", "Enter the city."],
        ["state", "Enter the state."],
      ] as const;
      for (const [part, message] of required) {
        if (address[part] === "") {
          context.addIssue({
            code: "custom",
            path: ["businessAddress", part],
            message,
          });
        }
      }
      if (!POSTAL_CODE.test(address.postalCode)) {
        context.addIssue({
          code: "custom",
          path: ["businessAddress", "postalCode"],
          message: "Enter a valid postal code, for example 400001.",
        });
      }
      if (!COUNTRY.test(address.country)) {
        context.addIssue({
          code: "custom",
          path: ["businessAddress", "country"],
          message: "Use the two-letter country code, for example IN.",
        });
      }
    }

    const regions = parseRegions(values.operatingRegions);
    if (regions.length > MAX_REGIONS) {
      context.addIssue({
        code: "custom",
        path: ["operatingRegions"],
        message: `List ${MAX_REGIONS} regions or fewer.`,
      });
    } else if (regions.some((region) => region.length > MAX_REGION_LENGTH)) {
      context.addIssue({
        code: "custom",
        path: ["operatingRegions"],
        message: `Keep each region to ${MAX_REGION_LENGTH} characters or fewer.`,
      });
    }
  });

export type CompanyDetailsValues = z.infer<typeof companyDetailsSchema>;

/** Every field the API can report a validation issue on. */
export const COMPANY_DETAILS_FIELDS = [
  "legalName",
  "tradingName",
  "registrationNumber",
  "taxNumber",
  "contactName",
  "contactEmail",
  "contactPhone",
  "businessAddress.line1",
  "businessAddress.line2",
  "businessAddress.city",
  "businessAddress.state",
  "businessAddress.postalCode",
  "businessAddress.country",
  "serviceCategories",
  "operatingRegions",
] as const;

export const DEFAULT_COUNTRY = "IN";

function isOperatorCategory(value: string): value is OperatorCategory {
  return (CATEGORY_VALUES as readonly string[]).includes(value);
}

/** The saved profile as the form shows it. */
export function toFormValues(profile: OperatorProfile): CompanyDetailsValues {
  const address = profile.businessAddress;
  return {
    legalName: profile.legalName,
    tradingName: profile.tradingName ?? "",
    registrationNumber: profile.registrationNumber ?? "",
    taxNumber: profile.taxNumber ?? "",
    contactName: profile.contactName,
    contactEmail: profile.contactEmail,
    contactPhone: profile.contactPhone ?? "",
    businessAddress: {
      line1: address?.line1 ?? "",
      line2: address?.line2 ?? "",
      city: address?.city ?? "",
      state: address?.state ?? "",
      postalCode: address?.postalCode ?? "",
      country: address?.country ?? DEFAULT_COUNTRY,
    },
    serviceCategories: profile.serviceCategories.filter(isOperatorCategory),
    operatingRegions: profile.operatingRegions.join(", "),
  };
}

function orNull(value: string): string | null {
  const text = value.trim();
  return text === "" ? null : text;
}

/**
 * The `PATCH operator/profile` body for the form's values. Empty optional
 * text becomes `null`, an untouched address becomes `null`, and the regions
 * become a list. With `identityLocked` (after approval) what operations
 * reviewed is left out: the legal and trading names, registration number,
 * GSTIN and service categories. The API refuses any request that carries
 * them.
 */
export function toUpdateBody(
  values: CompanyDetailsValues,
  { identityLocked = false }: { identityLocked?: boolean } = {},
): UpdateOperatorProfileBody {
  const address = values.businessAddress;
  const body: UpdateOperatorProfileBody = {
    contactName: values.contactName.trim(),
    contactEmail: values.contactEmail.trim(),
    contactPhone: orNull(values.contactPhone),
    businessAddress: addressIsEmpty(address)
      ? null
      : {
          line1: address.line1.trim(),
          line2: orNull(address.line2),
          city: address.city.trim(),
          state: address.state.trim(),
          postalCode: address.postalCode.trim(),
          country: address.country.trim().toUpperCase(),
        },
    operatingRegions: parseRegions(values.operatingRegions),
  };
  if (identityLocked) return body;
  return {
    legalName: values.legalName.trim(),
    tradingName: orNull(values.tradingName),
    serviceCategories: values.serviceCategories,
    registrationNumber: orNull(values.registrationNumber),
    taxNumber: orNull(values.taxNumber),
    ...body,
  };
}

// --- What is still missing -------------------------------------------------

const MISSING_LABELS: Record<string, string> = {
  registrationNumber: "Add your company registration number",
  businessAddress: "Add your business address",
  serviceCategories: "Choose at least one service you offer",
  "document:AOC": "Upload your air operator certificate",
  "document:INSURANCE": "Upload your insurance certificate",
};

/** Plain wording for one entry of `profile.missing`. */
export function missingLabel(key: string): string {
  const known = Object.hasOwn(MISSING_LABELS, key)
    ? MISSING_LABELS[key]
    : undefined;
  if (known) return known;
  if (key.startsWith("document:")) {
    const type = documentTypeLabel(key.slice("document:".length));
    return `Upload this document: ${type}`;
  }
  return `Complete this detail: ${key}`;
}

/** The checklist for `profile.missing`, without repeats, in the API's order. */
export function missingChecklist(missing: readonly string[]): string[] {
  return [...new Set(missing.map(missingLabel))];
}

const SUBMITTABLE: readonly string[] = ["DRAFT", "REJECTED"];

/** An application is sent for review from a draft or after a rejection. */
export function isSubmittable(status: string): boolean {
  return SUBMITTABLE.includes(status);
}

export function canSubmit(profile: {
  status: string;
  missing: readonly string[];
}): boolean {
  return isSubmittable(profile.status) && profile.missing.length === 0;
}

// --- Document uploads ------------------------------------------------------

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

/** What is wrong with a chosen file, or `null` when it can be uploaded. */
export function fileProblem(file: {
  type: string;
  size: number;
}): string | null {
  if (!(ACCEPTED_FILE_TYPES as readonly string[]).includes(file.type)) {
    return "Choose a PDF, JPEG or PNG file.";
  }
  if (file.size === 0) return "This file is empty. Choose another file.";
  if (file.size > MAX_UPLOAD_BYTES) {
    return "This file is larger than 10 MB. Choose a smaller file.";
  }
  return null;
}

/** A calendar date ("2030-12-31" or a timestamp) as "31 Dec 2030". */
export function formatDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
