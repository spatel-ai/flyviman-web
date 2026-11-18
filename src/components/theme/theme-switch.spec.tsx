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

  it("offers Light and Dark only, with Light chosen by default", () => {
    render(<ThemeSwitch />);
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "Light" })).toBeChecked();
    expect(screen.queryByRole("radio", { name: "System" })).toBeNull();
  });

  it("reads an old stored system choice as light", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "system");
    render(<ThemeSwitch />);
    expect(screen.getByRole("radio", { name: "Light" })).toBeChecked();
  });

  it("forces and remembers the chosen theme", async () => {
    render(<ThemeSwitch />);
    await userEvent.click(screen.getByRole("radio", { name: "Dark" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Light" })).not.toBeChecked();
  });

  it("stores light when Light is chosen", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    render(<ThemeSwitch />);
    await userEvent.click(screen.getByRole("radio", { name: "Light" }));

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
});
