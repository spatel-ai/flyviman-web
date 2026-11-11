import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "./sheet";

function Example({
  side,
  hideTitle,
}: {
  side?: "left" | "right";
  hideTitle?: boolean;
}) {
  return (
    <Sheet>
      <SheetTrigger>Menu</SheetTrigger>
      <SheetContent title="Navigation" side={side} hideTitle={hideTitle}>
        <nav aria-label="Main">
          <SheetClose asChild>
            <a href="#trips">Trips</a>
          </SheetClose>
          <a href="#account">Account</a>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

describe("Sheet", () => {
  it("opens from the keyboard as a named dialog with focus inside", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.tab();
    await user.keyboard("{Enter}");

    const sheet = screen.getByRole("dialog", { name: "Navigation" });
    expect(sheet).toContainElement(document.activeElement as HTMLElement);

    for (let i = 0; i < 5; i += 1) {
      await user.tab();
      expect(sheet).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);

    const trigger = screen.getByRole("button", { name: "Menu" });
    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes when a SheetClose link is chosen", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(screen.getByRole("link", { name: "Trips" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("sits at the bottom on mobile and on the right from md by default", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: "Menu" }));

    const sheet = screen.getByRole("dialog");
    expect(sheet).toHaveClass("bottom-0", "rounded-t-xl", "md:right-0");
    expect(sheet).toHaveAttribute("data-side", "right");
  });

  it("can sit on the left from md", async () => {
    const user = userEvent.setup();
    render(<Example side="left" />);

    await user.click(screen.getByRole("button", { name: "Menu" }));

    const sheet = screen.getByRole("dialog");
    expect(sheet).toHaveClass("md:left-0");
    expect(sheet).not.toHaveClass("md:right-0");
  });

  it("keeps a hidden title as the accessible name", async () => {
    const user = userEvent.setup();
    render(<Example hideTitle />);

    await user.click(screen.getByRole("button", { name: "Menu" }));

    expect(
      screen.getByRole("dialog", { name: "Navigation" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Navigation").parentElement).toHaveClass("sr-only");
  });
});
