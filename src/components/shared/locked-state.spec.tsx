import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenState, LockedState, NotApprovedState } from "./locked-state";

let pathname = "/admin/users";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

beforeEach(() => {
  pathname = "/admin/users";
});

describe("LockedState", () => {
  it("shows the cause and one next step, and no retry", () => {
    render(
      <LockedState
        title="Team"
        heading="Managed by your administrator"
        reason="Ask them."
        next={{ href: "/operator", label: "Back to dashboard" }}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Team" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Managed by your administrator" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to dashboard" }),
    ).toHaveAttribute("href", "/operator");
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("leaves out the title where the page already has one", () => {
    render(<ForbiddenState />);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });
});

describe("ForbiddenState", () => {
  it("points an admin user to the admin dashboard", () => {
    render(<ForbiddenState />);
    expect(
      screen.getByRole("link", { name: "Back to dashboard" }),
    ).toHaveAttribute("href", "/admin");
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("points operator staff to their administrator and dashboard", () => {
    pathname = "/operator/empty-legs";
    render(<ForbiddenState />);
    expect(screen.getByText(/Ask your administrator/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to dashboard" }),
    ).toHaveAttribute("href", "/operator");
  });
});

describe("NotApprovedState", () => {
  it("sends an unapproved operator to Company and documents", () => {
    render(<NotApprovedState title="Add an aircraft" />);
    expect(
      screen.getByRole("heading", { name: "Available once you are approved" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Company and documents" }),
    ).toHaveAttribute("href", "/operator/onboarding");
  });
});
