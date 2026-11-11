import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClientRedirect } from "./client-redirect";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

describe("ClientRedirect", () => {
  it("replaces the current page on the client, without a reload", () => {
    render(<ClientRedirect href="/operator/onboarding" label="Continue" />);
    expect(replace).toHaveBeenCalledWith("/operator/onboarding");
  });

  it("offers a link for visitors without JavaScript", () => {
    render(<ClientRedirect href="/operator/onboarding" label="Continue" />);
    expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute(
      "href",
      "/operator/onboarding",
    );
  });
});
