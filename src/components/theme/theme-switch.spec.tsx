import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY } from "./theme-script";
import { ThemeSwitch } from "./theme-switch";

describe("ThemeSwitch", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("follows the system until a theme is chosen", () => {
    render(<ThemeSwitch />);
    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("forces and remembers the chosen theme", async () => {
    render(<ThemeSwitch />);
    await userEvent.click(screen.getByRole("radio", { name: "Dark" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "System" })).not.toBeChecked();
  });

  it("goes back to following the system", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    document.documentElement.dataset.theme = "light";
    render(<ThemeSwitch />);
    expect(screen.getByRole("radio", { name: "Light" })).toBeChecked();

    await userEvent.click(screen.getByRole("radio", { name: "System" }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});
