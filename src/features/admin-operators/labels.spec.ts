import { describe, expect, it } from "vitest";
import {
  documentTypeLabel,
  formatAddress,
  formatDay,
  missingLabel,
  serviceLabel,
} from "./labels";

describe("labels", () => {
  it("names document types and passes unknown ones through", () => {
    expect(documentTypeLabel("AOC")).toBe("Air operator certificate");
    expect(documentTypeLabel("INSURANCE")).toBe("Insurance certificate");
    expect(documentTypeLabel("REGISTRATION")).toBe("Company registration");
    expect(documentTypeLabel("OTHER")).toBe("Other");
    expect(documentTypeLabel("NEW_TYPE")).toBe("NEW_TYPE");
  });

  it("names services", () => {
    expect(serviceLabel("PRIVATE_CHARTER")).toBe("Private charter");
    expect(serviceLabel("toString")).toBe("toString");
  });

  it("words what is still missing", () => {
    expect(missingLabel("registrationNumber")).toBe("Registration number");
    expect(missingLabel("document:AOC")).toBe("Air operator certificate");
    expect(missingLabel("somethingNew")).toBe("somethingNew");
  });

  it("joins an address on one line and skips an empty second line", () => {
    expect(
      formatAddress({
        line1: "1 Marine Drive",
        line2: null,
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        country: "IN",
      }),
    ).toBe("1 Marine Drive, Mumbai, Maharashtra 400001, IN");
    expect(formatAddress(null)).toBeNull();
  });

  it("formats a date without shifting the day", () => {
    expect(formatDay("2027-01-31")).toBe("31 Jan 2027");
    expect(formatDay("2027-01-31T00:00:00.000Z")).toBe("31 Jan 2027");
    expect(formatDay("not a date")).toBe("not a date");
  });
});
