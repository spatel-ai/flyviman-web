import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NavLinks, type NavItem } from "./nav-links";

let pathname = "/admin/locations";
let unread = 0;
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/lib/api/notifications", () => ({
  useUnreadCount: () => unread,
  unreadLabel: (label: string, count: number) =>
    count > 0 ? `${label}, ${count} unread` : label,
}));

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  {
    href: "/admin/operators",
    label: "Operators",
    group: "Operators and fleet",
  },
  {
    href: "/admin/locations",
    label: "Locations",
    group: "Operators and fleet",
  },
  { href: "/admin/payments", label: "Payments", group: "Finance" },
  { href: "/admin/settlements", label: "Settlements", group: "Finance" },
  { href: "/admin/notifications", label: "Notifications", group: "Platform" },
];

beforeEach(() => {
  sessionStorage.clear();
  pathname = "/admin/locations";
  unread = 0;
});

const category = (name: string | RegExp) =>
  screen.getByRole("button", { name });

describe("NavLinks categories", () => {
  it("opens the current page's category on the first render and no other", () => {
    render(<NavLinks items={ITEMS} />);
    expect(category("Operators and fleet")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(category("Finance")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("link", { name: "Locations" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // Closed links are not in the accessibility tree or tab order.
    expect(screen.queryByRole("link", { name: "Payments" })).toBeNull();
  });

  it("links the button to its list", () => {
    render(<NavLinks items={ITEMS} />);
    const button = category("Operators and fleet");
    const list = document.getElementById(
      button.getAttribute("aria-controls") ?? "",
    );
    expect(list).toContainElement(
      screen.getByRole("link", { name: "Locations" }),
    );
  });

  it("opens another category and keeps the first open; each closes on its own", () => {
    render(<NavLinks items={ITEMS} />);
    fireEvent.click(category(/^Finance/));
    expect(category(/^Finance/)).toHaveAttribute("aria-expanded", "true");
    expect(category(/^Operators and fleet/)).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("link", { name: "Payments" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Locations" })).toBeInTheDocument();
    fireEvent.click(category(/^Finance/));
    expect(category(/^Finance/)).toHaveAttribute("aria-expanded", "false");
    expect(category(/^Operators and fleet/)).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("applies stored open categories after mount and remembers changes", () => {
    sessionStorage.setItem(
      "flyviman:nav-open:admin",
      JSON.stringify(["Finance", "Nonsense"]),
    );
    render(<NavLinks items={ITEMS} />);
    expect(category(/^Finance/)).toHaveAttribute("aria-expanded", "true");
    expect(category(/^Operators and fleet/)).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(category(/^Platform/)).toHaveAttribute("aria-expanded", "false");
  });

  it("writes the open categories to the session", async () => {
    render(<NavLinks items={ITEMS} />);
    await waitFor(() =>
      expect(document.querySelector("[data-nav-ready=true]")).not.toBeNull(),
    );
    fireEvent.click(category(/^Finance/));
    await waitFor(() =>
      expect(
        JSON.parse(sessionStorage.getItem("flyviman:nav-open:admin") ?? "[]"),
      ).toEqual(["Operators and fleet", "Finance"]),
    );
  });

  it("marks a closed category that holds the current page, for sight and assistive tech", () => {
    render(<NavLinks items={ITEMS} />);
    expect(screen.queryByTestId("nav-current-dot")).toBeNull();
    fireEvent.click(category("Operators and fleet"));
    expect(screen.getByTestId("nav-current-dot")).toBeInTheDocument();
    expect(
      category("Operators and fleet, contains current page"),
    ).toBeInTheDocument();
  });

  it("shows the unread count on a closed Platform row and in its name", () => {
    unread = 4;
    render(<NavLinks items={ITEMS} />);
    expect(category("Platform, 4 unread")).toHaveTextContent("4");
    fireEvent.click(category("Platform, 4 unread"));
    expect(
      screen.getByRole("link", { name: "Notifications, 4 unread" }),
    ).toBeInTheDocument();
    expect(category("Platform")).not.toHaveTextContent("4");
  });

  it("opens the new page's category on navigation and leaves the others as they were", () => {
    const { rerender } = render(<NavLinks items={ITEMS} />);
    fireEvent.click(category(/^Platform/));
    pathname = "/admin/settlements";
    rerender(<NavLinks items={ITEMS} />);
    expect(category(/^Finance/)).toHaveAttribute("aria-expanded", "true");
    expect(category(/^Operators and fleet/)).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(category(/^Platform/)).toHaveAttribute("aria-expanded", "true");
  });

  it("gives a role with one category the flat list, with no buttons", () => {
    render(
      <NavLinks
        items={[
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/payments", label: "Payments", group: "Finance" },
        ]}
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("link", { name: "Payments" })).toBeInTheDocument();
  });

  it("opens nothing on a page the role cannot see", () => {
    pathname = "/admin/audit-logs";
    render(<NavLinks items={ITEMS} />);
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAttribute("aria-expanded", "false");
    }
    expect(screen.queryByTestId("nav-current-dot")).toBeNull();
    expect(document.querySelector("[aria-current]")).toBeNull();
  });
});
