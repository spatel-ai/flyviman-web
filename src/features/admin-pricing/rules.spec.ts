import { describe, expect, it } from "vitest";
import {
  canEnd,
  canManage,
  configForApi,
  configToDraft,
  describeConfig,
  RULE_TYPES,
} from "./rules";
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

describe("canManage", () => {
  it("offers Change only for editable rules this screen has a form for", () => {
    expect(canManage({ type: "COMMISSION", editable: true })).toBe(true);
    expect(canManage({ type: "COMMISSION", editable: false })).toBe(false);
    expect(canManage({ type: "MARKUP", editable: true })).toBe(true);
    expect(canManage({ type: "DISCOUNT", editable: false })).toBe(false);
    expect(canManage({ type: "constructor", editable: true })).toBe(false);
    expect(canManage({ type: "MATCHING_LIMITS", editable: true })).toBe(false);
  });
});

describe("the 4c platform rules", () => {
  it("describes markup, service fee, discount and the per-day minimum", () => {
    expect(describeConfig("MARKUP", { percent: 5 })).toBe(
      "5% of the operator's price",
    );
    expect(describeConfig("SERVICE_FEE", { amountMinor: 250_000 })).toBe(
      "₹2,500 per trip",
    );
    expect(describeConfig("DISCOUNT", { name: "Winter", percent: 10 })).toBe(
      "Winter 10% off",
    );
    expect(describeConfig("MIN_BILLABLE_HOURS", { hours: 2, per: "DAY" })).toBe(
      "2 h per day",
    );
    expect(describeConfig("MIN_BILLABLE_HOURS", { hours: 2 })).toBe("2 h");
  });

  it("turns typed values into the settings the API takes", () => {
    const fee = ruleSchema("SERVICE_FEE").safeParse({
      config: { amountMinor: "2,500" },
      reason: "Launch fee",
    });
    expect(fee.success && fee.data.config).toEqual({ amountMinor: 250_000 });
    const discount = ruleSchema("DISCOUNT").safeParse({
      config: { name: " Winter offer ", percent: "7.5" },
      reason: "Season",
    });
    expect(discount.success && discount.data.config).toEqual({
      name: "Winter offer",
      percent: 7.5,
    });
  });

  it("keeps them inside the API's bounds", () => {
    const refused = (
      type: "MARKUP" | "SERVICE_FEE" | "DISCOUNT",
      config: object,
    ) => !ruleSchema(type).safeParse({ config, reason: "Testing" }).success;
    expect(refused("MARKUP", { percent: "51" })).toBe(true);
    expect(refused("MARKUP", { percent: "5.555" })).toBe(true);
    expect(refused("SERVICE_FEE", { amountMinor: "10,00,00,001" })).toBe(true);
    expect(refused("DISCOUNT", { name: "A", percent: "10" })).toBe(true);
    expect(refused("DISCOUNT", { name: "Winter", percent: "50" })).toBe(false);
  });

  it("leaves per flight out of the minimum's settings", () => {
    expect(
      configForApi("MIN_BILLABLE_HOURS", { hours: 2, per: "LEG" }),
    ).toEqual({ hours: 2 });
    expect(
      configForApi("MIN_BILLABLE_HOURS", { hours: 2, per: "DAY" }),
    ).toEqual({ hours: 2, per: "DAY" });
    expect(configToDraft("MIN_BILLABLE_HOURS", { hours: 2 }).per).toBe("LEG");
  });

  it("offers End for category rules and the optional platform rules only", () => {
    const rule = (type: string, scope: string) => ({
      type,
      scope,
      editable: true,
    });
    expect(canEnd(rule("COMMISSION", "CATEGORY") as never)).toBe(true);
    expect(canEnd(rule("COMMISSION", "PLATFORM") as never)).toBe(false);
    expect(canEnd(rule("MARKUP", "PLATFORM") as never)).toBe(true);
    expect(canEnd(rule("SERVICE_FEE", "PLATFORM") as never)).toBe(true);
    expect(canEnd(rule("DISCOUNT", "PLATFORM") as never)).toBe(true);
    expect(canEnd(rule("TAX", "PLATFORM") as never)).toBe(false);
    expect(
      canEnd({ type: "MARKUP", scope: "PLATFORM", editable: false } as never),
    ).toBe(false);
  });
});
