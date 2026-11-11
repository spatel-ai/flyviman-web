import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("shows the title, description and action", () => {
    render(
      <EmptyState
        title="No aircraft yet"
        description="Add your first aircraft to start receiving requests."
        action={<button type="button">Add aircraft</button>}
      />,
    );

    expect(screen.getByText("No aircraft yet")).toBeInTheDocument();
    expect(
      screen.getByText("Add your first aircraft to start receiving requests."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add aircraft" }),
    ).toBeInTheDocument();
  });

  it("renders with a title alone", () => {
    render(<EmptyState title="Nothing to review" />);

    expect(screen.getByText("Nothing to review")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
