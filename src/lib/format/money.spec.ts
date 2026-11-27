import { describe, expect, it } from "vitest";
import {
  formatMoney,
  formatTypedRupees,
  hintWithTyped,
  MAX_MINOR,
  paiseToRupees,
  rupeesToPaise,
} from "./money";

describe("formatMoney", () => {
  it("shows two decimals for an exact amount, with Indian digit grouping", () => {
    expect(formatMoney(52179600, "INR")).toBe("₹5,21,796.00");
    expect(formatMoney(39251520, "INR")).toBe("₹3,92,515.20");
    expect(formatMoney(123456, "INR")).toBe("₹1,234.56");
    expect(formatMoney(0, "INR")).toBe("₹0.00");
  });

  it("drops .00 from a whole amount only when asked", () => {
    const drop = { dropZeroDecimals: true };
    expect(formatMoney(52179600, "INR", drop)).toBe("₹5,21,796");
    expect(formatMoney(0, "INR", drop)).toBe("₹0");
    expect(formatMoney(52179600, "INR", { dropZeroDecimals: false })).toBe(
      "₹5,21,796.00",
    );
  });

  it("keeps paise on a non-whole amount even when dropping", () => {
    expect(formatMoney(123456, "INR", { dropZeroDecimals: true })).toBe(
      "₹1,234.56",
    );
  });

  it("rejects fractional minor units", () => {
    expect(() => formatMoney(10.5, "INR")).toThrow(TypeError);
  });
});

describe("formatTypedRupees", () => {
  it("formats what a person typed, for a helper beside the field", () => {
    expect(formatTypedRupees("180000")).toBe("₹1,80,000.00");
    expect(formatTypedRupees("2,500.5")).toBe("₹2,500.50");
  });

  it("is null while empty or not an amount", () => {
    expect(formatTypedRupees("")).toBeNull();
    expect(formatTypedRupees("abc")).toBeNull();
    expect(formatTypedRupees("10,00,00,001")).toBeNull();
  });
});

describe("rupeesToPaise and paiseToRupees", () => {
  it("reads what people type, in rupees, as paise", () => {
    expect(rupeesToPaise("1,80,000")).toBe(18_000_000);
    expect(rupeesToPaise("₹ 2500.5")).toBe(250_050);
    expect(rupeesToPaise("2500.05")).toBe(250_005);
    expect(rupeesToPaise("  ")).toBeNull();
  });

  it("refuses what is not an amount", () => {
    expect(() => rupeesToPaise("abc")).toThrow();
    expect(() => rupeesToPaise("-5")).toThrow();
    expect(() => rupeesToPaise("1.234")).toThrow();
  });

  it("stops at ₹10 crore, the most any pricing input takes", () => {
    expect(rupeesToPaise("10,00,00,000")).toBe(MAX_MINOR);
    expect(() => rupeesToPaise("10,00,00,000.01")).toThrow();
    expect(() => rupeesToPaise("99999999999999999")).toThrow();
  });

  it("writes paise back as rupees for a form", () => {
    expect(paiseToRupees(18_000_000)).toBe("180000");
    expect(paiseToRupees(250_050)).toBe("2500.5");
    expect(paiseToRupees(250_005)).toBe("2500.05");
    expect(paiseToRupees(null)).toBe("");
  });
});

describe("hintWithTyped", () => {
  it("adds the formatted figure once something amount-like is typed", () => {
    expect(hintWithTyped("In rupees.", "280000")).toBe(
      "In rupees. Reads as ₹2,80,000.00.",
    );
    expect(hintWithTyped("In rupees.", "")).toBe("In rupees.");
    expect(hintWithTyped("In rupees.", undefined)).toBe("In rupees.");
  });
});
