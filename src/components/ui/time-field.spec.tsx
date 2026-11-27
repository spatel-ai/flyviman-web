import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { Dialog, DialogContent } from "./dialog";
import { Input } from "./input";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("TimeField through Input type=time", () => {
  it("offers hours and five-minute steps, and sets HH:mm as they are chosen", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    function Form() {
      const { register, handleSubmit } = useForm<{ at: string }>();
      return (
        <form onSubmit={handleSubmit((values) => onSubmit(values))}>
          <Input label="Start time" type="time" {...register("at")} />
          <Button type="submit">Save</Button>
        </form>
      );
    }
    render(<Form />);
    const field = screen.getByRole("button", { name: "Start time" });
    expect(field).toHaveAccessibleDescription("Choose time");
    await user.click(field);

    const hours = await screen.findByRole("listbox", { name: "Hours" });
    const minutes = screen.getByRole("listbox", { name: "Minutes" });
    expect(within(hours).getAllByRole("option")).toHaveLength(24);
    expect(
      within(minutes)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([
      "00",
      "05",
      "10",
      "15",
      "20",
      "25",
      "30",
      "35",
      "40",
      "45",
      "50",
      "55",
    ]);
    // Focus starts on the hours.
    expect(within(hours).getByRole("option", { name: "00" })).toHaveFocus();

    await user.click(within(hours).getByRole("option", { name: "09" }));
    expect(field).toHaveTextContent("09:00");
    await user.click(within(minutes).getByRole("option", { name: "35" }));
    expect(field).toHaveTextContent("09:35");
    expect(within(minutes).getByRole("option", { name: "35" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(field).toHaveFocus());
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledWith({ at: "09:35" });
  });

  it("keeps a time off the step and offers it as a minute", async () => {
    const user = userEvent.setup();
    render(
      <Input label="Lapses at" type="time" name="t" defaultValue="07:07" />,
    );
    const field = screen.getByRole("button", { name: "Lapses at" });
    expect(field).toHaveTextContent("07:07");
    await user.click(field);
    const minutes = await screen.findByRole("listbox", { name: "Minutes" });
    const options = within(minutes)
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(options.slice(0, 3)).toEqual(["00", "05", "07"]);
    expect(within(minutes).getByRole("option", { name: "07" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // Changing the hour keeps the minute.
    await user.click(
      within(screen.getByRole("listbox", { name: "Hours" })).getByRole(
        "option",
        {
          name: "08",
        },
      ),
    );
    expect(field).toHaveTextContent("08:07");
  });

  it("moves through a column with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<Input label="At" type="time" name="t" defaultValue="10:00" />);
    // The open picker hides the page from assistive technology: hold on to it.
    const field = screen.getByRole("button", { name: "At" });
    await user.click(field);
    const hours = await screen.findByRole("listbox", { name: "Hours" });
    expect(within(hours).getByRole("option", { name: "10" })).toHaveFocus();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(within(hours).getByRole("option", { name: "12" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(field).toHaveTextContent("12:00");
    await user.keyboard("{End}");
    expect(within(hours).getByRole("option", { name: "23" })).toHaveFocus();
  });

  it("works controlled, clears when optional, and offers no Clear when required", async () => {
    const user = userEvent.setup();
    const seen = vi.fn();
    function Controlled() {
      const [time, setTime] = useState("14:30");
      return (
        <Input
          label="Time"
          type="time"
          value={time}
          onChange={(event) => {
            seen(event.target.value);
            setTime(event.target.value);
          }}
        />
      );
    }
    const { unmount } = render(<Controlled />);
    await user.click(screen.getByRole("button", { name: "Time" }));
    await user.click(await screen.findByRole("button", { name: "Clear" }));
    expect(seen).toHaveBeenLastCalledWith("");
    expect(screen.getByRole("button", { name: "Time" })).toHaveTextContent(
      "Choose time",
    );
    unmount();

    render(
      <form>
        <Input label="Required time" type="time" name="r" required />
      </form>,
    );
    act(() => {
      document
        .querySelector<HTMLInputElement>("input[name=r]")!
        .reportValidity();
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Choose a time.",
    );
    await user.click(screen.getByRole("button", { name: "Required time" }));
    expect(
      await screen.findByRole("button", { name: "Done" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });

  it("inside a Dialog, Escape closes only the picker and scrolling leaves it clean", async () => {
    const user = userEvent.setup();
    render(
      <Dialog defaultOpen>
        <DialogContent title="Block time">
          <Input label="End time" type="time" name="end" defaultValue="18:00" />
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByRole("button", { name: "End time" }));
    const hours = await screen.findByRole("listbox", { name: "Hours" });
    hours.dispatchEvent(new Event("scroll"));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(
      screen.getByRole("dialog", { name: "Block time" }),
    ).toBeInTheDocument();
    // Nothing was chosen, so the dialog closes without asking.
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
