import { z } from "zod";

// The API's limits: 1,000 characters for a change or an answer, 500 for a reason.
export const changeRequestSchema = z.object({
  details: z
    .string()
    .trim()
    .min(1, "Say what you would like changed.")
    .max(1000, "Use at most 1,000 characters."),
});

export const answerSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Write your answer first.")
    .max(1000, "Use at most 1,000 characters."),
});

export const cancelSchema = z.object({
  reason: z.string().trim().max(500, "Use at most 500 characters."),
});

export type ChangeRequestValues = z.input<typeof changeRequestSchema>;
export type AnswerValues = z.input<typeof answerSchema>;
export type CancelValues = z.input<typeof cancelSchema>;
