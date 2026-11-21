import { describe, expect, it } from "vitest";
import { serviceLabel } from "./labels";

describe("serviceLabel", () => {
  it("names services and passes unknown ones through", () => {
    expect(serviceLabel("PRIVATE_CHARTER")).toBe("Private charter");
    expect(serviceLabel("toString")).toBe("toString");
  });
});
