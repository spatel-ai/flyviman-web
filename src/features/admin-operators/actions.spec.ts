import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import type { OperatorStatus, Role } from "@/lib/api/types";
import {
  actionErrorMessage,
  approvalBlocker,
  availableActions,
  canReadRates,
  canReview,
  isStale,
} from "./actions";

describe("availableActions", () => {
  it.each<[OperatorStatus, string[]]>([
    ["DRAFT", []],
    ["PENDING_REVIEW", ["approve", "reject"]],
    ["APPROVED", ["suspend"]],
    ["REJECTED", []],
    ["SUSPENDED", ["reinstate"]],
  ])("for a reviewer, %s allows %j", (status, actions) => {
    expect(availableActions(status, "OPS")).toEqual(actions);
    expect(availableActions(status, "SUPER_ADMIN")).toEqual(actions);
  });

  it.each<Role | undefined>([
    "FINANCE_ADMIN",
    "CUSTOMER",
    "OPERATOR_ADMIN",
    "OPERATOR_STAFF",
    undefined,
  ])("offers nothing to %s", (role) => {
    expect(availableActions("PENDING_REVIEW", role)).toEqual([]);
    expect(availableActions("APPROVED", role)).toEqual([]);
    expect(availableActions("SUSPENDED", role)).toEqual([]);
  });

  it("offers nothing for a status it does not know", () => {
    expect(availableActions("ARCHIVED" as OperatorStatus, "OPS")).toEqual([]);
  });
});

describe("canReview", () => {
  it("is true for operations and super administrators only", () => {
    expect(canReview("OPS")).toBe(true);
    expect(canReview("SUPER_ADMIN")).toBe(true);
    expect(canReview("FINANCE_ADMIN")).toBe(false);
    expect(canReview(undefined)).toBe(false);
  });
});

describe("actionErrorMessage", () => {
  it("switches on the code, not the API's message", () => {
    expect(
      actionErrorMessage(
        new ApiError(422, "OPERATOR_DOCUMENTS_UNVERIFIED", "anything"),
      ),
    ).toBe("Verify the required documents first");
    expect(
      actionErrorMessage(
        new ApiError(409, "OPERATOR_INVALID_TRANSITION", "anything"),
      ),
    ).toMatch(/Someone else has already acted/);
    expect(actionErrorMessage(new ApiError(403, "FORBIDDEN", "x"))).toBe(
      "Your role cannot do this.",
    );
  });

  it("falls back to a safe message", () => {
    expect(actionErrorMessage(new Error("boom"))).toBe(
      "Something went wrong. Please try again.",
    );
  });
});

describe("isStale", () => {
  it("is true when someone else acted first or the record is gone", () => {
    expect(isStale(new ApiError(409, "OPERATOR_INVALID_TRANSITION", "x"))).toBe(
      true,
    );
    expect(isStale(new ApiError(404, "NOT_FOUND", "x"))).toBe(true);
    expect(isStale(new ApiError(403, "FORBIDDEN", "x"))).toBe(false);
  });
});

describe("canReadRates", () => {
  it("is true for finance and super administrators only", () => {
    expect(canReadRates("FINANCE_ADMIN")).toBe(true);
    expect(canReadRates("SUPER_ADMIN")).toBe(true);
    expect(canReadRates("OPS")).toBe(false);
    expect(canReadRates(undefined)).toBe(false);
  });
});

describe("approvalBlocker", () => {
  const doc = (type: string, verificationStatus: string) => ({
    type,
    verificationStatus,
  });

  it("names the documents still to verify", () => {
    expect(approvalBlocker([])).toBe(
      "Verify the air operator certificate and the insurance certificate before approving.",
    );
    expect(
      approvalBlocker([doc("AOC", "VERIFIED"), doc("INSURANCE", "PENDING")]),
    ).toBe("Verify the insurance certificate before approving.");
  });

  it("does not count a rejected copy or another document type", () => {
    expect(
      approvalBlocker([
        doc("AOC", "REJECTED"),
        doc("INSURANCE", "VERIFIED"),
        doc("OTHER", "VERIFIED"),
      ]),
    ).toBe("Verify the air operator certificate before approving.");
  });

  it("allows approval once both are verified", () => {
    expect(
      approvalBlocker([doc("AOC", "VERIFIED"), doc("INSURANCE", "VERIFIED")]),
    ).toBeNull();
  });
});
