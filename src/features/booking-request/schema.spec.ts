import { describe, expect, it } from "vitest";
import { requestSchema } from "./schema";

describe("requestSchema", () => {
  const schema = requestSchema(2);
  it("needs the lead passenger", () => {
    const result = schema.safeParse({ passengerIds: [], specialRequests: "" });
    expect(result.error?.issues[0].message).toBe(
      "Choose at least the lead passenger.",
    );
  });
  it("allows no more passengers than the search was for", () => {
    const result = schema.safeParse({
      passengerIds: ["a", "b", "c"],
      specialRequests: "",
    });
    expect(result.error?.issues[0].message).toMatch(/for 2 passengers/);
  });
  it("trims special requests and caps them at the API's 1,000 characters", () => {
    expect(
      schema.parse({ passengerIds: ["a"], specialRequests: "  bags  " })
        .specialRequests,
    ).toBe("bags");
    expect(
      schema.safeParse({
        passengerIds: ["a"],
        specialRequests: "x".repeat(1001),
      }).success,
    ).toBe(false);
  });
});
