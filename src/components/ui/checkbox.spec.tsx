import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("is named by its label and toggles from the label and the keyboard", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Checkbox
        label="I accept the cancellation terms"
        onCheckedChange={onCheckedChange}
      />,
    );

    const checkbox = screen.getByRole("checkbox", {
      name: "I accept the cancellation terms",
    });
    expect(checkbox).not.toBeChecked();

    await user.click(screen.getByText("I accept the cancellation terms"));
    expect(checkbox).toBeChecked();
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);

    await user.keyboard(" ");
    expect(checkbox).not.toBeChecked();
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
  });

  it("follows a controlled checked value", () => {
    render(<Checkbox label="Remember me" checked onCheckedChange={() => {}} />);

    expect(screen.getByRole("checkbox", { name: "Remember me" })).toBeChecked();
  });

  it("ties a hint to the control without marking it invalid", () => {
    render(<Checkbox label="Send updates" hint="By email only." />);

    const checkbox = screen.getByRole("checkbox", { name: "Send updates" });
    expect(checkbox).toHaveAccessibleDescription("By email only.");
    expect(checkbox).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("announces an error and ties it to the control", () => {
    render(
      <Checkbox
        label="I accept the terms"
        hint="Required to continue."
        error="Accept the terms to continue."
      />,
    );

    const checkbox = screen.getByRole("checkbox", {
      name: "I accept the terms",
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Accept the terms to continue.",
    );
    expect(checkbox).toHaveAttribute("aria-invalid", "true");
    expect(checkbox).toHaveAccessibleDescription(
      "Accept the terms to continue.",
    );
    expect(screen.queryByText("Required to continue.")).not.toBeInTheDocument();
  });

  it("submits its name with a form when checked", () => {
    render(
      <form data-testid="form">
        <Checkbox label="Accept" name="accept" defaultChecked />
      </form>,
    );

    const data = new FormData(screen.getByTestId<HTMLFormElement>("form"));
    expect(data.get("accept")).toBe("on");
  });
});
