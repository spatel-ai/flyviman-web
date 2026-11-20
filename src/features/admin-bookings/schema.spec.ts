import { describe, expect, it } from "vitest";
import { decideSchema, noteSchema, overrideSchema } from "./schema";

describe("overrideSchema", () => {
  it("needs a status and a reason of 3 to 500 characters", () => {
    expect(
      overrideSchema.safeParse({ status: "", reason: "ok ok" }).success,
    ).toBe(false);
    expect(
      overrideSchema.safeParse({ status: "CONFIRMED", reason: "  a " }).success,
    ).toBe(false);
    expect(
      overrideSchema.safeParse({ status: "CONFIRMED", reason: "x".repeat(501) })
        .success,
    ).toBe(false);
    const ok = overrideSchema.safeParse({
      status: "CONFIRMED",
      reason: "  Paid by wire  ",
    });
    expect(ok.success && ok.data.reason).toBe("Paid by wire");
  });
});

describe("noteSchema and decideSchema", () => {
  it("refuse blank text and text over the API's limits", () => {
    expect(noteSchema.safeParse({ note: "   " }).success).toBe(false);
    expect(noteSchema.safeParse({ note: "x".repeat(2001) }).success).toBe(
      false,
    );
    expect(noteSchema.safeParse({ note: "Called the customer" }).success).toBe(
      true,
    );
    expect(decideSchema.safeParse({ note: "" }).success).toBe(false);
    expect(decideSchema.safeParse({ note: "x".repeat(1001) }).success).toBe(
      false,
    );
    expect(
      decideSchema.safeParse({ note: "Approved, see your email" }).success,
    ).toBe(true);
  });
});
