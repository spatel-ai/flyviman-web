import { describe, expect, it } from "vitest";
import { answerSchema, cancelSchema, changeRequestSchema } from "./schema";

describe("trip form schemas", () => {
  it("refuse an empty or blank change request and answer", () => {
    expect(changeRequestSchema.safeParse({ details: "   " }).success).toBe(
      false,
    );
    expect(answerSchema.safeParse({ message: "" }).success).toBe(false);
  });
  it("trim what they accept", () => {
    expect(answerSchema.parse({ message: " Three bags " }).message).toBe(
      "Three bags",
    );
  });
  it("hold the API's limits", () => {
    expect(
      changeRequestSchema.safeParse({ details: "x".repeat(1001) }).success,
    ).toBe(false);
    expect(answerSchema.safeParse({ message: "x".repeat(1001) }).success).toBe(
      false,
    );
    expect(cancelSchema.safeParse({ reason: "x".repeat(501) }).success).toBe(
      false,
    );
  });
  it("let a cancellation go without a reason", () => {
    expect(cancelSchema.parse({ reason: "" }).reason).toBe("");
  });
});
