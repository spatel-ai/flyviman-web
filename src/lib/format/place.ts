/**
 * An airport name in the form people say it: the trailing "International
 * Airport" (or "Domestic Airport", "Airport", "Airfield", "Heliport") is
 * dropped so a table cell can show the place. A name that is nothing but
 * those words is returned whole. The full name belongs in a `title`.
 */
export function shortPlaceName(name: string): string {
  const short = name
    .replace(/\s+(international|domestic)?\s*(airport|airfield|heliport)$/i, "")
    .trim();
  return short === "" ? name : short;
}

/** "Mumbai → Goa" for a table cell, from the two full names. */
export function routeLabel(origin: string, destination: string): string {
  return `${shortPlaceName(origin)} → ${shortPlaceName(destination)}`;
}
