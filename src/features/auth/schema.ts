import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 12;

const email = z.email("Enter a valid email address.").max(254);
const name = (label: string) =>
  z.string().trim().min(1, `Enter your ${label}.`).max(100);
const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(200);
/** E.164, as the API expects: +919876543210. */
export const phone = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ""))
  .pipe(
    z
      .string()
      .regex(
        /^\+[1-9]\d{7,14}$/,
        "Enter the number with its country code, for example +919876543210.",
      ),
  );
const acceptTerms = z.boolean().refine((value) => value, {
  message: "Accept the terms and the privacy policy to continue.",
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const phoneSchema = z.object({ phone });
export type PhoneValues = z.input<typeof phoneSchema>;

export const registerEmailSchema = z.object({
  firstName: name("first name"),
  lastName: name("last name"),
  email,
  password: newPassword,
  acceptTerms,
});
export type RegisterEmailValues = z.input<typeof registerEmailSchema>;

export const registerPhoneSchema = z.object({
  firstName: name("first name"),
  lastName: name("last name"),
  phone,
  acceptTerms,
});
export type RegisterPhoneValues = z.input<typeof registerPhoneSchema>;

export const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the six-digit code."),
});
export type CodeValues = z.infer<typeof codeSchema>;

export const forgotSchema = z.object({ email });
export type ForgotValues = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    message: "The two passwords do not match.",
  });
export type ResetValues = z.infer<typeof resetSchema>;

export const operatorRegisterSchema = z.object({
  legalName: z
    .string()
    .trim()
    .min(2, "Enter the company's registered name.")
    .max(200),
  contactName: z.string().trim().min(2, "Enter your name.").max(200),
  email,
  phone: z.union([z.literal(""), phone]),
  password: newPassword,
  acceptTerms,
});
export type OperatorRegisterValues = z.input<typeof operatorRegisterSchema>;
