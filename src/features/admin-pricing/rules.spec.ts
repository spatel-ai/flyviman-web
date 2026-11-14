import { describe, expect, it } from "vitest";
import { appliesTo, configToDraft, describeConfig, RULE_TYPES } from "./rules";
import { ruleSchema } from "./schema";

describe("describeConfig", () => {
  it("says what a rule does in a few words", () => {
    expect(describeConfig("COMMISSION", { percent: 10, mode: "ADD_ON" })).toBe(
      "10%, added on top",
    );
    expect(describeConfig("COMMISSION", { percent: 8, mode: "DEDUCTED" })).toBe(
      "8%, deducted from the operator",
    );
    expect(describeConfig("TAX", { name: "GST", percent: 18 })).toBe("GST 18%");
    expect(describeConfig("MIN_CHARGE", { amountMinor: 5_000_000 })).toBe(
      "₹50,000",
    );
    expect(
      describeConfig("POSITIONING", { rateFactor: 0.8, freeWithinKm: 50 }),
    ).toBe("0.8 × hourly rate, free within 50 km");
  });
});

describe("appliesTo", () => {
  it("names all aircraft or the category", () => {
    expect(appliesTo({ scope: "PLATFORM", scopeRef: null })).toBe(
      "All aircraft",
    );
    expect(appliesTo({ scope: "CATEGORY", scopeRef: "TURBOPROP" })).toBe(
      "Turboprop",
    );
  });
});

describe("configToDraft", () => {
  it("shows amounts in rupees and defaults a choice", () => {
    expect(configToDraft("MIN_CHARGE", { amountMinor: 150_050 })).toEqual({
      amountMinor: "1500.5",
    });
    expect(configToDraft("COMMISSION")).toEqual({
      percent: "",
      mode: "ADD_ON",
    });
  });
});

describe("ruleSchema", () => {
  it("turns typed values into the settings the API takes", () => {
    const result = ruleSchema("MIN_CHARGE").safeParse({
      config: { amountMinor: "1,500.50" },
      reason: " Floor for short hops ",
    });
    expect(result.success && result.data).toEqual({
      config: { amountMinor: 150_050 },
      reason: "Floor for short hops",
    });
  });

  it("keeps values inside the API's bounds", () => {
    const tooHigh = ruleSchema("COMMISSION").safeParse({
      config: { percent: "60", mode: "ADD_ON" },
      reason: "Testing",
    });
    expect(tooHigh.success).toBe(false);
    const tooPrecise = ruleSchema("ROUTING_FACTOR").safeParse({
      config: { factor: "1.0855" },
      reason: "Testing",
    });
    expect(tooPrecise.success).toBe(false);
    const fine = ruleSchema("ROUTING_FACTOR").safeParse({
      config: { factor: "1.085" },
      reason: "Testing",
    });
    expect(fine.success && fine.data.config).toEqual({ factor: 1.085 });
  });

  it("refuses an amount that is not rupees", () => {
    const result = ruleSchema("MIN_CHARGE").safeParse({
      config: { amountMinor: "12.345" },
      reason: "Testing",
    });
    expect(result.success).toBe(false);
  });

  it("wants a reason", () => {
    const result = ruleSchema("TAX").safeParse({
      config: { name: "GST", percent: "18" },
      reason: " a ",
    });
    expect(result.success).toBe(false);
  });

  it("has a form for every rule type", () => {
    for (const type of RULE_TYPES) {
      expect(() => ruleSchema(type)).not.toThrow();
    }
  });
});
