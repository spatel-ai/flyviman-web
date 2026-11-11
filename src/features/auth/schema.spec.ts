import { describe, expect, it } from "vitest";
import {
  codeSchema,
  operatorRegisterSchema,
  phoneSchema,
  registerEmailSchema,
  resetSchema,
} from "./schema";

const PASSWORD = "correct horse battery";

describe("auth schemas", () => {
  it("accepts a phone number with spaces or hyphens and normalises it", () => {
    expect(phoneSchema.parse({ phone: " +91 98765-43210 " })).toEqual({
      phone: "+919876543210",
    });
  });

  it.each(["9876543210", "+0123456789", "+91", "phone"])(
    "rejects the phone number %j",
    (phone) => {
      expect(phoneSchema.safeParse({ phone }).success).toBe(false);
    },
  );

  it("requires the terms to be accepted and a long enough password", () => {
    const base = {
      firstName: "Asha",
      lastName: "Rao",
      email: "asha@example.com",
      password: PASSWORD,
      acceptTerms: true,
    };
    expect(registerEmailSchema.safeParse(base).success).toBe(true);

    const noTerms = registerEmailSchema.safeParse({
      ...base,
      acceptTerms: false,
    });
    expect(noTerms.error?.issues[0].path).toEqual(["acceptTerms"]);

    const short = registerEmailSchema.safeParse({ ...base, password: "short" });
    expect(short.error?.issues[0].path).toEqual(["password"]);
  });

  it("accepts only six digits as a code", () => {
    expect(codeSchema.safeParse({ code: " 123456 " }).success).toBe(true);
    for (const code of ["12345", "1234567", "12345a", ""]) {
      expect(codeSchema.safeParse({ code }).success).toBe(false);
    }
  });

  it("requires the new password to be typed the same twice", () => {
    expect(
      resetSchema.safeParse({ password: PASSWORD, confirm: PASSWORD }).success,
    ).toBe(true);
    const mismatch = resetSchema.safeParse({
      password: PASSWORD,
      confirm: "something else!",
    });
    expect(mismatch.error?.issues[0].path).toEqual(["confirm"]);
  });

  it("lets an operator leave the phone number empty", () => {
    const base = {
      legalName: "Skyline Aviation Private Limited",
      contactName: "Meera Nair",
      email: "meera@example.com",
      phone: "",
      password: PASSWORD,
      acceptTerms: true,
    };
    expect(operatorRegisterSchema.safeParse(base).success).toBe(true);
    expect(
      operatorRegisterSchema.safeParse({ ...base, phone: "12345" }).success,
    ).toBe(false);
  });
});
