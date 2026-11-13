import { describe, expect, it } from "vitest";
import { rowActions } from "./team-list";

describe("rowActions", () => {
  it("offers resend only while the organisation is approved", () => {
    expect(rowActions({ status: "INVITED", suspendedBy: null }, true)).toEqual([
      "resend",
      "remove",
    ]);
    expect(rowActions({ status: "INVITED", suspendedBy: null }, false)).toEqual(
      ["remove"],
    );
  });

  it("never offers to lift a suspension Flyviman made", () => {
    expect(
      rowActions({ status: "SUSPENDED", suspendedBy: "OPERATOR" }, true),
    ).toEqual(["reinstate", "remove"]);
    expect(
      rowActions({ status: "SUSPENDED", suspendedBy: "PLATFORM" }, true),
    ).toEqual(["remove"]);
  });

  it("offers suspend for an active member", () => {
    expect(rowActions({ status: "ACTIVE", suspendedBy: null }, true)).toEqual([
      "suspend",
      "remove",
    ]);
  });
});
