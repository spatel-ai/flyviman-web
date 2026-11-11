import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import {
  ConfirmDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  type ConfirmDialogProps,
} from "./dialog";

function Example({ description }: { description?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Edit details</Button>
      </DialogTrigger>
      <DialogContent title="Edit operator details" description={description}>
        <input aria-label="Trading name" />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("opens from the keyboard, named and described", async () => {
    const user = userEvent.setup();
    render(<Example description="Changes are reviewed before they go live." />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.tab();
    await user.keyboard("{Enter}");

    const dialog = screen.getByRole("dialog", {
      name: "Edit operator details",
    });
    expect(dialog).toHaveAccessibleDescription(
      "Changes are reviewed before they go live.",
    );
    expect(dialog).toHaveClass("shadow-lg");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("keeps focus inside while open", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: "Edit details" }));
    const dialog = screen.getByRole("dialog");

    for (let i = 0; i < 6; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);

    const trigger = screen.getByRole("button", { name: "Edit details" });
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes from DialogClose and from the close button", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Edit details" });

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

function ConfirmExample(
  props: Partial<ConfirmDialogProps> & Pick<ConfirmDialogProps, "onConfirm">,
) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Suspend</Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Suspend this operator?"
        description="Their aircraft are hidden from search straight away."
        confirmLabel="Suspend operator"
        {...props}
      />
    </>
  );
}

describe("ConfirmDialog", () => {
  it("confirms without a reason when none is required", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmExample onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Suspend" }));

    expect(
      screen.getByRole("dialog", { name: "Suspend this operator?" }),
    ).toHaveAccessibleDescription(
      "Their aircraft are hidden from search straight away.",
    );
    expect(screen.queryByLabelText("Reason")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Suspend operator" }));
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it("keeps confirm disabled until a reason is given", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmExample onConfirm={onConfirm} requireReason destructive />);

    await user.click(screen.getByRole("button", { name: "Suspend" }));
    const confirm = screen.getByRole("button", { name: "Suspend operator" });
    const reason = screen.getByLabelText("Reason");

    expect(reason).toBeRequired();
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveClass("bg-danger");

    await user.type(reason, "   ");
    expect(confirm).toBeDisabled();

    await user.type(reason, "Insurance expired ");
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith("Insurance expired");
  });

  it("does not confirm from the keyboard while the reason is empty", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmExample onConfirm={onConfirm} requireReason />);

    await user.click(screen.getByRole("button", { name: "Suspend" }));
    screen.getByRole("button", { name: "Cancel" }).focus();
    await user.tab();
    await user.keyboard("{Enter}");

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("cancels without confirming and starts with an empty reason next time", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmExample onConfirm={onConfirm} requireReason />);

    await user.click(screen.getByRole("button", { name: "Suspend" }));
    await user.type(screen.getByLabelText("Reason"), "Wrong operator");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Suspend" }));
    expect(screen.getByLabelText("Reason")).toHaveValue("");
  });

  it("blocks a repeat confirmation while loading", async () => {
    const user = userEvent.setup();
    render(<ConfirmExample onConfirm={() => {}} loading />);

    await user.click(screen.getByRole("button", { name: "Suspend" }));

    const confirm = screen.getByRole("button", { name: "Suspend operator" });
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAttribute("aria-busy", "true");
  });
});
