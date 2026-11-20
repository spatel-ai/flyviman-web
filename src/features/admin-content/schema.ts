import { z } from "zod";

export const policySchema = z.object({
  title: z.string().trim().min(1, "Enter the title.").max(200),
  body: z.string().trim().min(1, "Enter the text.").max(50000),
});
export type PolicyValues = z.infer<typeof policySchema>;

export const templateSchema = z.object({
  subject: z.string().trim().max(200),
  body: z.string().min(1, "Enter the message.").max(5000),
  isActive: z.boolean(),
});
export type TemplateValues = z.infer<typeof templateSchema>;
