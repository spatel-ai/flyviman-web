/** Aircraft categories an operator can list, and the wing type each needs. */
export const CATEGORIES = [
  { value: "TURBOPROP", label: "Turboprop" },
  { value: "LIGHT_JET", label: "Light jet" },
  { value: "MIDSIZE_JET", label: "Midsize jet" },
  { value: "HEAVY_JET", label: "Heavy jet" },
  { value: "HELICOPTER", label: "Helicopter" },
  { value: "AIR_AMBULANCE_FIXED", label: "Air ambulance, fixed wing" },
  { value: "AIR_AMBULANCE_ROTARY", label: "Air ambulance, rotary" },
];

export function wingFor(category: string) {
  return category === "HELICOPTER" || category === "AIR_AMBULANCE_ROTARY"
    ? "HELICOPTER"
    : "FIXED_WING";
}
