import type { AircraftCategory, LocationType } from "@/lib/api/types";

export const TYPE_LABELS: Record<LocationType, string> = {
  AIRPORT: "Airport",
  HELIPORT: "Heliport",
  LANDING_SITE: "Landing site",
  CITY: "City",
};

export const TYPE_OPTIONS = (
  Object.entries(TYPE_LABELS) as [LocationType, string][]
).map(([value, label]) => ({ value, label }));

export const CATEGORY_LABELS: Record<AircraftCategory, string> = {
  TURBOPROP: "Turboprop",
  LIGHT_JET: "Light jet",
  MIDSIZE_JET: "Midsize jet",
  HEAVY_JET: "Heavy jet",
  HELICOPTER: "Helicopter",
  AIR_AMBULANCE_FIXED: "Air ambulance (fixed wing)",
  AIR_AMBULANCE_ROTARY: "Air ambulance (rotary)",
};

export const CATEGORY_OPTIONS = (
  Object.entries(CATEGORY_LABELS) as [AircraftCategory, string][]
).map(([value, label]) => ({ value, label }));
