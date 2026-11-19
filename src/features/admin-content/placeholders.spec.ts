import { describe, expect, it } from "vitest";
import { placeholderProblem } from "./placeholders";

describe("placeholderProblem", () => {
  it("accepts wording that keeps every placeholder", () => {
    expect(
      placeholderProblem(["code"], "", "Your code is {{ code }}"),
    ).toBeNull();
  });

  it("names a placeholder that was dropped", () => {
    expect(placeholderProblem(["code", "minutes"], "", "{{code}}")).toBe(
      "Keep the placeholders {{minutes}}.",
    );
  });

  it("refuses a placeholder that is never filled in", () => {
    expect(placeholderProblem(["code"], "{{who}}", "{{code}}")).toContain(
      "{{who}}",
    );
  });

  it("counts a placeholder used only in the subject", () => {
    expect(placeholderProblem(["name"], "Hi {{name}}", "Welcome")).toBeNull();
  });
});
