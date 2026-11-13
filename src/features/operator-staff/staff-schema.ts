import { z } from "zod";
import { CAPABILITY_LABELS, type Capability } from "@/lib/operator-access";

export const CAPABILITIES = Object.keys(CAPABILITY_LABELS) as Capability[];

export const CAPABILITY_HINTS: Record<Capability, string> = {
  MANAGE_AIRCRAFT:
    "Edit details, photos and documents, and submit for review. Only you add new aircraft.",
  MANAGE_AVAILABILITY: "Add and change availability and holds on the calendar.",
};

/** Permissions as the form holds them; also the body of an edit. */
export const permissionsSchema = z
  .object({
    capabilities: z
      .array(z.enum(CAPABILITIES as [Capability, ...Capability[]]))
      .min(1, "Choose at least one permission."),
    allAircraft: z.boolean(),
    aircraftIds: z.array(z.string()),
  })
  .refine((value) => value.allAircraft || value.aircraftIds.length > 0, {
    path: ["aircraftIds"],
    message: "Choose at least one aircraft, or all aircraft.",
  });

export const inviteSchema = permissionsSchema.and(
  z.object({
    email: z
      .string()
      .trim()
      .min(1, "Enter an email address.")
      .max(254, "Use at most 254 characters.")
      .pipe(z.email("Enter a valid email address.")),
  }),
);

export type PermissionsValues = z.infer<typeof permissionsSchema>;
export type InviteValues = z.infer<typeof inviteSchema>;

/** The body the API takes: with all aircraft, no list is sent. */
export function permissionsBody(values: PermissionsValues): PermissionsValues {
  return {
    capabilities: values.capabilities,
    allAircraft: values.allAircraft,
    aircraftIds: values.allAircraft ? [] : values.aircraftIds,
  };
}
