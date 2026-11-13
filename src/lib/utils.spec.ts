import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("keeps a text colour next to one of our type sizes", () => {
    expect(cn("text-accent-foreground", "text-body-lg")).toBe(
      "text-accent-foreground text-body-lg",
    );
    expect(cn("text-muted", "text-overline")).toBe("text-muted text-overline");
  });

  it("lets a later type size replace an earlier one", () => {
    expect(cn("text-body", "text-h2")).toBe("text-h2");
  });

  it("lets a later colour replace an earlier one", () => {
    expect(cn("text-muted", "text-foreground")).toBe("text-foreground");
  });
});
