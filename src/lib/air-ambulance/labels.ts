import type { Tone } from "@/components/ui/badge";
import type { Schemas } from "@/lib/api/types";

/**
 * Words for air ambulance values, shared by the customer, operator and admin
 * pages (M11, W4-6). A request is called a request until it is CONFIRMED
 * (frontend-design.md, product rule 3). An unknown value from a newer API
 * is shown as sent, never a crash.
 */

export type AirAmbulanceStatus = Schemas["AirAmbulanceStatus"];
export type PatientMobility = Schemas["PatientMobility"];

const STATUS: Record<AirAmbulanceStatus, { label: string; tone: Tone }> = {
  SUBMITTED: { label: "Request received", tone: "info" },
  ASSIGNED: { label: "Request assigned", tone: "info" },
  SOURCING: { label: "Finding an operator", tone: "info" },
  FEASIBILITY_CHECK: { label: "Checking feasibility", tone: "info" },
  QUOTED: { label: "Quote ready", tone: "warning" },
  ACCEPTED: { label: "Quote accepted, request pending", tone: "warning" },
  CONFIRMED: { label: "Confirmed", tone: "success" },
  COMPLETED: { label: "Completed", tone: "success" },
  DECLINED: { label: "Declined", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
};

export function statusPresentation(status: string): {
  label: string;
  tone: Tone;
} {
  return (
    STATUS[status as AirAmbulanceStatus] ?? { label: status, tone: "neutral" }
  );
}

/** Statuses after which nothing moves any more. */
export const CLOSED_STATUSES: readonly string[] = [
  "COMPLETED",
  "DECLINED",
  "CANCELLED",
];

export const STATUS_OPTIONS: { value: AirAmbulanceStatus; label: string }[] = (
  Object.keys(STATUS) as AirAmbulanceStatus[]
).map((value) => ({
  value,
  label: STATUS[value].label,
}));

export const MOBILITY_OPTIONS: { value: PatientMobility; label: string }[] = [
  { value: "AMBULATORY", label: "Walks unaided" },
  { value: "ASSISTED", label: "Walks with help" },
  { value: "NON_AMBULATORY", label: "Cannot walk (bed or stretcher)" },
];

export function mobilityLabel(mobility: string): string {
  return (
    MOBILITY_OPTIONS.find((option) => option.value === mobility)?.label ??
    mobility
  );
}

/** The feasibility checklist, in the order operations work through it. */
export const FEASIBILITY_ITEMS = [
  { key: "operatorAcceptance", label: "Operator has accepted the mission" },
  { key: "aircraft", label: "Aircraft available and fitted" },
  { key: "crew", label: "Flight crew available" },
  { key: "medicalTeam", label: "Medical team available" },
  { key: "medicalSuitability", label: "Patient fit to fly (medical review)" },
  { key: "equipment", label: "Medical equipment on board" },
  { key: "landingPermissions", label: "Landing permissions" },
  { key: "clearances", label: "Other clearances" },
  { key: "weather", label: "Weather suitable" },
] as const;

export type FeasibilityKey = (typeof FEASIBILITY_ITEMS)[number]["key"];

/** `FLY-AA-` and six letters or digits (the API's reference format). */
const REFERENCE = /^FLY-AA-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

/** Only a well-formed reference may reach an API path built from it. */
export function isAirAmbulanceReference(value: string): boolean {
  return REFERENCE.test(value);
}
