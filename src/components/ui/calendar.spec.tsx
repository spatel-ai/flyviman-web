import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Calendar, type CalendarProps } from "./calendar";

function Harness(props: Partial<CalendarProps>) {
  const [value, setValue] = useState(props.value ?? "");
  return (
    <Calendar
      today="2026-11-27"
      {...props}
      value={value}
      onChange={(day) => {
        setValue(day);
        props.onChange?.(day);
      }}
    />
  );
}

describe("Calendar", () => {
  it("shows the chosen day's month, Monday first, with today marked", () => {
    render(<Harness value="2026-11-16" />);
    const grid = screen.getByRole("grid", { name: "November 2026" });
    expect(
      screen.getAllByRole("columnheader").map((cell) => cell.textContent),
    ).toEqual(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);
    const chosen = screen.getByRole("button", { name: "Mon, 16 Nov 2026" });
    expect(chosen.closest("[role=gridcell]")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(chosen).toHaveAttribute("tabindex", "0");
    expect(
      screen.getByRole("button", { name: "Fri, 27 Nov 2026" }),
    ).toHaveAttribute("aria-current", "date");
    expect(grid).toBeInTheDocument();
  });

  it("dims days outside min and max, and refuses them", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Harness
        value="2026-11-16"
        min="2026-11-10"
        max="2026-11-20"
        onChange={onChange}
      />,
    );
    const early = screen.getByRole("button", { name: "Mon, 9 Nov 2026" });
    expect(early).toHaveAttribute("aria-disabled", "true");
    await user.click(early);
    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Sat, 21 Nov 2026" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("button", { name: "Previous month" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
    // Today (27 Nov) is after max.
    expect(screen.getByRole("button", { name: "Today" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Wed, 18 Nov 2026" }));
    expect(onChange).toHaveBeenCalledWith("2026-11-18");
  });

  it("moves by day, week, month and to the week's ends from the keyboard", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness value="2026-11-16" onChange={onChange} />);
    screen.getByRole("button", { name: "Mon, 16 Nov 2026" }).focus();

    await user.keyboard("{ArrowRight}");
    expect(
      screen.getByRole("button", { name: "Tue, 17 Nov 2026" }),
    ).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByRole("button", { name: "Tue, 24 Nov 2026" }),
    ).toHaveFocus();
    await user.keyboard("{End}");
    expect(
      screen.getByRole("button", { name: "Sun, 29 Nov 2026" }),
    ).toHaveFocus();
    await user.keyboard("{Home}");
    expect(
      screen.getByRole("button", { name: "Mon, 23 Nov 2026" }),
    ).toHaveFocus();
    await user.keyboard("{PageDown}");
    expect(
      screen.getByRole("grid", { name: "December 2026" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Wed, 23 Dec 2026" }),
    ).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}");
    expect(
      screen.getByRole("grid", { name: "November 2026" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Wed, 25 Nov 2026" }),
    ).toHaveFocus();
    // Only the focused day is a tab stop.
    expect(
      screen.getByRole("button", { name: "Mon, 16 Nov 2026" }),
    ).toHaveAttribute("tabindex", "-1");

    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("2026-11-25");
  });

  it("keeps keyboard moves inside min and max", async () => {
    const user = userEvent.setup();
    render(<Harness value="2026-11-11" min="2026-11-10" />);
    screen.getByRole("button", { name: "Wed, 11 Nov 2026" }).focus();
    await user.keyboard("{ArrowUp}");
    expect(
      screen.getByRole("button", { name: "Tue, 10 Nov 2026" }),
    ).toHaveFocus();
  });

  it("jumps decades through the month-and-year chooser", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.click(
      screen.getByRole("button", {
        name: "November 2026, choose month and year",
      }),
    );
    const years = screen.getByRole("group", { name: "Year" });
    expect(years).toContainElement(
      screen.getByRole("button", { name: "2026", pressed: true }),
    );
    await user.click(screen.getByRole("button", { name: "1990" }));
    await user.click(screen.getByRole("button", { name: "March" }));

    expect(
      screen.getByRole("grid", { name: "March 1990" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Thu, 15 Mar 1990" }));
    expect(onChange).toHaveBeenCalledWith("1990-03-15");
  });

  it("offers only the months and years within min and max", async () => {
    const user = userEvent.setup();
    render(<Harness min="2026-11-10" max="2027-02-01" />);
    await user.click(
      screen.getByRole("button", { name: /choose month and year/ }),
    );
    expect(
      screen
        .getAllByRole("button")
        .filter((button) => /^\d{4}$/.test(button.textContent ?? ""))
        .map((button) => button.textContent),
    ).toEqual(["2026", "2027"]);
    expect(screen.getByRole("button", { name: "October" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "December" })).toBeEnabled();
  });

  it("chooses today, and offers Clear only when given", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { unmount } = render(
      <Harness value="2026-11-16" onChange={onChange} />,
    );
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Today" }));
    expect(onChange).toHaveBeenCalledWith("2026-11-27");
    unmount();

    const onClear = vi.fn();
    render(<Harness value="2026-11-16" onClear={onClear} />);
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(onClear).toHaveBeenCalled();
  });
});
