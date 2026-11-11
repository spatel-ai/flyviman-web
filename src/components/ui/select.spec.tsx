import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./select";

const OPTIONS = [
  { value: "charter", label: "Private charter" },
  { value: "helicopter", label: "Helicopter" },
  { value: "empty-leg", label: "Empty leg" },
];

describe("Select", () => {
  it("is named by its label and shows the placeholder", () => {
    render(
      <Select label="Service" options={OPTIONS} placeholder="Choose one" />,
    );

    const trigger = screen.getByRole("combobox", { name: "Service" });
    expect(trigger).toHaveTextContent("Choose one");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("shows the label of a controlled value", () => {
    render(
      <Select
        label="Service"
        options={OPTIONS}
        value="helicopter"
        onValueChange={() => {}}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Service" })).toHaveTextContent(
      "Helicopter",
    );
  });

  it("opens, moves with the arrow keys and selects with Enter", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Select
        label="Service"
        options={OPTIONS}
        onValueChange={onValueChange}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: "Service" });
    await user.tab();
    expect(trigger).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);

    expect(
      await screen.findByRole("option", { name: "Private charter" }),
    ).toHaveFocus();

    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(screen.getByRole("option", { name: "Empty leg" })).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("option", { name: "Helicopter" })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("helicopter");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent("Helicopter");
  });

  it("closes on Escape without changing the value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Select
        label="Service"
        options={OPTIONS}
        onValueChange={onValueChange}
      />,
    );

    await user.tab();
    await user.keyboard("{Enter}");
    await screen.findByRole("listbox");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("ties a hint to the control without marking it invalid", () => {
    render(
      <Select
        label="Service"
        options={OPTIONS}
        hint="You can change it later."
      />,
    );

    const trigger = screen.getByRole("combobox", { name: "Service" });
    expect(trigger).toHaveAccessibleDescription("You can change it later.");
    expect(trigger).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("announces an error and ties it to the control", () => {
    render(
      <Select
        label="Service"
        options={OPTIONS}
        hint="You can change it later."
        error="Choose a service."
      />,
    );

    const trigger = screen.getByRole("combobox", { name: "Service" });
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a service.");
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger).toHaveAccessibleDescription("Choose a service.");
  });

  it("submits its name and value with a form", () => {
    render(
      <form data-testid="form">
        <Select
          label="Service"
          options={OPTIONS}
          name="service"
          defaultValue="charter"
        />
      </form>,
    );

    const data = new FormData(screen.getByTestId<HTMLFormElement>("form"));
    expect(data.get("service")).toBe("charter");
  });
});
