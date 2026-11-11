import { describe, expect, it } from "vitest";
import { aircraftDocumentLabel, formatDay, missingLabel } from "./aircraft";

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

  it("formats a date-only value without shifting the day", () => {
    expect(formatDay("2030-12-31")).toBe("31 Dec 2030");
    expect(formatDay("2030-12-31T00:00:00.000Z")).toBe("31 Dec 2030");
  });
});
