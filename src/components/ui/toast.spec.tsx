import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast, type ToastOptions } from "./toast";

function Trigger({ options }: { options: ToastOptions }) {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast(options)}>
      Save
    </button>
  );
}

describe("Toast", () => {
  it("shows the title and description of a toast", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger
          options={{
            title: "Operator approved",
            description: "Their aircraft can now be listed.",
            tone: "success",
          }}
        />
      </ToastProvider>,
    );

    expect(screen.queryByText("Operator approved")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Operator approved")).toHaveClass("text-success");
    expect(
      screen.getByText("Their aircraft can now be listed."),
    ).toBeInTheDocument();
  });

  it("uses the neutral tone by default and stacks repeated toasts", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger options={{ title: "Changes saved" }} />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    const titles = screen.getAllByText("Changes saved");
    expect(titles).toHaveLength(2);
    expect(titles[0]).toHaveClass("text-foreground");
  });

  it("can be dismissed", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger options={{ title: "Could not save", tone: "danger" }} />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Could not save")).toHaveClass("text-danger");

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Could not save")).not.toBeInTheDocument();
  });

  it("fails clearly when used outside the provider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(<Trigger options={{ title: "Changes saved" }} />),
    ).toThrow("useToast must be used inside a ToastProvider");

    consoleError.mockRestore();
  });
});
