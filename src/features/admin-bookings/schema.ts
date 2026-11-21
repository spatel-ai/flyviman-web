import { z } from "zod";

// The API's limits: a reason is 3 to 500 characters, a note 1 to 2,000, the
// answer to a change request 1 to 1,000.
export const overrideSchema = z.object({
  status: z.string().min(1, "Choose the new status."),
  reason: z
    .string()
    .trim()
    .min(3, "Give a reason of at least 3 characters.")
    .max(500, "Use at most 500 characters."),
});

export const noteSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, "Write the note first.")
    .max(2000, "Use at most 2,000 characters."),
});

export const decideSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, "Write a note for the customer.")
    .max(1000, "Use at most 1,000 characters."),
});

export type OverrideValues = z.input<typeof overrideSchema>;
export type NoteValues = z.input<typeof noteSchema>;
export type DecideValues = z.input<typeof decideSchema>;

// The API's limits for an escalation's reason or resolution: 3 to 500.
export const escalationSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Give a reason of at least 3 characters.")
    .max(500, "Use at most 500 characters."),
});

export type EscalationValues = z.input<typeof escalationSchema>;
