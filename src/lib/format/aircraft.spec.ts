import { describe, expect, it } from "vitest";
import {
  aircraftDocumentLabel,
  missingLabel,
  searchBlockerLabel,
} from "./aircraft";

describe("aircraft labels", () => {
  it("names documents and profile gaps", () => {
    expect(aircraftDocumentLabel("AIRWORTHINESS")).toBe(
      "Certificate of airworthiness",
    );
    expect(missingLabel("document:INSURANCE")).toBe(
      "Insurance (current, not expired)",
    );
    expect(missingLabel("homeBaseId")).toBe("Home base");
    expect(missingLabel("somethingNew")).toBe("somethingNew");
  });
});

describe("searchBlockerLabel", () => {
  it("says why an aircraft is not offered, in words", () => {
    expect(searchBlockerLabel("document:INSURANCE")).toBe(
      "Insurance is missing, not accepted or has expired",
    );
    expect(searchBlockerLabel("notAvailable")).toBe(
      "The aircraft is marked unavailable or in maintenance",
    );
    expect(searchBlockerLabel("somethingNew")).toBe("somethingNew");
  });
});
