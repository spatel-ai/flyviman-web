import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { Dialog, DialogContent } from "./dialog";
import { Input } from "./input";

function stubScreen(desktop: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: desktop,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => stubScreen(true));
afterEach(() => vi.unstubAllGlobals());

async function pick(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  day: string,
) {
  await user.click(screen.getByRole("button", { name: label }));
  await user.click(await screen.findByRole("button", { name: day }));
}

describe("DateField through Input type=date", () => {
  it("is a labelled button showing the day, with the value as its description", () => {
    render(
      <Input
        label="Date of birth"
        type="date"
        defaultValue="1990-03-15"
        hint="As on your passport."
      />,
    );
    const field = screen.getByRole("button", { name: "Date of birth" });
    expect(field).toHaveAccessibleDescription(
      "15 Mar 1990 As on your passport.",
    );
    // The value lives in a hidden native input, out of the tab order.
    const input = document.querySelector("input")!;
    expect(input).toHaveAttribute("type", "date");
    expect(input).toHaveAttribute("tabindex", "-1");
    expect(input).toHaveValue("1990-03-15");
  });

  it("says Choose date when empty", () => {
    render(<Input label="From" type="date" />);
    expect(
      screen.getByRole("button", { name: "From" }),
    ).toHaveAccessibleDescription("Choose date");
  });

  it("works with React Hook Form: defaults, a choice, reset and setValue", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    let form: ReturnType<typeof useForm<{ day: string }>> | undefined;
    function Form() {
      const methods = useForm<{ day: string }>({
        defaultValues: { day: "2026-11-16" },
      });
      form = methods;
      return (
        <form onSubmit={methods.handleSubmit((values) => onSubmit(values))}>
          <Input label="Day" type="date" {...methods.register("day")} />
          <Button type="submit">Save</Button>
        </form>
      );
    }
    render(<Form />);
    const field = screen.getByRole("button", { name: "Day" });
    await waitFor(() => expect(field).toHaveTextContent("16 Nov 2026"));

    await pick(user, "Day", "Wed, 18 Nov 2026");
    expect(field).toHaveTextContent("18 Nov 2026");
    // Choosing closes the picker and gives focus back to the field.
    await waitFor(() => expect(field).toHaveFocus());
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenLastCalledWith({ day: "2026-11-18" });

    act(() => form!.setValue("day", "2026-12-01"));
    expect(field).toHaveTextContent("1 Dec 2026");
    act(() => form!.reset({ day: "2027-01-05" }));
    await waitFor(() => expect(field).toHaveTextContent("5 Jan 2027"));
    // A reset to the defaults goes through the form's own reset.
    await pick(user, "Day", "Fri, 8 Jan 2027");
    expect(field).toHaveTextContent("8 Jan 2027");
    act(() => form!.reset());
    await waitFor(() => expect(field).toHaveTextContent("5 Jan 2027"));
  });

  it("moves React Hook Form's focus on an error to the button", async () => {
    const user = userEvent.setup();
    function Form() {
      const { register, handleSubmit } = useForm<{ day: string }>();
      return (
        <form onSubmit={handleSubmit(() => {})}>
          <Input
            label="Day"
            type="date"
            {...register("day", { required: "Choose a day." })}
          />
          <Button type="submit">Save</Button>
        </form>
      );
    }
    render(<Form />);
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Day" })).toHaveFocus(),
    );
  });

  it("works controlled, with value and onChange", async () => {
    const user = userEvent.setup();
    const seen = vi.fn();
    function Controlled() {
      const [day, setDay] = useState("2026-11-16");
      return (
        <Input
          label="From"
          type="date"
          value={day}
          onChange={(event) => {
            seen(event.target.value);
            setDay(event.target.value);
          }}
          className="h-10"
        />
      );
    }
    render(<Controlled />);
    const field = screen.getByRole("button", { name: "From" });
    expect(field).toHaveClass("h-10");
    await pick(user, "From", "Fri, 20 Nov 2026");
    expect(seen).toHaveBeenCalledWith("2026-11-20");
    expect(field).toHaveTextContent("20 Nov 2026");

    await user.click(field);
    await user.click(await screen.findByRole("button", { name: "Clear" }));
    expect(seen).toHaveBeenLastCalledWith("");
    expect(field).toHaveTextContent("Choose date");
  });

  it("works uncontrolled through FormData, and follows a form reset", async () => {
    const user = userEvent.setup();
    const read = vi.fn();
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          read(new FormData(event.currentTarget).get("from"));
        }}
      >
        <Input label="From" name="from" type="date" defaultValue="2026-11-16" />
        <Button type="submit">Apply</Button>
        <Button type="reset">Reset</Button>
      </form>,
    );
    await pick(user, "From", "Tue, 3 Nov 2026");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(read).toHaveBeenCalledWith("2026-11-03");

    await user.click(screen.getByRole("button", { name: "Reset" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "From" })).toHaveTextContent(
        "16 Nov 2026",
      ),
    );
  });

  it("when required, offers no Clear and shows its own error instead of a browser bubble", async () => {
    const user = userEvent.setup();
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={submit}>
        <Input
          label="Expiry date"
          name="expiresAt"
          type="date"
          required
          min="2026-11-20"
        />
        <Button type="submit">Upload</Button>
      </form>,
    );
    const field = screen.getByRole("button", { name: "Expiry date" });
    // jsdom does not run the browser's form validation; ask the input.
    act(() => {
      document
        .querySelector<HTMLInputElement>("input[name=expiresAt]")!
        .reportValidity();
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Choose a date.",
    );
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveFocus();

    await user.click(field);
    expect(
      await screen.findByRole("button", { name: "Today" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    // Opens on the first day allowed, and the days before it are refused.
    expect(
      screen.getByRole("button", { name: "Thu, 19 Nov 2026" }),
    ).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("button", { name: "Fri, 20 Nov 2026" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(field).not.toHaveAttribute("aria-invalid");
  });

  it("is disabled with its input", () => {
    render(<Input label="Expiry" type="date" name="x" disabled />);
    expect(screen.getByRole("button", { name: "Expiry" })).toBeDisabled();
    expect(document.querySelector("input")).toBeDisabled();
  });

  describe("inside a Dialog", () => {
    function InDialog() {
      const [open, setOpen] = useState(true);
      return (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent title="Block time">
            <Input
              label="Start date"
              type="date"
              name="start"
              defaultValue="2026-11-16"
            />
          </DialogContent>
        </Dialog>
      );
    }

    for (const desktop of [true, false]) {
      it(`Escape closes only the picker (${desktop ? "popover" : "sheet"})`, async () => {
        stubScreen(desktop);
        const user = userEvent.setup();
        render(<InDialog />);
        await user.click(screen.getByRole("button", { name: "Start date" }));
        const picker = await screen.findByRole("dialog", {
          name: "Start date",
        });
        expect(picker).toContainElement(document.activeElement as HTMLElement);
        await user.keyboard("{Escape}");
        await waitFor(() =>
          expect(
            screen.queryByRole("dialog", { name: "Start date" }),
          ).toBeNull(),
        );
        expect(
          screen.getByRole("dialog", { name: "Block time" }),
        ).toBeInTheDocument();
        await waitFor(() =>
          expect(
            screen.getByRole("button", { name: "Start date" }),
          ).toHaveFocus(),
        );
      });
    }

    it("changing month or opening the chooser leaves it clean; a choice marks it dirty", async () => {
      const user = userEvent.setup();
      render(<InDialog />);
      await user.click(screen.getByRole("button", { name: "Start date" }));
      await user.click(
        await screen.findByRole("button", { name: "Next month" }),
      );
      await user.click(
        screen.getByRole("button", { name: /choose month and year/ }),
      );
      await user.click(screen.getByRole("button", { name: /show days/ }));
      await user.keyboard("{Escape}");
      await waitFor(() =>
        expect(screen.queryByRole("dialog", { name: "Start date" })).toBeNull(),
      );
      // Clean: Escape on the dialog closes it at once.
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    });

    it("asks before discarding a chosen date", async () => {
      const user = userEvent.setup();
      render(<InDialog />);
      await pick(user, "Start date", "Wed, 18 Nov 2026");
      await waitFor(() =>
        expect(screen.queryByRole("dialog", { name: "Start date" })).toBeNull(),
      );
      await user.keyboard("{Escape}");
      expect(await screen.findByText("Discard changes?")).toBeInTheDocument();
    });

    it("an outside click closes only the picker", async () => {
      // The open picker is modal, so the dialog behind takes no pointer.
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(<InDialog />);
      await user.click(screen.getByRole("button", { name: "Start date" }));
      await screen.findByRole("dialog", { name: "Start date" });
      await user.click(screen.getByText("Block time"));
      await waitFor(() =>
        expect(screen.queryByRole("dialog", { name: "Start date" })).toBeNull(),
      );
      expect(
        screen.getByRole("dialog", { name: "Block time" }),
      ).toBeInTheDocument();
    });
  });
});
