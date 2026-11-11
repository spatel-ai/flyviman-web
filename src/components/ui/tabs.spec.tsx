import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

function renderTabs(onValueChange?: (value: string) => void) {
  render(
    <Tabs defaultValue="details" onValueChange={onValueChange}>
      <TabsList aria-label="Operator">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="aircraft">Aircraft</TabsTrigger>
      </TabsList>
      <TabsContent value="details">Details panel</TabsContent>
      <TabsContent value="documents">Documents panel</TabsContent>
      <TabsContent value="aircraft">Aircraft panel</TabsContent>
    </Tabs>,
  );
}

describe("Tabs", () => {
  it("shows the default tab's panel and marks it selected", () => {
    renderTabs();

    const details = screen.getByRole("tab", { name: "Details" });
    expect(details).toHaveAttribute("aria-selected", "true");
    expect(details).toHaveClass("aria-selected:border-accent");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Details panel");
    expect(screen.queryByText("Documents panel")).not.toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).not.toHaveClass("starting:opacity-0");
  });

  it("fades an incoming panel only when asked", () => {
    render(
      <Tabs defaultValue="email">
        <TabsList aria-label="How to sign in">
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>
        <TabsContent value="email" animate>
          Email panel
        </TabsContent>
      </Tabs>,
    );

    expect(screen.getByRole("tabpanel")).toHaveClass(
      "starting:translate-y-2",
      "starting:opacity-0",
    );
  });

  it("changes tab on click", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderTabs(onValueChange);

    await user.click(screen.getByRole("tab", { name: "Documents" }));

    expect(onValueChange).toHaveBeenCalledWith("documents");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Documents panel");
  });

  it("moves between tabs with the arrow keys", async () => {
    const user = userEvent.setup();
    renderTabs();

    await user.tab();
    expect(screen.getByRole("tab", { name: "Details" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    const documents = screen.getByRole("tab", { name: "Documents" });
    expect(documents).toHaveFocus();
    expect(documents).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Documents panel");

    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    const aircraft = screen.getByRole("tab", { name: "Aircraft" });
    expect(aircraft).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Aircraft panel");
  });
});
