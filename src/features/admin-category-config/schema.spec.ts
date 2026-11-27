import { describe, expect, it } from "vitest";
import {
  bookingModeLabel,
  bookingModeOptions,
  categoryConfigSchema,
  changeBody,
  depositText,
  formDefaults,
  isDisabling,
  type CategoryConfig,
} from "./schema";

const row: CategoryConfig = {
  id: "cfg-1",
  category: "PRIVATE_CHARTER",
  region: "IN",
  isEnabled: true,
  bookingMode: "REQUEST",
  paymentModel: "B_OPERATOR_CONFIRMED",
  depositPercent: 25,
  updatedAt: "2026-11-21T10:00:00.000Z",
};

function parse(overrides: Record<string, unknown> = {}) {
  return categoryConfigSchema.safeParse({
    ...formDefaults(row),
    reason: "Season change",
    ...overrides,
  });
}

describe("categoryConfigSchema", () => {
  it("accepts the row's own values with a reason", () => {
    expect(parse().success).toBe(true);
  });

  it.each(["0", "101", "12.5", "", "ten"])(
    "refuses deposit %j (the API takes whole 1 to 100)",
    (depositPercent) => {
      expect(parse({ depositPercent }).success).toBe(false);
    },
  );

  it("accepts the deposit bounds", () => {
    expect(parse({ depositPercent: "1" }).success).toBe(true);
    expect(parse({ depositPercent: "100" }).success).toBe(true);
  });

  it("requires a reason of 3 to 500 characters", () => {
    expect(parse({ reason: "  ok " }).success).toBe(false);
    expect(parse({ reason: "x".repeat(501) }).success).toBe(false);
  });
});

describe("changeBody", () => {
  it("sends only what changed, with updatedAt and the reason", () => {
    const values = parse({ isEnabled: false, depositPercent: "30" });
    expect(values.success && changeBody(row, values.data)).toEqual({
      expectedUpdatedAt: row.updatedAt,
      reason: "Season change",
      isEnabled: false,
      depositPercent: 30,
    });
  });

  it("is null when nothing changed", () => {
    const values = parse();
    expect(values.success && changeBody(row, values.data)).toBeNull();
  });
});

describe("isDisabling", () => {
  it("is true only when an offered category is switched off", () => {
    const off = parse({ isEnabled: false });
    const on = parse({ isEnabled: true });
    expect(off.success && isDisabling(row, off.data)).toBe(true);
    expect(on.success && isDisabling(row, on.data)).toBe(false);
    expect(
      on.success && isDisabling({ ...row, isEnabled: false }, on.data),
    ).toBe(false);
  });
});

describe("options and labels", () => {
  it("never offers INSTANT for air ambulance (rule 7)", () => {
    expect(bookingModeOptions("AIR_AMBULANCE").map((o) => o.value)).toEqual([
      "REQUEST",
    ]);
    expect(bookingModeOptions("HELICOPTER").map((o) => o.value)).toContain(
      "INSTANT",
    );
  });

  it("shows an unknown value as it is and starts the form empty for it", () => {
    expect(bookingModeLabel("LATER")).toBe("LATER");
    expect(
      formDefaults({
        ...row,
        bookingMode: "LATER" as CategoryConfig["bookingMode"],
      }).bookingMode,
    ).toBe("");
  });
});

describe("depositText", () => {
  it("shows a percentage only under model C", () => {
    expect(depositText("C_DEPOSIT", 25)).toBe("25%");
    expect(depositText("A_INSTANT", 25)).toBe("Not used");
    expect(depositText("B_OPERATOR_CONFIRMED", 25)).toBe("Not used");
  });
});
