import { z } from "zod";
import type { Role } from "@/lib/api/types";
import { ROLE_LABELS } from "@/lib/auth/roles";

/** The internal roles a staff account can be created with. */
export const STAFF_ROLES = [
  "OPS",
  "FINANCE_ADMIN",
  "SUPER_ADMIN",
] as const satisfies readonly Role[];

export const STAFF_ROLE_OPTIONS = STAFF_ROLES.map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));

export const staffSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254, "Enter a valid email address.")
    .pipe(z.email("Enter a valid email address.")),
  role: z.enum(STAFF_ROLES, "Choose a role."),
});

export type StaffInput = z.input<typeof staffSchema>;
export type StaffValues = z.output<typeof staffSchema>;
