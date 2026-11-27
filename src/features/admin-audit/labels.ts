/** "PricingRule" as "Pricing rule", for the table (the filter takes the raw name). */
export function entityTypeLabel(entityType: string): string {
  const words = entityType.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The first block of a UUID: enough to recognise a record; the full ID is in the title and the detail. */
export function shortId(id: string): string {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id) ? id.slice(0, 8) : id;
}
