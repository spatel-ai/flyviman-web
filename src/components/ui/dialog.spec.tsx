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

  it("cancels without confirming or asking to discard, and starts with an empty reason next time", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmExample onConfirm={onConfirm} requireReason />);

    await user.click(screen.getByRole("button", { name: "Suspend" }));
    await user.type(screen.getByLabelText("Reason"), "Wrong operator");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Discard changes?")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Suspend" }));
    expect(screen.getByLabelText("Reason")).toHaveValue("");
  });

  it("closes on Escape with a reason typed, without asking to discard", async () => {
    const user = userEvent.setup();
    render(<ConfirmExample onConfirm={vi.fn()} requireReason />);

    await user.click(screen.getByRole("button", { name: "Suspend" }));
    await user.type(screen.getByLabelText("Reason"), "Wrong operator");
    await user.keyboard("{Escape}");

    expect(screen.queryByText("Discard changes?")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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

function ControlledExample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open controlled</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Controlled">
          <input aria-label="Code" />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={() => setOpen(false)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

describe("Dialog opened from the caller's own state", () => {
  it("returns focus to the button that opened it after Escape", async () => {
    const user = userEvent.setup();
    render(<ControlledExample />);
    const opener = screen.getByRole("button", { name: "Open controlled" });

    await user.click(opener);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("returns focus after Cancel and after a save", async () => {
    const user = userEvent.setup();
    render(<ControlledExample />);
    const opener = screen.getByRole("button", { name: "Open controlled" });

    await user.click(opener);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(opener).toHaveFocus();

    await user.click(opener);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});

describe("Dialog with unsaved changes", () => {
  it("closes at once when nothing was entered", async () => {
    const user = userEvent.setup();
    render(<ControlledExample />);
    await user.click(screen.getByRole("button", { name: "Open controlled" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks before closing on Escape and Cancel, and keeps the entry", async () => {
    const user = userEvent.setup();
    render(<ControlledExample />);
    await user.click(screen.getByRole("button", { name: "Open controlled" }));
    await user.type(screen.getByLabelText("Code"), "SUMMER");

    await user.keyboard("{Escape}");
    expect(screen.getByText("Discard changes?")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.queryByText("Discard changes?")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Code")).toHaveValue("SUMMER");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Discard changes?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes without asking when the caller closes it after a save", async () => {
    const user = userEvent.setup();
    render(<ControlledExample />);
    await user.click(screen.getByRole("button", { name: "Open controlled" }));
    await user.type(screen.getByLabelText("Code"), "SUMMER");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Discard changes?")).not.toBeInTheDocument();
  });
});
