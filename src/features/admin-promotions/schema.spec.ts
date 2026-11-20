import { describe, expect, it } from "vitest";
import {
  describeOffer,
  describeScope,
  describeUses,
  promotionSchema,
  statusLabel,
  toPromotionBody,
  type Promotion,
  type PromotionFormInput,
} from "./schema";

const INPUT: PromotionFormInput = {
  code: " winter-10 ",
  name: "Winter offer",
  kind: "PERCENT",
  value: "12.5",
  category: "ALL",
  originId: "",
  destinationId: "",
  startsOn: "2026-12-01",
  endsOn: "2026-12-31",
  maxUses: "",
  maxUsesPerCustomer: "1",
  reason: "Winter campaign",
};

function issues(input: Partial<PromotionFormInput>) {
  const result = promotionSchema.safeParse({ ...INPUT, ...input });
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [
          issue.path.join("."),
          issue.message,
        ]),
      );
}

describe("promotionSchema and toPromotionBody", () => {
  it("builds the API body: upper-case code, whole India days, caps", () => {
    const values = promotionSchema.parse(INPUT);
    expect(toPromotionBody(values)).toEqual({
      code: "WINTER-10",
      name: "Winter offer",
      kind: "PERCENT",
      percent: 12.5,
      currency: "INR",
      category: null,
      originId: null,
      destinationId: null,
      startsAt: "2026-11-30T18:30:00.000Z",
      endsAt: "2026-12-31T18:30:00.000Z",
      maxUses: null,
      maxUsesPerCustomer: 1,
      reason: "Winter campaign",
    });
  });

  it("sends a fixed amount in paise, and a route and category", () => {
    const values = promotionSchema.parse({
      ...INPUT,
      kind: "FIXED",
      value: "5,000",
      category: "HELICOPTER",
      originId: "a",
      destinationId: "b",
      maxUses: "100",
    });
    expect(toPromotionBody(values)).toMatchObject({
      kind: "FIXED",
      amountMinor: 500_000,
      category: "HELICOPTER",
      originId: "a",
      destinationId: "b",
      maxUses: 100,
    });
    expect(toPromotionBody(values)).not.toHaveProperty("percent");
  });

  it("keeps the API's limits", () => {
    expect(issues({ code: "A B" })).toHaveProperty("code");
    expect(issues({ code: "-AB" })).toHaveProperty("code");
    expect(issues({ value: "100.5" })).toHaveProperty("value");
    expect(issues({ value: "5.123" })).toHaveProperty("value");
    expect(issues({ value: "0" })).toHaveProperty("value");
    expect(issues({ kind: "FIXED", value: "0.5" })).toHaveProperty("value");
    expect(issues({ originId: "a" })).toHaveProperty("destinationId");
    expect(issues({ originId: "a", destinationId: "a" })).toHaveProperty(
      "destinationId",
    );
    expect(issues({ endsOn: "2026-11-30" })).toHaveProperty("endsOn");
    expect(issues({ maxUses: "0" })).toHaveProperty("maxUses");
    expect(issues({ maxUsesPerCustomer: "1.5" })).toHaveProperty(
      "maxUsesPerCustomer",
    );
    expect(issues({ reason: "ab" })).toHaveProperty("reason");
    expect(issues({})).toEqual({});
  });
});

const PROMOTION: Promotion = {
  id: "p",
  code: "WINTER10",
  name: "Winter offer",
  kind: "PERCENT",
  percent: 10,
  amountMinor: null,
  currency: "INR",
  category: null,
  originId: null,
  originName: null,
  destinationId: null,
  destinationName: null,
  startsAt: "2026-12-01T00:00:00.000Z",
  endsAt: "2027-01-01T00:00:00.000Z",
  maxUses: null,
  maxUsesPerCustomer: null,
  uses: 1,
  status: "ACTIVE",
  endedAt: null,
  endable: true,
  createdAt: "2026-11-20T00:00:00.000Z",
};

describe("describing a promotion", () => {
  it("names the offer, scope and uses", () => {
    expect(describeOffer(PROMOTION)).toBe("10% off");
    expect(
      describeOffer({
        ...PROMOTION,
        kind: "FIXED",
        percent: null,
        amountMinor: 50_000,
      }),
    ).toMatch(/500 off$/);
    expect(describeScope(PROMOTION)).toBe("Charter and helicopter");
    expect(
      describeScope({
        ...PROMOTION,
        category: "PRIVATE_CHARTER",
        originId: "a",
        originName: "Mumbai",
        destinationId: "b",
        destinationName: "Goa",
      }),
    ).toBe("Charter, Mumbai ↔ Goa");
    expect(describeUses(PROMOTION)).toBe("1 use");
    expect(
      describeUses({ ...PROMOTION, maxUses: 5, maxUsesPerCustomer: 1 }),
    ).toBe("1 of 5 uses, 1 per customer");
  });

  it("shows an unknown status as it is", () => {
    expect(statusLabel("ACTIVE")).toBe("Active");
    expect(statusLabel("PAUSED")).toBe("PAUSED");
  });
});
