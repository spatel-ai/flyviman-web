import type { Schemas } from "@/lib/api/types";

const SERVICES: Record<Schemas["ServiceCategory"], string> = {
  SCHEDULED_AIRLINE: "Scheduled airline",
  PRIVATE_CHARTER: "Private charter",
  HELICOPTER: "Helicopter",
  EMPTY_LEG: "Empty legs",
  AIR_AMBULANCE: "Air ambulance",
};

/** "SOME_NEW_VALUE" becomes "Some new value". */
function words(value: string): string {
  const text = value
    .replace(/[_\s]+/g, " ")
    .trim()
    .toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Customer-facing name of a service category; a new value reads as words. */
export function serviceLabel(category: string): string {
  return Object.hasOwn(SERVICES, category)
    ? SERVICES[category as Schemas["ServiceCategory"]]
    : words(category);
}

const CHANNELS: Record<string, string> = { EMAIL: "Email", SMS: "SMS" };

/** Name of a notification channel; a new value reads as words. */
export function channelLabel(channel: string): string {
  return Object.hasOwn(CHANNELS, channel) ? CHANNELS[channel] : words(channel);
}
