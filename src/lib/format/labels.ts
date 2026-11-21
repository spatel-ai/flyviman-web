import type { Schemas } from "@/lib/api/types";

const SERVICES: Record<Schemas["ServiceCategory"], string> = {
  SCHEDULED_AIRLINE: "Scheduled airline",
  PRIVATE_CHARTER: "Private charter",
  HELICOPTER: "Helicopter",
  EMPTY_LEG: "Empty legs",
  AIR_AMBULANCE: "Air ambulance",
};

/** Customer-facing name of a service category; unknown values pass through. */
export function serviceLabel(category: string): string {
  return Object.hasOwn(SERVICES, category)
    ? SERVICES[category as Schemas["ServiceCategory"]]
    : category;
}
