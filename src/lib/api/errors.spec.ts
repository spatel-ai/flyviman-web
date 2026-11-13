import { describe, expect, it } from "vitest";
import { ApiError, isNotFoundError } from "./errors";

describe("isNotFoundError", () => {
  it("is true when the record does not exist or the address is not an id", () => {
    expect(isNotFoundError(new ApiError(404, "NOT_FOUND", "x"))).toBe(true);
    expect(isNotFoundError(new ApiError(400, "VALIDATION_ERROR", "x"))).toBe(
      true,
    );
  });

  it("is false for failures that a retry could fix, or that are not the API's", () => {
    expect(isNotFoundError(new ApiError(500, "INTERNAL", "x"))).toBe(false);
    expect(isNotFoundError(new ApiError(403, "FORBIDDEN", "x"))).toBe(false);
    expect(isNotFoundError(new Error("offline"))).toBe(false);
    expect(isNotFoundError(undefined)).toBe(false);
  });
});
