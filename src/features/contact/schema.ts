import { z } from "zod";
import { ENQUIRY_TOPICS, type EnquiryTopic } from "@/content/contact";
import type { Schemas } from "@/lib/api/types";

const TOPICS = ENQUIRY_TOPICS.map((topic) => topic.value) as [
  EnquiryTopic,
  ...EnquiryTopic[],
];

/** The topic named in the address, or a general enquiry. */
export function topicFrom(value: string | null): EnquiryTopic {
  return TOPICS.includes(value as EnquiryTopic)
    ? (value as EnquiryTopic)
    : "GENERAL";
}

// International format, as the API expects: a plus, then 8 to 15 digits.
const PHONE = /^\+[1-9]\d{7,14}$/;

export const enquirySchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name.").max(120),
    email: z
      .string()
      .trim()
      .max(254)
      .refine((value) => value === "" || z.email().safeParse(value).success, {
        message: "Enter a valid email address.",
      }),
    phone: z
      .string()
      .trim()
      .transform((value) => value.replace(/[\s-]/g, ""))
      .refine((value) => value === "" || PHONE.test(value), {
        message:
          "Enter the number with its country code, for example +919876543210.",
      }),
    topic: z.enum(TOPICS),
    message: z
      .string()
      .trim()
      .min(10, "Tell us a little more: at least 10 characters.")
      .max(2000, "Keep the message under 2,000 characters."),
  })
  .refine((values) => values.email !== "" || values.phone !== "", {
    path: ["email"],
    message: "Give an email address or a phone number so we can reply.",
  });

export type EnquiryValues = z.input<typeof enquirySchema>;
export type EnquiryOutput = z.output<typeof enquirySchema>;

/** The request body: empty contact fields are left out. */
export function toEnquiryBody(
  values: EnquiryOutput,
): Schemas["CreateEnquiryDto"] {
  return {
    name: values.name,
    topic: values.topic,
    message: values.message,
    ...(values.email ? { email: values.email } : {}),
    ...(values.phone ? { phone: values.phone } : {}),
  };
}
