import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button variants", () => {
  it("secondary has a visible edge, not only a fill", () => {
    render(<Button variant="secondary">Change</Button>);
    expect(screen.getByRole("button")).toHaveClass("border", "border-border");
  });

  it("danger is outlined in the danger tone for a destructive trigger", () => {
    render(<Button variant="danger">Suspend</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("text-danger", "border-danger/40");
    expect(button).not.toHaveClass("bg-danger");
  });

  it("destructive stays the filled confirming action", () => {
    render(<Button variant="destructive">Suspend operator</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-danger");
  });
});
